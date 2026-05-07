import { getCurrentUser, json, unauthorized } from "../../lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return unauthorized();

  const { results: per_person } = await env.DB.prepare(
    `SELECT COALESCE(NULLIF(person, ''), '—') AS person,
            SUM(amount_cents) AS total_cents,
            COUNT(*) AS count
       FROM expenses
      GROUP BY COALESCE(NULLIF(person, ''), '—')
      ORDER BY total_cents DESC`,
  ).all();

  const { results: per_method } = await env.DB.prepare(
    `SELECT COALESCE(NULLIF(payment_method, ''), '—') AS method,
            SUM(amount_cents) AS total_cents,
            COUNT(*) AS count
       FROM expenses
      GROUP BY COALESCE(NULLIF(payment_method, ''), '—')
      ORDER BY total_cents DESC`,
  ).all();

  const total_cents = per_person.reduce((acc, r) => acc + Number(r.total_cents), 0);

  return json({ per_person, per_method, total_cents });
}
