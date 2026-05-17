import { getCurrentUser, json, unauthorized } from "../../lib/auth.js";

// Kullanıcının merge edebileceği "person" varyasyonlarını döndürür:
// - Kendi mevcut kayıtları (display_name eşleşen)
// - Hiçbir kullanıcının display_name'ine eşleşmeyen "orphan" eski isimler
// BAŞKA kullanıcıların display_name'lerini DÖNDÜRMEZ (gizlilik + data theft engelleme).
export async function onRequestGet({ request, env }) {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return unauthorized();

  const { results } = await env.DB.prepare(
    `SELECT person, COUNT(*) AS count, SUM(amount_cents) AS total_cents
       FROM expenses
      WHERE person IS NOT NULL AND TRIM(person) != ''
        AND LOWER(person) NOT IN (
          SELECT LOWER(display_name) FROM users
           WHERE id != ?
             AND display_name IS NOT NULL
             AND TRIM(display_name) != ''
        )
      GROUP BY person
      ORDER BY person COLLATE NOCASE`,
  )
    .bind(user.id)
    .all();

  return json({ people: results });
}
