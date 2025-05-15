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

  try {
    // Step 1: Get the auth user
    const authUserUrl = 'https://api.smugmug.com/api/v2!authuser';
    const token = { key: access_token, secret: access_token_secret };
    const authHeader1 = oauth.toHeader(oauth.authorize({ url: authUserUrl, method: 'GET' }, token));

    const authUserResponse = await axios.get(authUserUrl, {
      headers: {
        Authorization: authHeader1['Authorization'],
        Accept: 'application/json',
      },
    });

    const userUri = authUserResponse.data.Response.User.Uri;

    // Step 2: Get folder root
    const folderRootUrl = `https://api.smugmug.com${userUri}!folderroot`;
    const authHeader2 = oauth.toHeader(oauth.authorize({ url: folderRootUrl, method: 'GET' }, token));

    const folderRootResponse = await axios.get(folderRootUrl, {
      headers: {
        Authorization: authHeader2['Authorization'],
        Accept: 'application/json',
      },
    });

    const createFolderUrl = folderRootResponse.data.Response.Folder.Uri;
    const fullUrl = `https://api.smugmug.com${createFolderUrl}`;

    // Step 3: Create folder
    const authHeader3 = oauth.toHeader(oauth.authorize({ url: fullUrl, method: 'POST' }, token));

    const createResponse = await axios.post(
      fullUrl,
      {
        Name: folder_name,
        UrlName: folder_name.toLowerCase().replace(/\s+/g, '-'),
      },
      {
        headers: {
          Authorization: authHeader3['Authorization'],
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    return res.status(200).json(createResponse.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to create folder', details: err.response?.data || err.message });
  }
}
