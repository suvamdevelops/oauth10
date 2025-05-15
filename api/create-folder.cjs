const OAuth = require('oauth-1.0a');
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body = '';

  req.on('data', chunk => {
    body += chunk;
  });

  req.on('end', async () => {
    const { accessToken, accessTokenSecret, nickname, folderName } = JSON.parse(body);

    if (!accessToken || !accessTokenSecret || !nickname || !folderName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const oauth = OAuth({
      consumer: {
        key: process.env.SMUGMUG_API_KEY,
        secret: process.env.SMUGMUG_API_SECRET,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      },
    });

    const url = `https://api.smugmug.com/api/v2/folder/user/${nickname}!folders`;
    const method = 'POST';
    const data = {
      Name: folderName,
      UrlName: folderName.replace(/\s+/g, ''),
    };

    const authHeader = oauth.toHeader(
      oauth.authorize({ url, method }, { key: accessToken, secret: accessTokenSecret })
    );

    try {
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
    } catch (err) {
      return res.status(500).json({ error: 'Unexpected error', details: err.message });
    }
  });
};
