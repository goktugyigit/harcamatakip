const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 100_000;

function bytesToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(byteLen) {
  const arr = new Uint8Array(byteLen);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

export async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(saltHex),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return bytesToHex(bits);
}

export function newSalt() {
  return randomHex(16);
}

export function newSessionToken() {
  return randomHex(32);
}

export function sessionCookie(token, { clear = false } = {}) {
  if (clear) {
    return "session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
  }
  return `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`;
}

function readSessionToken(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)session=([a-f0-9]+)/);
  return match ? match[1] : null;
}

export async function getCurrentUser(request, db) {
  const token = readSessionToken(request);
  if (!token) return null;
  const row = await db
    .prepare(
      `SELECT u.id AS id, u.email AS email, u.display_name AS display_name,
              u.phone AS phone,
              u.is_admin AS is_admin, u.can_merge AS can_merge,
              s.expires_at AS expires_at
         FROM sessions s
         JOIN users u ON s.user_id = u.id
        WHERE s.token = ?`,
    )
    .bind(token)
    .first();
  if (!row) return null;
  if (row.expires_at <= Date.now()) {
    await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    phone: row.phone,
    is_admin: !!row.is_admin,
    can_merge: !!row.can_merge,
  };
}

// 10 hane, sadece rakam, başında 0 olmadan
const PHONE_RE = /^\d{10}$/;
export function normalizePhone(input) {
  if (input == null) return "";
  // Sadece rakamları al, başındaki 0'ı çıkar
  let s = String(input).replace(/\D/g, "");
  if (s.startsWith("0")) s = s.replace(/^0+/, "");
  return s;
}
export function isValidPhone(s) {
  return PHONE_RE.test(s);
}

export function forbidden(message = "Yetkisiz işlem") {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function createSession(db, userId) {
  const token = newSessionToken();
  const expiresAt = Date.now() + SESSION_MS;
  await db
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, userId, expiresAt)
    .run();
  return token;
}

export async function destroySession(request, db) {
  const token = readSessionToken(request);
  if (!token) return;
  await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
}

export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function badRequest(message) {
  return json({ error: message }, { status: 400 });
}

export function unauthorized() {
  return json({ error: "Giriş gerekli" }, { status: 401 });
}
