import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed'
        });
    }

    try {
        const { username, uid, score } = req.body;

        if (!username || !uid || typeof score !== 'number') {
            return res.status(400).json({
                error: 'Invalid score data'
            });
        }

        await sql`
            INSERT INTO scores (username, uid, score)
            VALUES (${username}, ${uid}, ${score})
        `;

        return res.status(200).json({
            success: true
        });

    } catch (error) {
        console.error('Score submission error:', error);

        return res.status(500).json({
            error: 'Failed to save score'
        });
    }
}
