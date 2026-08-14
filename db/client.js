const { createClient } = require('@libsql/client');
const path = require('path');

// Production (and now recommended for local dev too): set TURSO_DATABASE_URL +
// TURSO_AUTH_TOKEN. A local-file fallback used to exist here for zero-setup
// testing, but it's unreliable under `netlify dev` — Netlify bundles/copies
// the function file into a cache folder before running it, so a path relative
// to this file's __dirname can silently point at a different (empty) database
// than the one `npm run db:seed` populated. Use a real (free) Turso database
// for local dev too — see README.md for the 5-minute web dashboard setup.
if (!process.env.TURSO_DATABASE_URL) {
  console.warn(
    '\n[db/client.js] TURSO_DATABASE_URL is not set — falling back to a local ' +
    'file DB at db/local.db. This is unreliable under `netlify dev` (see README). ' +
    'Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in your .env instead.\n'
  );
}

const localDbPath = path.join(process.cwd(), 'db', 'local.db');
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${localDbPath}`,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

module.exports = client;
