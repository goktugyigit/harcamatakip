import { getCurrentUser, json, badRequest, unauthorized } from "../../../lib/auth.js";

export async function onRequestDelete({ request, env, params }) {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return unauthorized();

  const id = Number(params?.id);
  if (!Number.isInteger(id) || id <= 0) return badRequest("Geçersiz id");

  const result = await env.DB.prepare("DELETE FROM expenses WHERE id = ?").bind(id).run();

  const changes = result?.meta?.changes ?? 0;
  if (changes === 0) {
    return json({ error: "Kayıt bulunamadı" }, { status: 404 });
  }

  return json({ ok: true, deleted: id });
}
