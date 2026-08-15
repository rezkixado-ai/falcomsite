const crypto = require('crypto');
const client = require('../db/client');

async function getSetting(key, fallback) {
  const r = await client.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: [key] });
  return r.rows.length ? r.rows[0].value : fallback;
}

async function createSession(req, res) {
  const id = crypto.randomUUID();
  await client.execute({ sql: 'INSERT INTO chat_sessions (id) VALUES (?)', args: [id] });
  res.json({ session_id: id, greeting: 'Halo! Saya Falcom Assistant. Ada yang bisa saya bantu terkait produk fiber optik atau jaringan kami?' });
}

async function sendMessage(req, res) {
  const { session_id, message } = req.body || {};
  if (!session_id || !message) return res.status(400).json({ error: 'session_id and message are required' });

  const sessionRes = await client.execute({ sql: 'SELECT * FROM chat_sessions WHERE id = ?', args: [session_id] });
  const session = sessionRes.rows[0];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  await client.execute({ sql: 'INSERT INTO chat_messages (session_id, sender, message) VALUES (?,?,?)', args: [session_id, 'user', message] });

  const kbRes = await client.execute('SELECT * FROM chatbot_qa WHERE active = 1 ORDER BY sort_order ASC');
  const normalized = message.toLowerCase();
  let best = null, bestScore = 0;
  for (const row of kbRes.rows) {
    const keywords = String(row.keywords).split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    const score = keywords.filter(k => normalized.includes(k)).length;
    if (score > bestScore) { bestScore = score; best = row; }
  }

  const failLimit = parseInt(await getSetting('chat_fail_limit', '3'), 10);

  if (best) {
    await client.execute({ sql: 'UPDATE chat_sessions SET unresolved_count = 0 WHERE id = ?', args: [session_id] });
    await client.execute({ sql: 'INSERT INTO chat_messages (session_id, sender, message, matched) VALUES (?,?,?,1)', args: [session_id, 'bot', best.answer] });
    return res.json({ reply: best.answer, escalate: false });
  }

  const nextUnresolved = (session.unresolved_count || 0) + 1;
  const shouldEscalate = nextUnresolved >= failLimit;
  await client.execute({
    sql: 'UPDATE chat_sessions SET unresolved_count = ?, escalated = ? WHERE id = ?',
    args: [shouldEscalate ? 0 : nextUnresolved, shouldEscalate ? 1 : session.escalated, session_id],
  });

  if (shouldEscalate) {
    // No single WA number here anymore — the frontend shows a "Tanya Sales
    // Wilayah di Kotamu" quick-reply button, which fetches the 4 regional
    // WA numbers from /api/chat-regions (managed in the admin "Live Chat" panel).
    const reply = 'Sepertinya pertanyaan Anda perlu dibantu tim sales langsung.';
    await client.execute({ sql: 'INSERT INTO chat_messages (session_id, sender, message, matched) VALUES (?,?,?,0)', args: [session_id, 'bot', reply] });
    return res.json({ reply, escalate: true });
  }

  const reply = 'Maaf, saya belum menemukan jawaban yang pas untuk itu. Bisa dijelaskan lebih detail?';
  await client.execute({ sql: 'INSERT INTO chat_messages (session_id, sender, message, matched) VALUES (?,?,?,0)', args: [session_id, 'bot', reply] });
  res.json({ reply, escalate: false });
}

module.exports = { createSession, sendMessage };
