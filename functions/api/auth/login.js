import {
  hashPassword,
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

  if (!email || !password) return badRequest("E-posta ve parola gerekli");

  const user = await env.DB.prepare(
    "SELECT id, email, password_hash, password_salt FROM users WHERE email = ?",
  )
    .bind(email)
    .first();

  if (!user) return json({ error: "E-posta veya parola hatalı" }, { status: 401 });

  const hash = await hashPassword(password, user.password_salt);
  if (hash !== user.password_hash) {
    return json({ error: "E-posta veya parola hatalı" }, { status: 401 });
  }

  const token = await createSession(env.DB, user.id);

  return json(
    { user: { id: user.id, email: user.email } },
    { headers: { "Set-Cookie": sessionCookie(token) } },
  );
}
