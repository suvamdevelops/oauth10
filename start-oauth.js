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
  const url = 'https://api.smugmug.com/services/oauth/1.0a/getRequestToken';
  const data = { oauth_callback: process.env.CALLBACK_URL };
  const headers = oauth.toHeader(oauth.authorize({ url, method: 'GET', data }));

  try {
    const response = await axios.get(url, { headers });
    res.redirect(`https://api.smugmug.com/services/oauth/1.0a/authorize?${response.data}`);
  } catch (err) {
    res.status(500).json({ error: 'OAuth start failed', details: err.message });
  }
}
