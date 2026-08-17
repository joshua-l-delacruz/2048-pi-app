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
            username,
            uid,
            score
        } = req.body || {};

        // Validate required fields
        if (
            typeof username !== 'string' ||
            !username.trim() ||
            typeof uid !== 'string' ||
            !uid.trim() ||
            typeof score !== 'number' ||
            !Number.isFinite(score) ||
            score < 0
        ) {
            return res.status(400).json({
                error: 'Invalid score data'
            });
        }

        // Only allow reasonable integer game scores
        if (!Number.isInteger(score)) {
            return res.status(400).json({
                error: 'Score must be an integer'
            });
        }

        await sql`
            INSERT INTO scores (
                username,
                uid,
                score
            )
            VALUES (
                ${username.trim()},
                ${uid.trim()},
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
