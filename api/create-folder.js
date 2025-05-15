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
    // Step 1: Get NickName
    const nicknameUrl = 'https://api.smugmug.com/api/v2!authuser';
    const authHeader1 = oauth.toHeader(
      oauth.authorize({ url: nicknameUrl, method: 'GET' }, token)
    );

    const userResp = await axios.get(nicknameUrl, {
      headers: {
        ...authHeader1,
        Accept: 'application/json',
      },
    });

    const nickname = userResp.data.Response.User.NickName;

    // Step 2: Create Folder
    const urlName = folder_name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const folderUrl = `https://api.smugmug.com/api/v2/folder/user/${encodeURIComponent(nickname)}!folderroot`;
    const folderPayload = {
      Name: folder_name,
      UrlName: urlName,
    };

    const signedRequest = oauth.authorize(
      {
        url: folderUrl,
        method: 'POST',
      },
      token
    );

    const authHeader2 = oauth.toHeader(signedRequest);

    const folderResp = await axios.post(folderUrl, folderPayload, {
      headers: {
        ...authHeader2,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    res.status(200).json({ message: 'Folder created successfully', data: folderResp.data });
  } catch (err) {
    const message = err.response?.data || err.message || 'Unknown error';
    res.status(500).json({ error: 'Failed to create folder', details: message });
  }
}
