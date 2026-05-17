import { getCurrentUser, json, badRequest, unauthorized } from "../../lib/auth.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function optStr(v, max) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function normalizeRow(raw, person) {
  const amountNum = Number(raw?.amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return { error: "Tutar pozitif bir sayı olmalı" };
  }
  if (amountNum > 100_000_000) return { error: "Tutar çok büyük" };

  let date = String(raw?.date || "").trim();
  if (!date) date = todayISO();
  if (!DATE_RE.test(date)) return { error: "Tarih YYYY-AA-GG biçiminde olmalı" };

  return {
    row: {
      date,
      person,
      description: optStr(raw?.description, 500),
      payment_method: optStr(raw?.payment_method, 50),
      note: optStr(raw?.note, 1000),
      amount_cents: Math.round(amountNum * 100),
    },
  };
}

export async function onRequestGet({ request, env }) {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return unauthorized();

  // Tüm harcamalar herkese görünür (paylaşılı görünüm).
  // Silme yetkisi backend'de DELETE endpoint'inde kullanıcının kendi person'ına kısıtlanmış.
  const { results } = await env.DB.prepare(
    `SELECT e.id, e.date, e.person, e.description, e.payment_method, e.note,
            e.amount_cents, e.created_at, u.email AS entered_by
       FROM expenses e
       JOIN users u ON e.user_id = u.id
      ORDER BY e.date DESC, e.id DESC
      LIMIT 2000`,
  ).all();

  return json({ expenses: results });
}

export async function onRequestPost({ request, env }) {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return unauthorized();

  const person = (user.display_name || "").trim();
  if (!person) {
    return json(
      { error: "Önce ayarlardan adınızı belirleyin", code: "DISPLAY_NAME_REQUIRED" },
      { status: 403 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Geçersiz istek");
  }

  const items = Array.isArray(body?.items) ? body.items : null;
  if (!items || items.length === 0) return badRequest("En az bir satır gerekli");
  if (items.length > 100) return badRequest("Tek seferde en fazla 100 satır");

  const rows = [];
  for (let i = 0; i < items.length; i++) {
    const out = normalizeRow(items[i], person);
    if (out.error) return badRequest(`Satır ${i + 1}: ${out.error}`);
    rows.push(out.row);
  }

  const now = Date.now();
  const stmt = env.DB.prepare(
    `INSERT INTO expenses
       (date, person, description, payment_method, note, amount_cents, user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const batch = rows.map((r) =>
    stmt.bind(
      r.date,
      r.person,
      r.description,
      r.payment_method,
      r.note,
      r.amount_cents,
      user.id,
      now,
    ),
  );
  await env.DB.batch(batch);

  return json({ ok: true, inserted: rows.length });
}
