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
    // Step 1: Get the user's folder URI
    const authUserUrl = 'https://api.smugmug.com/api/v2!authuser';
    const authHeaders = oauth.toHeader(oauth.authorize({ url: authUserUrl, method: 'GET' }, token));
    authHeaders['Accept'] = 'application/json';

    const userResponse = await axios.get(authUserUrl, { headers: authHeaders });
    const folderUri = userResponse.data.Response.User.Uris.Folder; // <-- THIS is the real folder URI

    // Step 2: Create the new folder
    const createFolderUrl = `https://api.smugmug.com${folderUri}`;
    const folderHeaders = oauth.toHeader(oauth.authorize({ url: createFolderUrl, method: 'POST' }, token));
    folderHeaders['Accept'] = 'application/json';
    folderHeaders['Content-Type'] = 'application/json';

    const createResponse = await axios.post(
      createFolderUrl,
      {
        Name: folder_name,
        UrlName: folder_name.toLowerCase().replace(/\s+/g, '-')
      },
      { headers: folderHeaders }
    );

    res.status(200).json({ message: 'Folder created successfully', data: createResponse.data });

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to create folder',
      details: err.response?.data || err.message,
    });
  }
}
