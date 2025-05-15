import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import axios from 'axios';
import querystring from 'querystring'; // Needed to parse SmugMug response

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
  const { oauth_token, oauth_verifier } = req.query;

  // Replace this with your real way to store/retrieve the token secret
  const token = {
    key: oauth_token,
    secret: '', // Must be the request token secret used when requesting this oauth_token
  };

  const url = 'https://api.smugmug.com/services/oauth/1.0a/getAccessToken';
  const data = { oauth_verifier };
  const headers = oauth.toHeader(oauth.authorize({ url, method: 'GET', data }, token));

  try {
    const response = await axios.get(url, { headers });

    // SmugMug responds with query string format, parse it
    const parsed = querystring.parse(response.data);

    const accessToken = parsed.oauth_token;
    const accessTokenSecret = parsed.oauth_token_secret;

    // ✅ Redirect back to your Bubble app with token
    res.redirect(
      `https://smugmug-integration.bubbleapps.io/version-test?access_token=${accessToken}&access_secret=${accessTokenSecret}`
    );
  } catch (err) {
    res.status(500).json({ error: 'OAuth callback failed', details: err.message });
  }
}
