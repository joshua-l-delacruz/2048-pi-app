import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);


/* =========================================================
   CONFIGURATION
========================================================= */

/*
 * A generous sanity ceiling.
 *
 * This is NOT intended to determine whether every score
 * was legitimately achieved. It simply rejects obviously
 * abusive values that are far outside normal 2048 play.
 */
const MAX_REASONABLE_SCORE = 10_000_000;


/*
 * Minimum time between accepted submissions from the
 * same Pi UID.
 *
 * This helps prevent someone from repeatedly hammering
 * the endpoint with the same/different scores.
 *
 * The database is used as the source of truth, so this
 * protection also works across Vercel serverless instances.
 */
const MIN_SUBMISSION_INTERVAL_SECONDS = 10;


/* =========================================================
   API HANDLER
========================================================= */

export default async function handler(req, res) {

    /*
     * Only POST is allowed.
     */

    if (req.method !== 'POST') {

        return res.status(405).json({
            error: 'Method not allowed'
        });

    }


    try {

        /* =================================================
           READ REQUEST
        ================================================= */

        const {
            accessToken,
            score
        } = req.body || {};


        /* =================================================
           VALIDATE ACCESS TOKEN FORMAT
        ================================================= */

        if (
            typeof accessToken !== 'string' ||
            !accessToken.trim()
        ) {

            return res.status(400).json({
                error: 'Missing Pi access token'
            });

        }


        const cleanAccessToken =
            accessToken.trim();


        /*
         * Do not allow an unnecessarily large token to reach
         * the Pi API.
         */

        if (
            cleanAccessToken.length > 4096
        ) {

            return res.status(400).json({
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
                error: 'Invalid score'
            });

        }


        /*
         * Reject obviously impossible/abusive values.
         */

        if (
            score > MAX_REASONABLE_SCORE
        ) {

            return res.status(400).json({
                error: 'Score exceeds the allowed limit'
            });

        }


        /* =================================================
           VERIFY PI IDENTITY
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
                error:
                    'Invalid or expired Pi authentication'
            });

        }


        /*
         * IMPORTANT:
         *
         * These values are trusted because they came from
         * Pi Network's /v2/me response.
         *
         * We NEVER accept uid or username from the browser.
         */

        const uid =
            piUser.uid.trim();

        const username =
            typeof piUser.username === 'string'
                ? piUser.username.trim()
                : '';


        if (!username) {

            return res.status(401).json({
                error:
                    'Pi username could not be verified'
            });

        }


        /* =================================================
           DUPLICATE / RAPID SUBMISSION PROTECTION
        ================================================= */

        /*
         * Look at the most recent submission from this
         * verified Pi account.
         *
         * Because uid comes from Pi /v2/me, the client
         * cannot choose another player's identity.
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


            /*
             * Prevent rapid submissions.
             */

            if (
                Number.isFinite(
                    elapsedSeconds
                ) &&
                elapsedSeconds <
                    MIN_SUBMISSION_INTERVAL_SECONDS
            ) {

                return res.status(429).json({
                    error:
                        'Please wait before submitting another score'
                });

            }


            /*
             * Prevent the exact same score from being
             * repeatedly submitted.
             *
             * This is intentionally separate from the
             * time-based protection.
             */

            if (
                Number(previous.score) ===
                score
            ) {

                return res.status(409).json({
                    error:
                        'This score has already been submitted'
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

        console.error(
            'Score submission error:',
            error
        );


        return res.status(500).json({
            error:
                'Failed to save score'
        });

    }

}
