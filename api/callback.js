import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import axios from 'axios';

const oauth = OAuth({
  consumer: {
    key: process.env.SMUGMUG_CONSUMER_KEY,
    secret: process.env.SMUGMUG_CONSUMER_SECRET,
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base, key) {
    return crypto.createHmac('sha1', key).update(base).digest('base64');
  },
});

export default async function handler(req, res) {
  try {
    const { oauth_token, oauth_verifier, token_secret } = req.query;

    if (!oauth_token || !oauth_verifier || !token_secret) {
      return res.status(400).json({ error: 'Missing required query parameters' });
    }

    const accessTokenUrl = 'https://api.smugmug.com/services/oauth/1.0a/getAccessToken';

    const token = {
      key: oauth_token,
      secret: token_secret,  // this is the request token secret passed as query param
    };

    const data = { oauth_verifier };

    const headers = oauth.toHeader(oauth.authorize({ url: accessTokenUrl, method: 'POST', data }, token));

    // SmugMug expects a POST request here
    const response = await axios.post(accessTokenUrl, null, { headers });

    // Parse access token response (query string format)
    const responseParams = new URLSearchParams(response.data);
    const accessToken = responseParams.get('oauth_token');
    const accessTokenSecret = responseParams.get('oauth_token_secret');

    if (!accessToken || !accessTokenSecret) {
      return res.status(500).json({ error: 'Failed to get access token' });
    }

    // Redirect user back to your Bubble app with the tokens
    const bubbleRedirectUrl = `https://smugmug-integration.bubbleapps.io/version-test?access_token=${encodeURIComponent(accessToken)}&access_secret=${encodeURIComponent(accessTokenSecret)}`;

    res.redirect(bubbleRedirectUrl);

  } catch (error) {
    res.status(500).json({ error: 'OAuth callback failed', details: error.message });
  }
}
