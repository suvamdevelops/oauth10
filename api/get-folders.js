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
    try {
      const { accessToken, accessTokenSecret, nickname } = JSON.parse(body);

      if (!accessToken || !accessTokenSecret || !nickname) {
        return res.status(400).json({ 
          error: 'Missing required fields', 
          required: ['accessToken', 'accessTokenSecret', 'nickname'] 
        });
      }

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

      // SmugMug API endpoint for getting user's folders
      const url = `https://api.smugmug.com/api/v2/folder/user/${nickname}!folders`;
      const method = 'GET';

      const authHeader = oauth.toHeader(
        oauth.authorize({ url, method }, { key: accessToken, secret: accessTokenSecret })
      );

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: authHeader.Authorization,
          Accept: 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({ 
          error: 'Failed to get folders', 
          details: result,
          url: url,
          method: method
        });
      }

      // Extract folder information in a clean format
      const folders = result.Response?.Folder || [];
      const simplifiedFolders = folders.map(folder => ({
        id: folder.NodeID,
        name: folder.Name,
        urlName: folder.UrlName,
        description: folder.Description || '',
        dateCreated: folder.DateCreated,
        dateModified: folder.DateModified,
        privacy: folder.Privacy,
        securityType: folder.SecurityType,
        folderCount: folder.FolderCount || 0,
        albumCount: folder.AlbumCount || 0,
        hasChildren: folder.HasChildren || false,
        uri: folder.Uri,
        uris: folder.Uris
      }));

      return res.status(200).json({ 
        message: 'Folders retrieved successfully', 
        totalFolders: simplifiedFolders.length,
        folders: simplifiedFolders,
        rawResponse: result // Include raw response for debugging if needed
      });
    } catch (err) {
      return res.status(500).json({ 
        error: 'Unexpected error', 
        details: err.message,
        stack: err.stack
      });
    }
  });
};
