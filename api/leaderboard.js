import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({
            error: 'Method not allowed'
        });
    }

    try {
        const limit = 10;

        const rows = await sql`
            SELECT
                username,
                score,
                created_at
            FROM scores
            ORDER BY score DESC, created_at ASC
            LIMIT ${limit}
        `;

        return res.status(200).json({
            success: true,
            leaderboard: rows
        });

    } catch (error) {
        console.error(
            'Leaderboard error:',
            error
        );

        return res.status(500).json({
            error: 'Failed to load leaderboard'
        });
    }
}
