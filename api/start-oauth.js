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
  const requestData = {
    url: 'https://api.smugmug.com/services/oauth/1.0a/getRequestToken',
    method: 'POST',
    data: {
      oauth_callback: 'https://smugmug-integration.bubbleapps.io/version-test'
    },
  };

  const headers = oauth.toHeader(oauth.authorize(requestData));

  try {
    const response = await axios.post(requestData.url, null, {
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const params = new URLSearchParams(response.data);
    const oauthToken = params.get('oauth_token');

    const redirectUrl = `https://secure.smugmug.com/services/oauth/1.0a/authorize?oauth_token=${oauthToken}`;

    res.redirect(redirectUrl);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get request token', details: error.message });
  }
}
