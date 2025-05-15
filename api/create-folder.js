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
    // Step 1: Get the user’s folder URI
    const authUserUrl = 'https://api.smugmug.com/api/v2!authuser';
    const authHeaders = oauth.toHeader(oauth.authorize({ url: authUserUrl, method: 'GET' }, token));
    authHeaders['Accept'] = 'application/json';

    const authResponse = await axios.get(authUserUrl, { headers: authHeaders });
    const folderUri = authResponse.data.Response.User.Uris.Folder;

    // Step 2: Construct full URL to POST the folder
    const folderPostUrl = `https://api.smugmug.com${folderUri}`;
    const postHeaders = oauth.toHeader(oauth.authorize({ url: folderPostUrl, method: 'POST' }, token));
    postHeaders['Content-Type'] = 'application/json';
    postHeaders['Accept'] = 'application/json';

    const postBody = {
      Name: folder_name,
      UrlName: folder_name.toLowerCase().replace(/\s+/g, '-'),
    };

    const createResponse = await axios.post(folderPostUrl, postBody, {
      headers: postHeaders,
    });

    res.status(200).json({
      message: 'Folder created successfully',
      data: createResponse.data,
    });
  } catch (error) {
    console.error('Create folder failed:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to create folder',
      details: error.response?.data || error.message,
    });
  }
}
