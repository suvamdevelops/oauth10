import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

const oauth = OAuth({
  consumer: {
    key: process.env.SMUGMUG_API_KEY,
    secret: process.env.SMUGMUG_API_SECRET,
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto
      .createHmac('sha1', key)
      .update(base_string)
      .digest('base64');
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { accessToken, accessTokenSecret, nickname, folderName } = req.body;

    if (!accessToken || !accessTokenSecret || !nickname || !folderName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const url = `https://api.smugmug.com/api/v2/folder/user/${nickname}!folders`;
    const method = 'POST';

    // Ensure UrlName starts with uppercase letter
    const urlSafeName = folderName.replace(/\s+/g, '');
    const capitalizedUrlName = urlSafeName.charAt(0).toUpperCase() + urlSafeName.slice(1);

    const data = {
      Name: folderName,
      UrlName: capitalizedUrlName,
      AutoRename: true,
    };

    const authHeader = oauth.toHeader(
      oauth.authorize({ url, method }, { key: accessToken, secret: accessTokenSecret })
    );

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: authHeader.Authorization,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to create folder', details: result });
    }

    return res.status(200).json({ message: 'Folder created successfully', result });
  } catch (error) {
    return res.status(500).json({ error: 'Unexpected error', details: error.message });
  }
}
