import { getCurrentUser, json, badRequest, unauthorized } from "../../../lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getCurrentUser(request, env.DB);
  return json({ user: user || null });
}

// Görünen adı tek seferlik set eder. Set edilmişse 403 döner.
export async function onRequestPost({ request, env }) {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Geçersiz istek");
  }

  if (user.display_name && user.display_name.trim()) {
    return json({ error: "Ad zaten belirlendi, değiştirilemez" }, { status: 403 });
  }

  const name = String(body?.display_name ?? "").trim().replace(/\s+/g, " ");
  if (!name) return badRequest("Ad boş olamaz");
  if (name.length < 2) return badRequest("Ad en az 2 karakter olmalı");
  if (name.length > 100) return badRequest("Ad çok uzun (en fazla 100 karakter)");

  // Case-insensitive eşsizlik kontrolü
  const conflict = await env.DB.prepare(
    "SELECT 1 FROM users WHERE LOWER(display_name) = LOWER(?) AND id != ?",
  )
    .bind(name, user.id)
    .first();
  if (conflict) {
    return json({ error: "Bu ad başkası tarafından kullanılıyor" }, { status: 409 });
  }

  // Race-safe: sadece NULL/boş ise güncelle
  const result = await env.DB.prepare(
    `UPDATE users SET display_name = ?
       WHERE id = ?
         AND (display_name IS NULL OR TRIM(display_name) = '')`,
  )
    .bind(name, user.id)
    .run();

  const changes = result?.meta?.changes ?? 0;
  if (changes === 0) {
    return json({ error: "Ad zaten belirlendi, değiştirilemez" }, { status: 403 });
  }

  return json({ user: { id: user.id, email: user.email, display_name: name } });
}
