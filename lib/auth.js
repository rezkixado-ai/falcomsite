const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'falcom-dev-secret-change-me-in-production';
const COOKIE_NAME = 'falcom_admin_token';
const MAX_AGE = 60 * 60 * 8; // 8 hours, matches the old session cookie maxAge

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: MAX_AGE });
}

function verifyToken(token) {
  try { return jwt.verify(token, SECRET); } catch (e) { return null; }
}

// Minimal hand-rolled cookie serialize/parse — avoids depending on the exact
// API shape of the `cookie` npm package, which has changed between major
// versions (v0.x vs v2.x expose very different function names/signatures).
function serializeCookie(name, value, { maxAge, httpOnly, secure, sameSite, path } = {}) {
  let str = `${name}=${encodeURIComponent(value)}`;
  if (path) str += `; Path=${path}`;
  if (typeof maxAge === 'number') str += `; Max-Age=${Math.floor(maxAge)}`;
  if (httpOnly) str += '; HttpOnly';
  if (secure) str += '; Secure';
  if (sameSite) str += `; SameSite=${sameSite}`;
  return str;
}

function parseCookieHeader(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

function setAuthCookie(res, payload) {
  const token = signToken(payload);
  res.setHeader('Set-Cookie', serializeCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: MAX_AGE,
  }));
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', serializeCookie(COOKIE_NAME, '', {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Lax', path: '/', maxAge: 0,
  }));
}

function getTokenFromReq(req) {
  const parsed = parseCookieHeader(req.headers.cookie);
  return parsed[COOKIE_NAME] || null;
}

// Express middleware — protects /admin/api/* routes.
function requireAuth(req, res, next) {
  const token = getTokenFromReq(req);
  const payload = token && verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  req.admin = payload;
  next();
}

module.exports = { signToken, verifyToken, setAuthCookie, clearAuthCookie, getTokenFromReq, requireAuth, COOKIE_NAME };
