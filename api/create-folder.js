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
    // Step 1: Fetch user's NickName and Folder Uri
    const nicknameUrl = 'https://api.smugmug.com/api/v2!authuser';
    const authHeader1 = oauth.toHeader(oauth.authorize({ url: nicknameUrl, method: 'GET' }, token));

    const userResp = await axios.get(nicknameUrl, {
      headers: {
        ...authHeader1,
        Accept: 'application/json',
      },
    });

    const nickname = userResp.data.Response.User.NickName;
    const folderUri = userResp.data.Response.User.Uris.Folder.Uri; // e.g. "/api/v2/folder/user/suvamp"

    if (!folderUri) {
      return res.status(500).json({ error: 'Missing FolderUri in user profile response' });
    }

    // Step 2: Create Folder using the FolderUri without !folderroot
    const folderUrl = `https://api.smugmug.com${folderUri}`;
    const folderPayload = {
      Name: folder_name,
      UrlName: folder_name.toLowerCase().replace(/\s+/g, '-'),
    };

    const authHeader2 = oauth.toHeader(
      oauth.authorize({ url: folderUrl, method: 'POST', data: folderPayload }, token)
    );

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
