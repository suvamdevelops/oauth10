import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import axios from 'axios';

const oauth = OAuth({
  consumer: {
    key: process.env.SMUGMUG_CONSUMER_KEY,
    secret: process.env.SMUGMUG_CONSUMER_SECRET,
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { folder_name, access_token, access_token_secret } = req.body;

  if (!folder_name || !access_token || !access_token_secret) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const url = 'https://api.smugmug.com/api/v2!folders';

  // Prepare OAuth token object
  const token = {
    key: access_token,
    secret: access_token_secret,
  };

  // OAuth authorize header for POST
  const request_data = {
    url,
    method: 'POST',
  };

  const authHeader = oauth.toHeader(oauth.authorize(request_data, token));

  try {
    const response = await axios.post(
      url,
      { Name: folder_name },
      {
        headers: {
          Authorization: authHeader['Authorization'],
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );
    return res.status(200).json(response.data);
  } catch (error) {
    return res.status(500).json({ error: error.message, details: error.response?.data });
  }
}
