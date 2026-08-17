export default async function handler(req, res) {
  // This endpoint is called from the same Vercel-hosted app, so CORS is not
  // required. Keep OPTIONS support for completeness.
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { accessToken } = req.body || {};

    if (!accessToken || typeof accessToken !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Missing Pi access token'
      });
      return;
    }

    // Validate the token with Pi Network before establishing the app session.
    // No Pi API key is required for this /v2/me authentication flow.
    const piResponse = await fetch('https://api.minepi.com/v2/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    if (!piResponse.ok) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired Pi access token'
      });
      return;
    }

    const piUser = await piResponse.json();

    if (!piUser?.uid) {
      res.status(401).json({
        success: false,
        error: 'Pi Network did not return a valid user'
      });
      return;
    }

    // The Pi identity returned by /v2/me is the authenticated identity
    // for this app. Add a database/session store here if persistent sessions
    // are introduced later.
    res.status(200).json({
      success: true,
      user: {
        uid: piUser.uid,
        username: piUser.username
      }
    });
  } catch (error) {
    console.error('Pi authentication validation error:', error);

    res.status(500).json({
      success: false,
      error: 'Unable to validate Pi authentication'
    });
  }
}
