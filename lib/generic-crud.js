const client = require('../db/client');

// Whitelist of tables the generic /admin/api/:table CRUD endpoint may touch,
// with their editable columns. Keeps the endpoint from being a wide-open
// "run arbitrary SQL on any table" hole.
const TABLES = {
  hero_slides: ['eyebrow', 'title', 'subtitle', 'cta_text', 'cta_link', 'image_url', 'sort_order', 'active'],
  stats: ['label', 'value', 'suffix', 'image_url', 'sort_order'],
  sales_network: ['city', 'region', 'map_x', 'map_y', 'address', 'phone', 'is_hq', 'sort_order'],
  clients: ['name', 'logo_url', 'sort_order'],
  videos: ['title', 'youtube_url', 'thumbnail_url', 'channel_name', 'sort_order', 'active'],
  products: ['name', 'slug', 'sku', 'category', 'subcategory', 'short_desc', 'description', 'key_features', 'specifications', 'catalogue_url', 'image_url', 'gallery_urls', 'featured', 'sort_order', 'active'],
  categories: ['name', 'slug', 'parent_id', 'sort_order'],
  solution_categories: ['name', 'slug', 'sort_order'],
  solutions: ['category_slug', 'name', 'image_url', 'link_url', 'sort_order', 'active'],
  testimonials: ['name', 'role', 'photo_url', 'headline', 'quote', 'sort_order', 'active'],
  chatbot_qa: ['topic', 'keywords', 'answer', 'sort_order', 'active'],
  articles: ['title', 'slug', 'excerpt', 'content', 'cover_image', 'category', 'status', 'publish_at', 'author'],
};

function isAllowed(table) {
  return Object.prototype.hasOwnProperty.call(TABLES, table);
}

async function list(req, res) {
  const { table } = req.params;
  if (!isAllowed(table)) return res.status(404).json({ error: 'Unknown table' });
  const r = await client.execute(`SELECT * FROM ${table} ORDER BY sort_order ASC, id ASC`);
  res.json(r.rows);
}

async function create(req, res) {
  const { table } = req.params;
  if (!isAllowed(table)) return res.status(404).json({ error: 'Unknown table' });
  const cols = TABLES[table].filter(c => req.body[c] !== undefined);
  if (!cols.length) return res.status(400).json({ error: 'No valid fields provided' });
  const placeholders = cols.map(() => '?').join(',');
  const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`;
  const args = cols.map(c => req.body[c]);
  const result = await client.execute({ sql, args });
  const row = await client.execute({ sql: `SELECT * FROM ${table} WHERE id = ?`, args: [Number(result.lastInsertRowid)] });
  res.status(201).json(row.rows[0]);
}

async function update(req, res) {
  const { table, id } = req.params;
  if (!isAllowed(table)) return res.status(404).json({ error: 'Unknown table' });
  const cols = TABLES[table].filter(c => req.body[c] !== undefined);
  if (!cols.length) return res.status(400).json({ error: 'No valid fields provided' });
  const setClause = cols.map(c => `${c} = ?`).join(', ');
  const args = [...cols.map(c => req.body[c]), id];
  await client.execute({ sql: `UPDATE ${table} SET ${setClause} WHERE id = ?`, args });
  const row = await client.execute({ sql: `SELECT * FROM ${table} WHERE id = ?`, args: [id] });
  if (!row.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(row.rows[0]);
}

async function remove(req, res) {
  const { table, id } = req.params;
  if (!isAllowed(table)) return res.status(404).json({ error: 'Unknown table' });
  await client.execute({ sql: `DELETE FROM ${table} WHERE id = ?`, args: [id] });
  res.json({ ok: true });
}

module.exports = { list, create, update, remove, TABLES };
