import {
  hashPassword,
  newSalt,
  json,
  badRequest,
  normalizePhone,
  isValidPhone,
} from "../../../lib/auth.js";

// POST /api/auth/reset-password  body: { email, phone, new_password }
// Email + telefon eşleşirse şifreyi günceller. Eşleşmezse generic hata (information leakage azalt).
// Mevcut tüm session'ları siler (güvenlik).
export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Geçersiz istek");
  }

  const email = String(body?.email || "").trim().toLowerCase();
  const phone = normalizePhone(body?.phone);
  const newPassword = String(body?.new_password || "");

  if (!email || !email.includes("@")) return badRequest("Geçerli bir e-posta gir");
  if (!isValidPhone(phone)) return badRequest("Telefon 10 hane olmalı (başında 0 olmadan)");
  if (newPassword.length < 6) return badRequest("Yeni parola en az 6 karakter olmalı");

  const user = await env.DB.prepare(
    "SELECT id, email, phone FROM users WHERE email = ? AND phone = ?",
  )
    .bind(email, phone)
    .first();

  // Email VEYA phone yanlışsa generic mesaj — hangisinin yanlış olduğunu sızdırma
  if (!user) {
    return json({ error: "E-posta veya telefon numarası eşleşmedi" }, { status: 401 });
  }

  // Phone NULL olan kullanıcı için yukarıdaki query AND phone = ? ile zaten eşleşmez,
  // ama ek koruma:
  if (!user.phone || !isValidPhone(user.phone)) {
    return json({ error: "Bu hesapta telefon numarası kayıtlı değil — şifre sıfırlama yapılamaz" }, { status: 403 });
  }

  const salt = newSalt();
  const hash = await hashPassword(newPassword, salt);

  // Şifreyi güncelle ve mevcut tüm session'ları sonlandır (güvenlik)
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?")
      .bind(hash, salt, user.id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id),
  ]);

  return json({ ok: true });
}
