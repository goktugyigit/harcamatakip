import {
  hashPassword,
  newSalt,
  createSession,
  sessionCookie,
  json,
  badRequest,
} from "../../../lib/auth.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Geçersiz istek");
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !email.includes("@")) return badRequest("Geçerli bir e-posta gir");
  if (password.length < 6) return badRequest("Parola en az 6 karakter olmalı");

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first();
  if (existing) return badRequest("Bu e-posta zaten kayıtlı");

  const salt = newSalt();
  const hash = await hashPassword(password, salt);
  const now = Date.now();

  const result = await env.DB.prepare(
    "INSERT INTO users (email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?)",
  )
    .bind(email, hash, salt, now)
    .run();

  const userId = result.meta.last_row_id;
  const token = await createSession(env.DB, userId);

  return json(
    { user: { id: userId, email } },
    { headers: { "Set-Cookie": sessionCookie(token) } },
  );
}
