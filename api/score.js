import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed'
        });
    }

    try {
        const {
            accessToken,
            score
        } = req.body || {};

        // Validate access token
        if (
            typeof accessToken !== 'string' ||
            !accessToken.trim()
        ) {
            return res.status(400).json({
                error: 'Missing Pi access token'
            });
        }

        // Validate score
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
         * Validate the Pi access token with Pi Network.
         */
        const piResponse = await fetch(
            'https://api.minepi.com/v2/me',
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken.trim()}`
                }
            }
        );

        let piUser = null;

        try {
            piUser = await piResponse.json();
        } catch (_) {
            piUser = null;
        }

        if (!piResponse.ok || !piUser?.uid) {
            console.error(
                'Pi token validation failed:',
                piUser
            );

            return res.status(401).json({
                error: 'Invalid or expired Pi authentication'
            });
        }

        /*
         * Get the authenticated Pi user's identity
         * directly from Pi Network.
         */
        const uid = piUser.uid;
        const username = piUser.username;

        if (
            typeof username !== 'string' ||
            !username.trim()
        ) {
            return res.status(401).json({
                error: 'Pi username could not be verified'
            });
        }

        /*
         * Save the verified user and score to Neon.
         */
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

        return res.status(200).json({
            success: true,
            message: 'Score saved successfully'
        });

    } catch (error) {
        console.error(
            'Score submission error:',
            error
        );

        return res.status(500).json({
            error: 'Failed to save score'
        });
    }
}
