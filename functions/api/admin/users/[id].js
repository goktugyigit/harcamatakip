import { getCurrentUser, json, badRequest, unauthorized, forbidden } from "../../../../lib/auth.js";

// PATCH /api/admin/users/:id  body: { can_merge: boolean }
// Sadece can_merge alanı toggle edilebilir; is_admin DB üzerinden değiştirilir.
export async function onRequestPatch({ request, env, params }) {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return unauthorized();
  if (!user.is_admin) return forbidden("Admin erişimi gerekli");

  const id = Number(params?.id);
  if (!Number.isInteger(id) || id <= 0) return badRequest("Geçersiz id");

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Geçersiz istek");
  }

  if (typeof body?.can_merge !== "boolean") {
    return badRequest("can_merge boolean olmalı");
  }

  // Admin kendi can_merge'ini değiştirebilir (örn. sadece admin için açık tutmak istemiyorsa);
  // ama is_admin'i hiç DOKUNMA — bu güvenlik kritik.
  const result = await env.DB.prepare(
    "UPDATE users SET can_merge = ? WHERE id = ?",
  )
    .bind(body.can_merge ? 1 : 0, id)
    .run();

  const changes = result?.meta?.changes ?? 0;
  if (changes === 0) return json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

  return json({ ok: true, id, can_merge: body.can_merge });
}
