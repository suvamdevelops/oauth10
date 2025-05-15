// File: /api/create-folder.js

import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

export async function POST(req) {
  const { accessToken, accessTokenSecret, folderName } = await req.json();

  if (!accessToken || !accessTokenSecret || !folderName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const nickname = 'suvamp'; // Static value for now
  const url = `https://api.smugmug.com/api/v2/folder/user/${nickname}!folders`;

  const method = 'POST';

  const params = new URLSearchParams();
  params.append('Name', folderName);
  params.append('UrlName', folderName.replace(/\s+/g, '')); // SmugMug prefers camelCase or no spaces

  const authHeader = oauth.toHeader(
    oauth.authorize({ url, method }, { key: accessToken, secret: accessTokenSecret })
  );

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: authHeader.Authorization,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to create folder', details: result }, { status: response.status });
    }

    return NextResponse.json({ message: 'Folder created successfully', result });
  } catch (err) {
    return NextResponse.json({ error: 'Unexpected error', details: err.message }, { status: 500 });
  }
}
