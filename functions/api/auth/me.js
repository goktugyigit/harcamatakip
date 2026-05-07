import { getCurrentUser, json } from "../../../lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getCurrentUser(request, env.DB);
  return json({ user: user || null });
}
