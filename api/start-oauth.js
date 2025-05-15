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
    const callbackBaseUrl = 'https://your-vercel-domain.vercel.app/api/callback'; // Update this to your actual deployed Vercel callback URL

    const requestTokenUrl = 'https://api.smugmug.com/services/oauth/1.0a/getRequestToken';
    const data = {
      oauth_callback: callbackBaseUrl, // we'll append secret later
    };

    // We generate the OAuth header for this POST request
    const headers = oauth.toHeader(oauth.authorize({ url: requestTokenUrl, method: 'POST', data }));

    // Call SmugMug to get request token and secret
    const response = await axios.post(requestTokenUrl, null, { headers });

    // Parse response, it comes as querystring
    const responseParams = new URLSearchParams(response.data);
    const requestToken = responseParams.get('oauth_token');
    const requestTokenSecret = responseParams.get('oauth_token_secret');

    if (!requestToken || !requestTokenSecret) {
      return res.status(500).json({ error: 'Failed to get request token' });
    }

    // Append the token secret as a query param to the callback URL
    const callbackUrl = `${callbackBaseUrl}?token_secret=${encodeURIComponent(requestTokenSecret)}`;

    // Now redirect user to SmugMug authorize URL with oauth_token and oauth_callback
    const authorizeUrl = `https://api.smugmug.com/services/oauth/1.0a/authorize?oauth_token=${requestToken}&oauth_callback=${encodeURIComponent(callbackUrl)}`;

    // Redirect user to SmugMug for authorization
    res.redirect(authorizeUrl);

  } catch (error) {
    res.status(500).json({ error: 'Failed to start OAuth flow', details: error.message });
  }
}
