const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

// Automatic Netlify Blobs context injection doesn't reach this function
// reliably (see NETLIFY.md / earlier MissingBlobsEnvironmentError), so we
// configure the store manually using the site ID + API token set in the
// Netlify dashboard as NETLIFY_SITE_ID / NETLIFY_TOKEN env vars.
function uploadsStore() {
  return getStore({
    name: 'uploads',
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_TOKEN,
  });
}

async function uploadHandler(req, res) {
  const file = req.file; // populated by multer memoryStorage upstream
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  if (!process.env.NETLIFY_SITE_ID || !process.env.NETLIFY_TOKEN) {
    console.error('Upload failed: NETLIFY_SITE_ID/NETLIFY_TOKEN not set in environment.');
    return res.status(500).json({ error: 'Blob storage not configured (missing site ID/token)' });
  }

  const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase();
  const key = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;

  const store = uploadsStore();
  await store.set(key, file.buffer, { metadata: { contentType: file.mimetype } });

  // Served back via the /uploads/:key redirect (see netlify.toml) -> serve-upload function.
  res.status(201).json({ url: `/uploads/${key}` });
}

module.exports = { uploadHandler, uploadsStore };
