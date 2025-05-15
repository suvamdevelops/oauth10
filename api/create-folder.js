import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import axios from 'axios';
import querystring from 'querystring';

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
  const { access_token, access_token_secret, folder_name } = req.query;

  if (!access_token || !access_token_secret || !folder_name) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  try {
    // STEP 1: Get authenticated user
    const userInfoUrl = 'https://api.smugmug.com/api/v2!authuser';
    const userHeaders = oauth.toHeader(
      oauth.authorize({ url: userInfoUrl, method: 'GET' }, {
        key: access_token,
        secret: access_token_secret,
      })
    );

    const userInfoResponse = await axios.get(userInfoUrl, {
      headers: {
        ...userHeaders,
        Accept: 'application/json',
      },
    });

    const username = userInfoResponse.data.Response.User.NickName;
    const folderUrl = `https://api.smugmug.com/api/v2/folder/user/${username}!folderroot`;

    // STEP 2: Use x-www-form-urlencoded format
    const postData = {
      Name: folder_name,
      UrlName: folder_name.toLowerCase().replace(/\s+/g, '-'),
    };

    const authHeader = oauth.toHeader(
      oauth.authorize(
        { url: folderUrl, method: 'POST', data: postData },
        { key: access_token, secret: access_token_secret }
      )
    );

    const encodedData = querystring.stringify(postData);

    const folderResponse = await axios.post(folderUrl, encodedData, {
      headers: {
        ...authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return res.status(200).json({ message: 'Folder created', data: folderResponse.data });

  } catch (err) {
    return res.status(500).json({
      error: 'Failed to create folder',
      details: err.response?.data || err.message,
    });
  }
}
