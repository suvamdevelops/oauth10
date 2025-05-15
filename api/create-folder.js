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

  try {
    // Step 1: Get NickName
    const userInfoUrl = 'https://api.smugmug.com/api/v2!authuser';
    const authHeaders = oauth.toHeader(oauth.authorize({ url: userInfoUrl, method: 'GET' }, {
      key: access_token,
      secret: access_token_secret,
    }));

    const userInfoResponse = await axios.get(userInfoUrl, {
      headers: {
        ...authHeaders,
        Accept: 'application/json',
      },
    });

    const nickname = userInfoResponse.data?.Response?.User?.NickName;
    if (!nickname) throw new Error('Nickname not found');

    // Step 2: Create folder
    const createFolderUrl = `https://api.smugmug.com/api/v2/folder/user/${nickname}!folderroot`;
    const method = 'POST';
    const data = {
      Name: folder_name,
      UrlName: folder_name.replace(/\s+/g, '-').toLowerCase(),
    };

    const folderHeaders = oauth.toHeader(oauth.authorize({ url: createFolderUrl, method, data }, {
      key: access_token,
      secret: access_token_secret,
    }));

    const response = await axios.post(createFolderUrl, data, {
      headers: {
        ...folderHeaders,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    res.status(200).json({ message: 'Folder created successfully', details: response.data });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to create folder',
      details: err.response?.data || err.message,
    });
  }
}
