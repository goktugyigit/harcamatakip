import { getCurrentUser, json, unauthorized } from "../../lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return unauthorized();

  const { results } = await env.DB.prepare(
    `SELECT person, COUNT(*) AS count, SUM(amount_cents) AS total_cents
       FROM expenses
      WHERE person IS NOT NULL AND TRIM(person) != ''
      GROUP BY person
      ORDER BY person COLLATE NOCASE`,
  ).all();

  return json({ people: results });
}
