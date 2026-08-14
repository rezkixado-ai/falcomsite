const express = require('express');
const serverless = require('serverless-http');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const client = require('../../db/client');
const auth = require('../../lib/auth');
const crud = require('../../lib/generic-crud');
const chatbot = require('../../lib/chatbot');
const { uploadHandler } = require('../../lib/upload');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB, covers images and short videos

app.use(express.json({ limit: '2mb' }));

function toObj(rows) {
  const obj = {};
  for (const r of rows) obj[r.key] = r.value;
  return obj;
}

// Public routes are defined on a Router, then mounted at BOTH '/' and '/api'.
// Reason: depending on how Netlify's redirect rewrite interacts with the
// function runtime, the incoming path can arrive either with the `/api`
// prefix already stripped (e.g. "/hero-slides") or still attached (e.g.
// "/api/hero-slides"). Handling both shapes is a safe, no-downside way to
// not depend on that exact (and not fully documented) behavior.
const publicRouter = express.Router();

publicRouter.get('/settings', async (req, res) => {
  const r = await client.execute('SELECT * FROM settings');
  res.json(toObj(r.rows));
});

publicRouter.get('/hero-slides', async (req, res) => {
  const r = await client.execute('SELECT * FROM hero_slides WHERE active = 1 ORDER BY sort_order ASC, id ASC');
  res.json(r.rows);
});

publicRouter.get('/stats', async (req, res) => {
  const r = await client.execute('SELECT * FROM stats ORDER BY sort_order ASC, id ASC');
  res.json(r.rows);
});

publicRouter.get('/sales-network', async (req, res) => {
  const r = await client.execute('SELECT * FROM sales_network ORDER BY sort_order ASC, id ASC');
  res.json(r.rows);
});

publicRouter.get('/clients', async (req, res) => {
  const r = await client.execute('SELECT * FROM clients ORDER BY sort_order ASC, id ASC');
  res.json(r.rows);
});

publicRouter.get('/videos', async (req, res) => {
  const r = await client.execute('SELECT * FROM videos WHERE active = 1 ORDER BY sort_order ASC, id ASC');
  res.json(r.rows);
});

publicRouter.get('/categories', async (req, res) => {
  const r = await client.execute('SELECT * FROM categories ORDER BY sort_order ASC, id ASC');
  res.json(r.rows);
});

publicRouter.get('/solution-categories', async (req, res) => {
  const r = await client.execute('SELECT * FROM solution_categories ORDER BY sort_order ASC, id ASC');
  res.json(r.rows);
});

publicRouter.get('/solutions', async (req, res) => {
  const r = await client.execute('SELECT * FROM solutions WHERE active = 1 ORDER BY sort_order ASC, id ASC');
  res.json(r.rows);
});

publicRouter.get('/testimonials', async (req, res) => {
  const r = await client.execute('SELECT * FROM testimonials WHERE active = 1 ORDER BY sort_order ASC, id ASC');
  res.json(r.rows);
});

publicRouter.get('/articles', async (req, res) => {
  const status = req.query.status;
  const sql = status
    ? { sql: 'SELECT * FROM articles WHERE status = ? ORDER BY publish_at DESC', args: [status] }
    : 'SELECT * FROM articles ORDER BY publish_at DESC';
  const r = await client.execute(sql);
  res.json(r.rows);
});

publicRouter.get('/articles/:slug', async (req, res) => {
  const r = await client.execute({ sql: 'SELECT * FROM articles WHERE slug = ?', args: [req.params.slug] });
  if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(r.rows[0]);
});

publicRouter.get('/products', async (req, res) => {
  const { featured, category, subcategory } = req.query;
  let sql = 'SELECT * FROM products WHERE active = 1';
  const args = [];
  if (featured === '1') sql += ' AND featured = 1';
  if (category) { sql += ' AND category = ?'; args.push(category); }
  if (subcategory) { sql += ' AND subcategory = ?'; args.push(subcategory); }
  sql += ' ORDER BY sort_order ASC, id ASC';
  const r = await client.execute({ sql, args });
  res.json(r.rows);
});

publicRouter.get('/products/:slug', async (req, res) => {
  const r = await client.execute({ sql: 'SELECT * FROM products WHERE slug = ? AND active = 1', args: [req.params.slug] });
  if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(r.rows[0]);
});

publicRouter.post('/chat/session', chatbot.createSession);
publicRouter.post('/chat/message', chatbot.sendMessage);

app.use('/', publicRouter);
app.use('/api', publicRouter);

/* ================= ADMIN ================= */
// Same defensive double-mount for admin routes (see comment above).

const adminAuthRouter = express.Router();
adminAuthRouter.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const r = await client.execute({ sql: 'SELECT * FROM admin_users WHERE username = ?', args: [username] });
  const user = r.rows[0];
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Username atau password salah' });
  }
  auth.setAuthCookie(res, { uid: user.id, username: user.username });
  res.json({ ok: true });
});
adminAuthRouter.post('/logout', (req, res) => {
  auth.clearAuthCookie(res);
  res.json({ ok: true });
});

app.use('/admin/auth', adminAuthRouter);

const adminApiRouter = express.Router();
adminApiRouter.use(auth.requireAuth);

adminApiRouter.get('/me', (req, res) => res.json({ username: req.admin.username }));

adminApiRouter.get('/dashboard-summary', async (req, res) => {
  const [articles, drafts, sessions, escalated] = await Promise.all([
    client.execute("SELECT COUNT(*) c FROM articles WHERE status = 'published'"),
    client.execute("SELECT COUNT(*) c FROM articles WHERE status != 'published'"),
    client.execute('SELECT COUNT(*) c FROM chat_sessions'),
    client.execute('SELECT COUNT(*) c FROM chat_sessions WHERE escalated = 1'),
  ]);
  res.json({
    articles: articles.rows[0].c,
    drafts: drafts.rows[0].c,
    chat_sessions: sessions.rows[0].c,
    escalated: escalated.rows[0].c,
  });
});

adminApiRouter.get('/settings', async (req, res) => {
  const r = await client.execute('SELECT * FROM settings');
  res.json(toObj(r.rows));
});

adminApiRouter.put('/settings', async (req, res) => {
  for (const [key, value] of Object.entries(req.body || {})) {
    await client.execute({
      sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      args: [key, value],
    });
  }
  res.json({ ok: true });
});

adminApiRouter.post('/change-password', async (req, res) => {
  const { current_password, new_password } = req.body || {};
  const r = await client.execute({ sql: 'SELECT * FROM admin_users WHERE id = ?', args: [req.admin.uid] });
  const user = r.rows[0];
  if (!user || !bcrypt.compareSync(current_password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Password saat ini salah' });
  }
  if (!new_password || new_password.length < 8) {
    return res.status(400).json({ error: 'Password baru minimal 8 karakter' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  await client.execute({ sql: 'UPDATE admin_users SET password_hash = ? WHERE id = ?', args: [hash, req.admin.uid] });
  res.json({ ok: true });
});

adminApiRouter.post('/upload', upload.single('file'), uploadHandler);

adminApiRouter.get('/chat-sessions', async (req, res) => {
  const r = await client.execute('SELECT * FROM chat_sessions ORDER BY created_at DESC LIMIT 100');
  res.json(r.rows);
});

adminApiRouter.get('/chat-sessions/:id/messages', async (req, res) => {
  const r = await client.execute({ sql: 'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC', args: [req.params.id] });
  res.json(r.rows);
});

// Generic CRUD — powers every CMS tab (hero_slides, stats, sales_network,
// clients, videos, products, categories, solution_categories, solutions,
// testimonials, chatbot_qa, articles) through one implementation.
adminApiRouter.get('/:table', crud.list);
adminApiRouter.post('/:table', crud.create);
adminApiRouter.put('/:table/:id', crud.update);
adminApiRouter.delete('/:table/:id', crud.remove);

app.use('/admin/api', adminApiRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports.handler = serverless(app);
