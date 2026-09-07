const { OAuth2Client } = require('google-auth-library');

const verifyGoogleToken = async (idToken) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const fallbackClientIds = [clientId, process.env.GOOGLE_ANDROID_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID].filter(Boolean);

  if (!clientId || clientId === 'dummy') {
    try {
      const base64Payload = idToken.split('.')[1];
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
      return {
        googleId: payload.sub || 'google-' + Date.now(),
        email: payload.email || 'google@user.com',
        name: payload.name || 'Google User',
        avatar: payload.picture || '',
      };
    } catch (err) {
      const error = new Error('Invalid Google id_token.');
      error.statusCode = 400;
      throw error;
    }
  }

  const client = new OAuth2Client(fallbackClientIds);
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: fallbackClientIds });
    const payload = ticket.getPayload();

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      avatar: payload.picture,
    };
  } catch (error) {
    const fallbackError = new Error('Failed to verify Google token. Please try again.');
    fallbackError.statusCode = 401;
    throw fallbackError;
  }
};

module.exports = { verifyGoogleToken };
