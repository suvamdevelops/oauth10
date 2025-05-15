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
  const { oauth_token, oauth_verifier } = req.query;

  const url = 'https://api.smugmug.com/services/oauth/1.0a/getAccessToken';
  const token = { key: oauth_token, secret: '' }; // In a real app, retrieve the correct request token secret
  const data = { oauth_verifier };
  const headers = oauth.toHeader(oauth.authorize({ url, method: 'GET', data }, token));

  try {
    const response = await axios.get(url, { headers });
    res.status(200).json({ message: 'Access token received', data: response.data });
  } catch (err) {
    res.status(500).json({ error: 'OAuth callback failed', details: err.message });
  }
}
