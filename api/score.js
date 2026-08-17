import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);


/* =========================================================
   CONFIGURATION
========================================================= */

/*
 * Generous sanity ceiling.
 *
 * This is NOT intended to prove that a score is legitimate.
 * It only rejects obviously abusive/impossible values.
 */
const MAX_REASONABLE_SCORE = 10_000_000;


/*
 * Minimum time between accepted submissions from the
 * same verified Pi UID.
 *
 * The database is used as the source of truth, so this
 * works across Vercel serverless instances.
 */
const MIN_SUBMISSION_INTERVAL_SECONDS = 10;


/* =========================================================
   API HANDLER
========================================================= */

export default async function handler(req, res) {

    /* =====================================================
       ONLY POST IS ALLOWED
    ===================================================== */

    if (req.method !== 'POST') {

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });

    }


    try {

        /* =================================================
           READ REQUEST BODY
        ================================================= */

        const {
            accessToken,
            score
        } = req.body || {};


        /* =================================================
           VALIDATE ACCESS TOKEN
        ================================================= */

        if (
            typeof accessToken !== 'string' ||
            !accessToken.trim()
        ) {

            return res.status(400).json({
                success: false,
                error: 'Missing Pi access token'
            });

        }


        const cleanAccessToken =
            accessToken.trim();


        /*
         * Prevent unnecessarily large values from being
         * sent to the Pi API.
         */

        if (
            cleanAccessToken.length > 4096
        ) {

            return res.status(400).json({
                success: false,
                error: 'Invalid Pi access token'
            });

        }


        /* =================================================
           VALIDATE SCORE
        ================================================= */

        if (
            typeof score !== 'number' ||
            !Number.isFinite(score) ||
            !Number.isInteger(score) ||
            score < 0
        ) {

            return res.status(400).json({
                success: false,
                error: 'Invalid score'
            });

        }


        /*
         * Reject obviously abusive values.
         */

        if (
            score > MAX_REASONABLE_SCORE
        ) {

            return res.status(400).json({
                success: false,
                error:
                    'Score exceeds the allowed limit'
            });

        }


        /* =================================================
           VERIFY PI IDENTITY SERVER-SIDE
        ================================================= */

        const piResponse =
            await fetch(
                'https://api.minepi.com/v2/me',
                {
                    method: 'GET',

                    headers: {
                        Authorization:
                            `Bearer ${cleanAccessToken}`,

                        Accept:
                            'application/json'
                    }
                }
            );


        /* =================================================
           READ PI RESPONSE
        ================================================= */

        let piUser = null;

        try {

            piUser =
                await piResponse.json();

        } catch (_) {

            piUser = null;

        }


        /* =================================================
           VERIFY PI RESPONSE
        ================================================= */

        if (
            !piResponse.ok ||
            !piUser ||
            typeof piUser.uid !== 'string' ||
            !piUser.uid.trim()
        ) {

            console.error(
                'Pi token validation failed:',
                {
                    status:
                        piResponse.status
                }
            );

            return res.status(401).json({
                success: false,
                error:
                    'Invalid or expired Pi authentication'
            });

        }


        /* =================================================
           GET VERIFIED PI IDENTITY
        ================================================= */

        /*
         * IMPORTANT:
         *
         * UID and username are NEVER accepted from the
         * browser.
         *
         * They come directly from Pi Network /v2/me.
         */

        const uid =
            piUser.uid.trim();

        const username =
            typeof piUser.username === 'string'
                ? piUser.username.trim()
                : '';


        /* =================================================
           VERIFY USERNAME
        ================================================= */

        if (!username) {

            return res.status(401).json({
                success: false,
                error:
                    'Pi username could not be verified'
            });

        }


        /* =================================================
           CHECK RECENT SUBMISSION
        ================================================= */

        /*
         * Find the most recent score belonging to this
         * verified Pi UID.
         */

        const recentSubmission =
            await sql`
                SELECT
                    id,
                    score,
                    created_at
                FROM scores
                WHERE uid = ${uid}
                ORDER BY created_at DESC
                LIMIT 1
            `;


        /* =================================================
           ENFORCE SUBMISSION COOLDOWN
        ================================================= */

        if (
            recentSubmission.length > 0
        ) {

            const previous =
                recentSubmission[0];

            const previousTime =
                new Date(
                    previous.created_at
                ).getTime();

            const now =
                Date.now();

            const elapsedSeconds =
                (
                    now -
                    previousTime
                ) / 1000;


            if (
                Number.isFinite(
                    elapsedSeconds
                ) &&
                elapsedSeconds <
                    MIN_SUBMISSION_INTERVAL_SECONDS
            ) {

                return res.status(429).json({
                    success: false,
                    error:
                        'Please wait before submitting another score'
                });

            }

        }


        /* =================================================
           SAVE VERIFIED SCORE
        ================================================= */

        await sql`
            INSERT INTO scores (
                uid,
                username,
                score
            )
            VALUES (
                ${uid},
                ${username},
                ${score}
            )
        `;


        /* =================================================
           SUCCESS
        ================================================= */

        return res.status(200).json({
            success: true,
            message:
                'Score saved successfully'
        });


    } catch (error) {

        /*
         * Do not expose internal database or server
         * details to the browser.
         */

        console.error(
            'Score submission error:',
            error
        );

        return res.status(500).json({
            success: false,
            error:
                'Failed to save score'
        });

    }

}
