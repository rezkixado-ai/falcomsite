const fs = require('fs');
const path = require('path');
const client = require('../db/client');

async function init() {
  const sql = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf-8');
  // libSQL's execute() runs one statement at a time — split on ';' between statements.
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await client.execute(stmt);
  }
  console.log(`Schema initialized — ${statements.length} statements executed.`);
}

init().catch(err => {
  console.error('Failed to initialize schema:', err);
  process.exit(1);
});
