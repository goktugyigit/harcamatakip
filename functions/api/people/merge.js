import { getCurrentUser, json, badRequest, unauthorized } from "../../../lib/auth.js";

export async function onRequestPost({ request, env }) {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Geçersiz istek");
  }

  const rawSources = Array.isArray(body?.sources) ? body.sources : [];
  const sources = [
    ...new Set(
      rawSources
        .map((s) => (s == null ? "" : String(s).trim()))
        .filter((s) => s.length > 0 && s.length <= 100),
    ),
  ];
  const target = String(body?.target ?? "").trim();

  if (sources.length === 0) return badRequest("Birleştirilecek kişi seçin");
  if (!target) return badRequest("Hedef kişi adı boş olamaz");
  if (target.length > 100) return badRequest("Hedef kişi adı çok uzun");

  const filtered = sources.filter((s) => s !== target);
  if (filtered.length === 0) {
    return badRequest("Kaynak ve hedef aynı");
  }

  const placeholders = filtered.map(() => "?").join(",");
  const result = await env.DB.prepare(
    `UPDATE expenses SET person = ? WHERE person IN (${placeholders})`,
  )
    .bind(target, ...filtered)
    .run();

  const updated = result?.meta?.changes ?? 0;
  return json({ ok: true, updated, target, merged: filtered });
}
