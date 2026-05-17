import { getCurrentUser, json, unauthorized, forbidden } from "../../../lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return unauthorized();
  if (!user.is_admin) return forbidden("Admin erişimi gerekli");

  const { results } = await env.DB.prepare(
    `SELECT u.id, u.email, u.display_name, u.is_admin, u.can_merge, u.created_at,
            (SELECT COUNT(*) FROM expenses e WHERE e.person = u.display_name) AS expense_count,
            (SELECT COALESCE(SUM(amount_cents), 0) FROM expenses e WHERE e.person = u.display_name) AS total_cents
       FROM users u
      ORDER BY u.created_at ASC`,
  ).all();

  return json({
    users: results.map((u) => ({
      ...u,
      is_admin: !!u.is_admin,
      can_merge: !!u.can_merge,
    })),
  });
}
