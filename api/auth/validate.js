/* =========================================================
   /api/auth/validate.js

   Server-side Pi authentication validation.

   Browser
      ↓
   Pi access token
      ↓
   /api/auth/validate
      ↓
   Pi Network /v2/me
      ↓
   Verified UID + username
========================================================= */


/* =========================================================
   API HANDLER
========================================================= */

export default async function handler(req, res) {

    /* =====================================================
       OPTIONS
    ===================================================== */

    /*
     * The app is served from the same Vercel deployment,
     * so CORS is not required.
     *
     * OPTIONS support is retained for completeness.
     */

    if (req.method === 'OPTIONS') {

        return res.status(204).end();

    }


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
            accessToken
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
                error:
                    'Missing Pi access token'
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
                error:
                    'Invalid Pi access token'
            });

        }


        /* =================================================
           VERIFY TOKEN WITH PI NETWORK
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
                'Pi authentication validation failed:',
                {
                    status:
                        piResponse.status
                }
            );

            return res.status(401).json({
                success: false,
                error:
                    'Invalid or expired Pi access token'
            });

        }


        /* =================================================
           EXTRACT VERIFIED PI IDENTITY
        ================================================= */

        /*
         * IMPORTANT:
         *
         * These values are obtained from Pi Network.
         *
         * We DO NOT accept uid or username from the
         * browser request.
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
           RETURN VERIFIED IDENTITY
        ================================================= */

        return res.status(200).json({
            success: true,

            user: {
                uid,
                username
            }
        });


    } catch (error) {

        /* =================================================
           SERVER ERROR
        ================================================= */

        /*
         * Log the detailed error server-side only.
         * Never send internal details to the browser.
         */

        console.error(
            'Pi authentication validation error:',
            error
        );

        return res.status(500).json({
            success: false,
            error:
                'Unable to validate Pi authentication'
        });

    }

}
