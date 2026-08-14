const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

async function uploadHandler(req, res) {
  const file = req.file; // populated by multer memoryStorage upstream
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase();
  const key = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;

  const store = getStore('uploads');
  await store.set(key, file.buffer, { metadata: { contentType: file.mimetype } });

  // Served back via the /uploads/:key redirect (see netlify.toml) -> serve-upload function.
  res.status(201).json({ url: `/uploads/${key}` });
}

module.exports = { uploadHandler };
