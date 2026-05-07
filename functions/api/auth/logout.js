import { destroySession, sessionCookie, json } from "../../../lib/auth.js";

export async function onRequestPost({ request, env }) {
  await destroySession(request, env.DB);
  return json(
    { ok: true },
    { headers: { "Set-Cookie": sessionCookie("", { clear: true }) } },
  );
}
