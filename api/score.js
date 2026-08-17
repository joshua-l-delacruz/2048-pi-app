import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);


/* =========================================================
   MASK USERNAME
   =========================================================

   Example:

   joshuadelacruz
   ↓
   jos**********

   The real username remains private in Neon.
========================================================= */

function maskUsername(username) {

    if (
        typeof username !== 'string' ||
        !username.trim()
    ) {
        return '***';
    }

    const cleanUsername = username.trim();

    if (cleanUsername.length <= 3) {
        return (
            cleanUsername +
            '*'.repeat(
                Math.max(
                    1,
                    3 - cleanUsername.length
                )
            )
        );
    }

    return (
        cleanUsername.slice(0, 3) +
        '*'.repeat(
            cleanUsername.length - 3
        )
    );
}


/* =========================================================
   API HANDLER
========================================================= */

export default async function handler(req, res) {


    /* =====================================================
       GET — PRODUCTION LEADERBOARD
    ===================================================== */

    if (req.method === 'GET') {

        try {

            /*
             * Get the highest score for every Pi user.
             *
             * The UID identifies the player.
             *
             * We keep the real username on the server,
             * but it will be masked before being returned.
             */

            const leaderboard =
                await sql`
                    SELECT DISTINCT ON (uid)
                        username,
                        score,
                        created_at
                    FROM scores
                    ORDER BY
                        uid,
                        score DESC,
                        created_at ASC
                `;


            /*
             * Sort all players by highest score.
             */

            leaderboard.sort(
                (a, b) =>
                    Number(b.score) -
                    Number(a.score)
            );


            /*
             * Keep only Top 10.
             *
             * IMPORTANT:
             *
             * UID is NOT returned.
             * Real username is NOT returned.
             */

            const top10 =
                leaderboard
                    .slice(0, 10)
                    .map(player => ({
                        username:
                            maskUsername(
                                player.username
                            ),

                        score:
                            Number(
                                player.score
                            ),

                        created_at:
                            player.created_at
                    }));


            return res.status(200).json({
                success: true,
                leaderboard: top10
            });


        } catch (error) {

            console.error(
                'Leaderboard error:',
                error
            );

            return res.status(500).json({
                error:
                    'Failed to load leaderboard'
            });

        }

    }


    /* =====================================================
       POST — SAVE SCORE
    ===================================================== */

    if (req.method === 'POST') {

        try {

            const {
                accessToken,
                score
            } = req.body || {};


            /* =============================================
               VALIDATE ACCESS TOKEN
            ============================================= */

            if (
                typeof accessToken !== 'string' ||
                !accessToken.trim()
            ) {

                return res.status(400).json({
                    error:
                        'Missing Pi access token'
                });

            }


            /* =============================================
               VALIDATE SCORE
            ============================================= */

            if (
                typeof score !== 'number' ||
                !Number.isFinite(score) ||
                !Number.isInteger(score) ||
                score < 0
            ) {

                return res.status(400).json({
                    error:
                        'Invalid score'
                });

            }


            /* =============================================
               VALIDATE TOKEN WITH PI NETWORK
            ============================================= */

            const piResponse =
                await fetch(
                    'https://api.minepi.com/v2/me',
                    {
                        method: 'GET',

                        headers: {
                            Authorization:
                                `Bearer ${accessToken.trim()}`
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


            /* =============================================
               VERIFY PI USER
            ============================================= */

            if (
                !piResponse.ok ||
                !piUser?.uid
            ) {

                console.error(
                    'Pi token validation failed:',
                    piUser
                );

                return res.status(401).json({
                    error:
                        'Invalid or expired Pi authentication'
                });

            }


            /*
             * These values come directly from Pi Network.
             */

            const uid =
                piUser.uid;

            const username =
                piUser.username;


            /* =============================================
               VERIFY USERNAME
            ============================================= */

            if (
                typeof username !== 'string' ||
                !username.trim()
            ) {

                return res.status(401).json({
                    error:
                        'Pi username could not be verified'
                });

            }


            /* =============================================
               SAVE SCORE
            ============================================= */

            await sql`
                INSERT INTO scores (
                    username,
                    uid,
                    score
                )
                VALUES (
                    ${username.trim()},
                    ${uid},
                    ${score}
                )
            `;


            /* =============================================
               SUCCESS
            ============================================= */

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


    /* =====================================================
       OTHER METHODS
    ===================================================== */

    return res.status(405).json({
        error:
            'Method not allowed'
    });

}
