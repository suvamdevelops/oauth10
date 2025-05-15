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

  const method = 'POST';
  const createFolderUrl = `https://api.smugmug.com/api/v2/folder/user/suvamp!folderroot`;

  const request_data = {
    url: createFolderUrl,
    method: method,
  };

  const token = {
    key: access_token,
    secret: access_token_secret,
  };

  const folderHeaders = oauth.toHeader(oauth.authorize(request_data, token));
  folderHeaders['Content-Type'] = 'application/json';
  folderHeaders['Accept'] = 'application/json';

  try {
    const response = await axios.post(
      createFolderUrl,
      {
        Name: folder_name,
        UrlName: folder_name.toLowerCase().replace(/\s+/g, '-'),
      },
      {
        headers: folderHeaders,
      }
    );

    res.status(200).json({ message: 'Folder created', data: response.data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create folder', details: err.response?.data || err.message });
  }
}
