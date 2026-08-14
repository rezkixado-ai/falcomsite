const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const key = event.path.replace(/^\/uploads\//, '');
  if (!key) return { statusCode: 400, body: 'Missing file key' };

  const store = getStore('uploads');
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
