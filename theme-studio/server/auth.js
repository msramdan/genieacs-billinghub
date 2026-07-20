const crypto = require("crypto");

const AUTH_USER = process.env.AUTH_USER || "";
const AUTH_PASS = process.env.AUTH_PASS || "";
const COOKIE = "acs_studio_session";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const enabled = Boolean(AUTH_USER && AUTH_PASS);

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function makeToken() {
  return crypto.createHmac("sha256", AUTH_PASS).update(`acs-studio:${AUTH_USER}`).digest("hex");
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function isAuthed(req) {
  if (!enabled) return true;
  const cookies = parseCookies(req);
  return timingSafeEqualStr(cookies[COOKIE] || "", makeToken());
}

function setSessionCookie(res) {
  // Same-origin HTTP deploy: tanpa Secure agar cookie jalan di http://IP
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${encodeURIComponent(makeToken())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(MAX_AGE_MS / 1000)}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

function requireAuth(req, res, next) {
  if (!enabled || isAuthed(req)) return next();
  return res.status(401).json({ ok: false, error: "Login diperlukan", authRequired: true });
}

module.exports = {
  enabled,
  AUTH_USER,
  isAuthed,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  login(username, password) {
    if (!enabled) return { ok: true, authDisabled: true };
    if (
      timingSafeEqualStr(username || "", AUTH_USER) &&
      timingSafeEqualStr(password || "", AUTH_PASS)
    ) {
      return { ok: true };
    }
    return { ok: false, error: "Username atau password salah" };
  },
};
