const { getStore } = require('@netlify/blobs');

// Same fix as upload.js — automatic Netlify Blobs context injection isn't
// reaching this function reliably, so configure the store explicitly using
// the site ID + API token set as NETLIFY_SITE_ID / NETLIFY_TOKEN env vars.
function uploadsStore() {
  return getStore({
    name: 'uploads',
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_TOKEN,
  });
}

exports.handler = async (event) => {
  const key = event.path.replace(/^\/uploads\//, '');
  if (!key) return { statusCode: 400, body: 'Missing file key' };

  if (!process.env.NETLIFY_SITE_ID || !process.env.NETLIFY_TOKEN) {
    console.error('serve-upload failed: NETLIFY_SITE_ID/NETLIFY_TOKEN not set in environment.');
    return { statusCode: 500, body: 'Blob storage not configured (missing site ID/token)' };
  }

  const store = uploadsStore();
  const result = await store.getWithMetadata(key, { type: 'arrayBuffer' });
  if (!result) return { statusCode: 404, body: 'Not found' };

  const contentType = (result.metadata && result.metadata.contentType) || 'application/octet-stream';
  return {
    statusCode: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    body: Buffer.from(result.data).toString('base64'),
    isBase64Encoded: true,
  };
};
