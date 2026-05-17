import { getCurrentUser, json, badRequest, unauthorized, forbidden } from "../../../lib/auth.js";

export async function onRequestPost({ request, env }) {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return unauthorized();

  // Yetki: can_merge VEYA admin
  if (!user.can_merge && !user.is_admin) {
    return forbidden("Bu işlem için yöneticiden 'Kişileri birleştir' yetkisi alın");
  }

  const myName = (user.display_name || "").trim();
  if (!myName) return forbidden("Önce ayarlardan adınızı belirleyin");

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

  // GÜVENLİK: Hedef SADECE kendi display_name'iniz olabilir.
  // (Başkasının harcamalarını kendi adına çekme YOK; tersi de YOK.)
  if (target.toLowerCase() !== myName.toLowerCase()) {
    return forbidden("Sadece kendi adınıza birleştirme yapabilirsiniz");
  }

  // GÜVENLİK: Kaynak olarak başka bir kullanıcının display_name'i kullanılamaz
  // (yani Emrullah'ın adına atanmış kayıtları kendi adına çekemezsin).
  const placeholders = sources.map(() => "?").join(",");
  const { results: otherUsers } = await env.DB.prepare(
    `SELECT display_name FROM users
      WHERE display_name IS NOT NULL
        AND TRIM(display_name) != ''
        AND LOWER(display_name) != LOWER(?)
        AND LOWER(display_name) IN (${sources.map(() => "LOWER(?)").join(",")})`,
  )
    .bind(myName, ...sources)
    .all();

  if (otherUsers && otherUsers.length > 0) {
    const names = otherUsers.map((u) => u.display_name).join(", ");
    return forbidden(`Başka kullanıcılara ait isimler birleştirilemez: ${names}`);
  }

  const filtered = sources.filter((s) => s.toLowerCase() !== myName.toLowerCase());
  if (filtered.length === 0) {
    return badRequest("Kaynak ve hedef aynı");
  }

  const placeholders2 = filtered.map(() => "?").join(",");
  const result = await env.DB.prepare(
    `UPDATE expenses SET person = ? WHERE person IN (${placeholders2})`,
  )
    .bind(myName, ...filtered)
    .run();

  const updated = result?.meta?.changes ?? 0;
  return json({ ok: true, updated, target: myName, merged: filtered });
}
