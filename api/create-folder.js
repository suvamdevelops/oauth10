// File: /api/create-folder.js

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
  const { access_token, access_token_secret, folder_name } = req.query;

  if (!access_token || !access_token_secret || !folder_name) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  const token = {
    key: access_token,
    secret: access_token_secret,
  };

  try {
    // Step 1: Get the user's NickName
    const authUserUrl = 'https://api.smugmug.com/api/v2!authuser';
    const authHeader1 = oauth.toHeader(
      oauth.authorize({ url: authUserUrl, method: 'GET' }, token)
    );

    const authUserRes = await axios.get(authUserUrl, {
      headers: {
        ...authHeader1,
        Accept: 'application/json',
      },
    });

    const nickname = authUserRes.data.Response.User.NickName;

    // Step 2: Create folder using NickName
    const createUrl = `https://api.smugmug.com/api/v2/folder/user/${nickname}!folderroot`;
    const data = {
      Name: folder_name,
      UrlName: folder_name.toLowerCase().replace(/\s+/g, '-'),
    };

    const authHeader2 = oauth.toHeader(
      oauth.authorize({ url: createUrl, method: 'POST', data }, token)
    );

    const createRes = await axios.post(createUrl, data, {
      headers: {
        ...authHeader2,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    res.status(200).json({ message: 'Folder created', data: createRes.data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create folder', details: err.response?.data || err.message });
  }
}
