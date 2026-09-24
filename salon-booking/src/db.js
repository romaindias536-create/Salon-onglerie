// Accès à la base de données via l'API REST auto-générée par Supabase
// (PostgREST), appelée uniquement depuis le serveur avec la clé
// "service_role" — jamais exposée au navigateur. Volontairement sans
// dépendance au SDK @supabase/supabase-js : juste fetch() (natif depuis
// Node 18) et quelques requêtes bien connues.

function baseUrl() {
  const url = process.env.SUPABASE_URL;
  if (!url) return null;
  return `${url.replace(/\/+$/, '')}/rest/v1`;
}

function serviceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function isConfigured() {
  return Boolean(baseUrl() && serviceKey());
}

/** Requête bas niveau vers PostgREST. `path` inclut la table et la query
 * string, par ex. "appointments?date=eq.2026-09-30&select=*". */
async function pg(path, { method = 'GET', body, prefer, extraHeaders } = {}) {
  const base = baseUrl();
  const key = serviceKey();
  if (!base || !key) {
    const err = new Error(
      "La base de données n'est pas configurée (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants)."
    );
    err.code = 'not_configured';
    throw err;
  }
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  if (extraHeaders) Object.assign(headers, extraHeaders);

  const res = await fetch(`${base}/${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const err = new Error((data && data.message) || `Erreur base de données (${res.status})`);
    err.status = res.status;
    err.code = data && data.code;
    err.details = data && data.details;
    err.hint = data && data.hint;
    throw err;
  }
  return data;
}

// Encode chaque valeur (encodeURIComponent laisse volontairement intacts
// les caractères sûrs pour PostgREST : lettres, chiffres, - _ . ! ~ * ' ( ) —
// donc les préfixes d'opérateur comme "eq." ou "gte." restent lisibles,
// tandis qu'un espace, un "+" ou un accent dans une valeur (téléphone, nom)
// est correctement échappé.
function qs(params) {
  const parts = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return parts.join('&');
}

// ---------------------------------------------------------------- services

async function listServices({ activeOnly = false } = {}) {
  const params = { select: '*', order: 'sort_order.asc,name.asc' };
  if (activeOnly) params.active = 'eq.true';
  return pg(`services?${qs(params)}`);
}

async function getService(id) {
  const rows = await pg(`services?${qs({ id: `eq.${id}`, select: '*' })}`);
  return rows[0] || null;
}

async function createService(data) {
  const rows = await pg('services', { method: 'POST', body: data, prefer: 'return=representation' });
  return rows[0];
}

async function updateService(id, data) {
  const rows = await pg(`services?${qs({ id: `eq.${id}` })}`, {
    method: 'PATCH',
    body: data,
    prefer: 'return=representation',
  });
  return rows[0] || null;
}

async function deleteService(id) {
  await pg(`services?${qs({ id: `eq.${id}` })}`, { method: 'DELETE' });
}

// ---------------------------------------------------------- business_hours

async function listBusinessHours() {
  return pg(`business_hours?${qs({ select: '*', order: 'day_of_week.asc' })}`);
}

/** Remplace les 7 lignes d'horaires en une fois (upsert sur day_of_week). */
async function replaceBusinessHours(rows) {
  return pg(`business_hours?${qs({ on_conflict: 'day_of_week' })}`, {
    method: 'POST',
    body: rows,
    prefer: 'resolution=merge-duplicates,return=representation',
  });
}

// ------------------------------------------------------------------ blocks

async function listBlocksFrom(dateISO) {
  return pg(`blocks?${qs({ date: `gte.${dateISO}`, select: '*', order: 'date.asc,start_time.asc' })}`);
}

async function listBlocksForDate(dateISO) {
  return pg(`blocks?${qs({ date: `eq.${dateISO}`, select: '*' })}`);
}

async function createBlock(data) {
  const rows = await pg('blocks', { method: 'POST', body: data, prefer: 'return=representation' });
  return rows[0];
}

async function deleteBlock(id) {
  await pg(`blocks?${qs({ id: `eq.${id}` })}`, { method: 'DELETE' });
}

// ------------------------------------------------------------- appointments

const APPT_SELECT = '*';

async function listAppointmentsForDate(dateISO, { includeCancelled = false } = {}) {
  const params = { date: `eq.${dateISO}`, select: APPT_SELECT, order: 'start_time.asc' };
  if (!includeCancelled) params.status = 'eq.confirmed';
  return pg(`appointments?${qs(params)}`);
}

async function listAppointmentsBetween(fromISO, toISO, { includeCancelled = false } = {}) {
  const params = {
    date: `gte.${fromISO}`,
    select: APPT_SELECT,
    order: 'date.asc,start_time.asc',
  };
  if (!includeCancelled) params.status = 'eq.confirmed';
  // Deuxième borne sur la même colonne "date" : qs() ne gère qu'une seule
  // valeur par clé, donc on ajoute ce filtre à part.
  const rows = await pg(
    `appointments?${qs(params)}&date=${encodeURIComponent(`lte.${toISO}`)}`
  );
  return rows;
}

async function listUpcomingByPhone(phone, todayISO) {
  return pg(
    `appointments?${qs({
      phone: `eq.${phone}`,
      status: 'eq.confirmed',
      date: `gte.${todayISO}`,
      select: APPT_SELECT,
      order: 'date.asc,start_time.asc',
    })}`
  );
}

async function getAppointmentByCode(code) {
  const rows = await pg(
    `appointments?${qs({ booking_code: `eq.${code}`, select: APPT_SELECT })}`
  );
  return rows[0] || null;
}

async function getAppointmentById(id) {
  const rows = await pg(`appointments?${qs({ id: `eq.${id}`, select: APPT_SELECT })}`);
  return rows[0] || null;
}

async function createAppointment(data) {
  const rows = await pg('appointments', {
    method: 'POST',
    body: data,
    prefer: 'return=representation',
  });
  return rows[0];
}

async function updateAppointmentByCode(code, data) {
  const rows = await pg(`appointments?${qs({ booking_code: `eq.${code}` })}`, {
    method: 'PATCH',
    body: data,
    prefer: 'return=representation',
  });
  return rows[0] || null;
}

async function updateAppointmentById(id, data) {
  const rows = await pg(`appointments?${qs({ id: `eq.${id}` })}`, {
    method: 'PATCH',
    body: data,
    prefer: 'return=representation',
  });
  return rows[0] || null;
}

async function deleteAppointmentById(id) {
  await pg(`appointments?${qs({ id: `eq.${id}` })}`, { method: 'DELETE' });
}

module.exports = {
  isConfigured,
  listServices,
  getService,
  createService,
  updateService,
  deleteService,
  listBusinessHours,
  replaceBusinessHours,
  listBlocksFrom,
  listBlocksForDate,
  createBlock,
  deleteBlock,
  listAppointmentsForDate,
  listAppointmentsBetween,
  listUpcomingByPhone,
  getAppointmentByCode,
  getAppointmentById,
  createAppointment,
  updateAppointmentByCode,
  updateAppointmentById,
  deleteAppointmentById,
};
