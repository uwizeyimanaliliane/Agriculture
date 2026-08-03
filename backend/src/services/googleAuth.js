const { OAuth2Client } = require('google-auth-library');

const verifyGoogleToken = async (idToken) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;

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

  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken, audience: clientId });
  const payload = ticket.getPayload();

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    avatar: payload.picture,
  };
};

module.exports = { verifyGoogleToken };
