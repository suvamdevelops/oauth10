import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import fetch from 'node-fetch';

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
  try {
    const callbackBaseUrl = 'https://oauth-proxy-chi.vercel.app/api/callback'; 
    const requestTokenUrl = 'https://api.smugmug.com/services/oauth/1.0a/getRequestToken';
    const data = {
      oauth_callback: callbackBaseUrl,
    };
    
    // Generate OAuth header
    const authHeader = oauth.toHeader(oauth.authorize({ url: requestTokenUrl, method: 'POST', data }));
    
    // Use node-fetch instead of axios
    const response = await fetch(requestTokenUrl, {
      method: 'POST',
      headers: authHeader
    });
    
    const responseText = await response.text();
    
    // Parse response, it comes as querystring
    const responseParams = new URLSearchParams(responseText);
    const requestToken = responseParams.get('oauth_token');
    const requestTokenSecret = responseParams.get('oauth_token_secret');
    
    if (!requestToken || !requestTokenSecret) {
      return res.status(500).json({ error: 'Failed to get request token' });
    }
    
    // Append the token secret as a query param to the callback URL
    const callbackUrl = `${callbackBaseUrl}?token_secret=${encodeURIComponent(requestTokenSecret)}`;
    
    // Now redirect user to SmugMug authorize URL with oauth_token and oauth_callback
    const authorizeUrl = `https://api.smugmug.com/services/oauth/1.0a/authorize?oauth_token=${requestToken}&oauth_callback=${encodeURIComponent(callbackUrl)}`;
    
    // Redirect user to SmugMug for authorization
    res.redirect(authorizeUrl);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to start OAuth flow', 
      details: error.message,
      stack: error.stack 
    });
  }
}
