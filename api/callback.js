import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import fetch from 'node-fetch';
import url from 'url';

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
    const { oauth_token, oauth_verifier, oauth_callback } = req.query;

    if (!oauth_token || !oauth_verifier || !oauth_callback) {
      return res.status(400).json({ error: 'Missing required query parameters' });
    }

    // Decode oauth_callback URL and parse token_secret
    const decodedCallback = decodeURIComponent(oauth_callback);
    const parsedCallbackUrl = url.parse(decodedCallback, true);
    const token_secret = parsedCallbackUrl.query.token_secret;

    if (!token_secret) {
      return res.status(400).json({ error: 'Missing token_secret in oauth_callback' });
    }

    // Prepare OAuth token object with request token and secret
    const token = { key: oauth_token, secret: token_secret };

    // SmugMug access token URL
    const accessTokenUrl = 'https://api.smugmug.com/services/oauth/1.0a/getAccessToken';

    // Generate OAuth headers for access token request
    const data = { oauth_verifier };
    const headers = oauth.toHeader(oauth.authorize({ url: accessTokenUrl, method: 'POST', data }, token));

    // Request access token from SmugMug using fetch instead of axios
    const response = await fetch(accessTokenUrl, {
      method: 'POST',
      headers
    });

    // Parse response text
    const responseText = await response.text();
    
    // Parse access token and secret from response
    const params = new URLSearchParams(responseText);
    const accessToken = params.get('oauth_token');
    const accessTokenSecret = params.get('oauth_token_secret');

    if (!accessToken || !accessTokenSecret) {
      return res.status(500).json({ error: 'Failed to get access token from SmugMug' });
    }

    // Redirect user back to your Bubble app with access token and secret as query params
    const bubbleRedirectUrl = `https://smugmug-integration.bubbleapps.io/version-test?access_token=${encodeURIComponent(accessToken)}&access_secret=${encodeURIComponent(accessTokenSecret)}`;

    res.redirect(bubbleRedirectUrl);

  } catch (error) {
    res.status(500).json({ 
      error: 'OAuth callback failed', 
      details: error.message,
      stack: error.stack 
    });
  }
}
