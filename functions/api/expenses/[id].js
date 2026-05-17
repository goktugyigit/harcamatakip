import { getCurrentUser, json, badRequest, unauthorized, forbidden } from "../../../lib/auth.js";

export async function onRequestDelete({ request, env, params }) {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return unauthorized();

  const id = Number(params?.id);
  if (!Number.isInteger(id) || id <= 0) return badRequest("Geçersiz id");

  const person = (user.display_name || "").trim();
  if (!person) return forbidden("Önce ayarlardan adınızı belirleyin");

  // Sadece KENDİ adına atanmış kaydı silebilir.
  const result = await env.DB.prepare(
    "DELETE FROM expenses WHERE id = ? AND person = ?",
  )
    .bind(id, person)
    .run();

  const changes = result?.meta?.changes ?? 0;
  if (changes === 0) {
    // Kayıt yok veya kullanıcının değil — ikisini de aynı mesajla cevapla (information leakage azalt)
    return json({ error: "Kayıt bulunamadı veya yetkiniz yok" }, { status: 404 });
  }

  return json({ ok: true, deleted: id });
}
