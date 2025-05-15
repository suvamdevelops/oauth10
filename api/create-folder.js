const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const fetch = require('node-fetch');

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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const { accessToken, accessTokenSecret, folderName } = JSON.parse(body);
      const nickname = 'suvamp'; // Static nickname

      if (!accessToken || !accessTokenSecret || !folderName) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const url = `https://api.smugmug.com/api/v2/folder/user/${nickname}!folders`;
      const method = 'POST';
      const data = {
        Name: folderName,
        UrlName: folderName.replace(/\s+/g, ''), // Must be alphanumeric and start with uppercase if needed
      };

      const authHeader = oauth.toHeader(
        oauth.authorize({ url, method }, { key: accessToken, secret: accessTokenSecret })
      );

      const apiRes = await fetch(url, {
        method,
        headers: {
          Authorization: authHeader.Authorization,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await apiRes.json();

      if (!apiRes.ok) {
        res.status(apiRes.status).json({ error: 'Failed to create folder', details: result });
        return;
      }

      res.status(200).json({ message: 'Folder created successfully', result });
    } catch (err) {
      res.status(500).json({ error: 'Unexpected error', details: err.message });
    }
  });
};
