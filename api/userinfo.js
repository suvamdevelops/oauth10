import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import fetch from 'node-fetch';

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
  const { access_token, access_token_secret } = req.query;

  if (!access_token || !access_token_secret) {
    return res.status(400).json({ error: 'Missing access_token or access_token_secret' });
  }

  const url = 'https://api.smugmug.com/api/v2!authuser';
  const headers = oauth.toHeader(
    oauth.authorize({ url, method: 'GET' }, {
      key: access_token,
      secret: access_token_secret,
    })
  );

  try {
    const response = await fetch(url, {
      headers: {
        ...headers,
        Accept: 'application/json',
      },
    });

    const responseData = await response.json();
    const nickname = responseData?.Response?.User?.NickName;
    
    res.status(200).json({
      message: 'User info retrieved successfully',
      nickname,
      raw: responseData
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to retrieve user info',
      details: err.message,
      stack: err.stack
    });
  }
}
