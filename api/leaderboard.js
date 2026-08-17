import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);


/* =========================================================
   MASK USERNAME
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
       ONLY GET IS ALLOWED
    ===================================================== */

    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }


    try {

        /* =================================================
           GET HIGHEST SCORE FOR EACH VERIFIED PI USER

           DISTINCT ON (uid) ensures that each Pi user
           appears only once.

           Highest score wins.

           If scores are equal, the oldest score wins.
        ================================================= */

        const rows = await sql`
            SELECT DISTINCT ON (uid)
                uid,
                username,
                score,
                created_at
            FROM scores
            ORDER BY
                uid,
                score DESC,
                created_at ASC
        `;


        /* =================================================
           SORT PLAYERS BY HIGHEST SCORE
        ================================================= */

        rows.sort(
            (a, b) => {

                const scoreDifference =
                    Number(b.score) -
                    Number(a.score);

                if (scoreDifference !== 0) {
                    return scoreDifference;
                }

                return (
                    new Date(a.created_at) -
                    new Date(b.created_at)
                );
            }
        );


        /* =================================================
           TOP 10 ONLY

           IMPORTANT:
           UID IS NEVER SENT TO THE BROWSER.

           REAL USERNAME IS ALSO NEVER SENT.
        ================================================= */

        const leaderboard =
            rows
                .slice(0, 10)
                .map((player) => ({
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


        /* =================================================
           RESPONSE
        ================================================= */

        return res.status(200).json({
            success: true,
            leaderboard
        });


    } catch (error) {

        console.error(
            'Leaderboard error:',
            error
        );

        return res.status(500).json({
            success: false,
            error:
                'Failed to load leaderboard'
        });
    }
}
