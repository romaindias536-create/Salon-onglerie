const express = require('express');
const db = require('../db');
const availability = require('../availability');
const { generateBookingCode } = require('../bookingCode');
const { isValidISODate, isValidTime, minutesToTime, timeToMinutes, nowLocal } = require('../time');
const { requireAdminApi } = require('../auth');
const { normalizePhone, isValidPhone } = require('../phone');

const router = express.Router();
router.use(requireAdminApi);

function badRequest(res, message) {
  return res.status(400).json({ error: 'bad_request', message });
}
function clean(str, max) {
  return String(str == null ? '' : str).trim().slice(0, max);
}
function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str || ''));
}

// --------------------------------------------------------------- appointments

router.get('/appointments', async (req, res) => {
  try {
    const { date, from, to, includeCancelled } = req.query;
    const withCancelled = includeCancelled === '1' || includeCancelled === 'true';
    let rows;
    if (date) {
      if (!isValidISODate(date)) return badRequest(res, 'Date invalide.');
      rows = await db.listAppointmentsForDate(date, { includeCancelled: withCancelled });
    } else if (from && to) {
      if (!isValidISODate(from) || !isValidISODate(to)) return badRequest(res, 'Plage de dates invalide.');
      rows = await db.listAppointmentsBetween(from, to, { includeCancelled: withCancelled });
    } else {
      return badRequest(res, 'Précisez `date` ou `from`/`to`.');
    }
    res.json({ appointments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'Impossible de charger les rendez-vous.' });
  }
});

router.get('/availability', async (req, res) => {
  const { date, durationMin, excludeAppointmentId } = req.query;
  if (!isValidISODate(date)) return badRequest(res, 'Date invalide.');
  const duration = parseInt(durationMin, 10);
  if (!duration || duration <= 0) return badRequest(res, 'Durée invalide.');
  try {
    const slots = await availability.getAvailableSlots(date, duration, {
      excludeAppointmentId: excludeAppointmentId || undefined,
    });
    res.json({ slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'Erreur de calcul des disponibilités.' });
  }
});

router.post('/appointments', async (req, res) => {
  const body = req.body || {};
  const serviceId = clean(body.serviceId, 100);
  const date = clean(body.date, 10);
  const startTime = clean(body.startTime, 5);
  const firstName = clean(body.firstName, 60);
  const lastName = clean(body.lastName, 60);
  const phone = normalizePhone(clean(body.phone, 30));
  const emailAddr = clean(body.email, 120);
  const notes = clean(body.notes, 500);

  if (!serviceId) return badRequest(res, 'Prestation requise.');
  if (!isValidISODate(date) || !isValidTime(startTime)) return badRequest(res, 'Date ou heure invalide.');
  if (!firstName || !lastName) return badRequest(res, 'Prénom et nom requis.');
  if (!isValidPhone(phone)) return badRequest(res, 'Téléphone invalide.');
  if (emailAddr && !isValidEmail(emailAddr)) return badRequest(res, 'E-mail invalide.');

  try {
    const service = await db.getService(serviceId);
    if (!service) return badRequest(res, 'Prestation introuvable.');
    const endTime = minutesToTime(timeToMinutes(startTime) + service.duration_min);

    let attemptsLeft = 4;
    let appt = null;
    let lastErr = null;
    while (attemptsLeft > 0 && !appt) {
      attemptsLeft -= 1;
      try {
        appt = await db.createAppointment({
          booking_code: generateBookingCode(),
          first_name: firstName,
          last_name: lastName,
          phone,
          email: emailAddr || null,
          service_id: service.id,
          service_name: service.name,
          duration_min: service.duration_min,
          price: service.price,
          date,
          start_time: startTime,
          end_time: endTime,
          notes: notes || null,
          status: 'confirmed',
          source: 'admin',
        });
      } catch (err) {
        lastErr = err;
        if (err.code === '23P01') {
          return res.status(409).json({ error: 'slot_unavailable', message: 'Ce créneau chevauche un autre rendez-vous.' });
        }
        if (err.code !== '23505') throw err;
      }
    }
    if (!appt) throw lastErr || new Error('Échec de création.');
    res.status(201).json({ appointment: appt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: "Le rendez-vous n'a pas pu être créé." });
  }
});

router.patch('/appointments/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  try {
    const existing = await db.getAppointmentById(id);
    if (!existing) return res.status(404).json({ error: 'not_found', message: 'Rendez-vous introuvable.' });

    const patch = {};

    if (body.status === 'cancelled' || body.status === 'confirmed') {
      patch.status = body.status;
    }
    if (body.notes !== undefined) patch.notes = clean(body.notes, 500) || null;
    if (body.firstName !== undefined) patch.first_name = clean(body.firstName, 60) || existing.first_name;
    if (body.lastName !== undefined) patch.last_name = clean(body.lastName, 60) || existing.last_name;
    if (body.phone !== undefined) {
      const p = normalizePhone(clean(body.phone, 30));
      if (isValidPhone(p)) patch.phone = p;
    }
    if (body.email !== undefined) {
      const e = clean(body.email, 120);
      if (!e || isValidEmail(e)) patch.email = e || null;
    }

    // Reprogrammation (date/heure/prestation)
    if (body.date || body.startTime || body.serviceId) {
      const date = clean(body.date || existing.date, 10);
      const startTime = clean(body.startTime || existing.start_time.slice(0, 5), 5);
      if (!isValidISODate(date) || !isValidTime(startTime)) return badRequest(res, 'Date ou heure invalide.');

      let durationMin = existing.duration_min;
      if (body.serviceId) {
        const service = await db.getService(body.serviceId);
        if (!service) return badRequest(res, 'Prestation introuvable.');
        durationMin = service.duration_min;
        patch.service_id = service.id;
        patch.service_name = service.name;
        patch.duration_min = service.duration_min;
        patch.price = service.price;
      }

      const targetStatus = patch.status || existing.status;
      if (targetStatus === 'confirmed') {
        const check = await availability.checkSlot(date, startTime, durationMin, { excludeAppointmentId: id });
        if (!check.ok) return res.status(409).json({ error: 'slot_unavailable', message: check.reason });
      }
      patch.date = date;
      patch.start_time = startTime;
      patch.end_time = minutesToTime(timeToMinutes(startTime) + durationMin);
    }

    if (Object.keys(patch).length === 0) return badRequest(res, 'Aucune modification fournie.');

    try {
      const updated = await db.updateAppointmentById(id, patch);
      res.json({ appointment: updated });
    } catch (err) {
      if (err.code === '23P01') {
        return res.status(409).json({ error: 'slot_unavailable', message: 'Ce créneau chevauche un autre rendez-vous.' });
      }
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'La mise à jour a échoué.' });
  }
});

router.delete('/appointments/:id', async (req, res) => {
  try {
    await db.deleteAppointmentById(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'La suppression a échoué.' });
  }
});

// -------------------------------------------------------------------- hours

router.get('/hours', async (req, res) => {
  try {
    const hours = await db.listBusinessHours();
    res.json({ hours });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'Impossible de charger les horaires.' });
  }
});

router.put('/hours', async (req, res) => {
  const rows = (req.body || {}).hours;
  if (!Array.isArray(rows) || rows.length !== 7) return badRequest(res, 'Sept jours attendus.');
  const cleaned = [];
  for (const r of rows) {
    const day = parseInt(r.day_of_week, 10);
    if (Number.isNaN(day) || day < 0 || day > 6) return badRequest(res, 'Jour invalide.');
    const isClosed = Boolean(r.is_closed);
    let open = null;
    let close = null;
    if (!isClosed) {
      open = clean(r.open_time, 5);
      close = clean(r.close_time, 5);
      if (!isValidTime(open) || !isValidTime(close) || open >= close) {
        return badRequest(res, `Horaires invalides pour le jour ${day}.`);
      }
    }
    cleaned.push({ day_of_week: day, is_closed: isClosed, open_time: open, close_time: close });
  }
  try {
    const hours = await db.replaceBusinessHours(cleaned);
    res.json({ hours });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: "La mise à jour des horaires a échoué." });
  }
});

// ------------------------------------------------------------------- blocks

router.get('/blocks', async (req, res) => {
  try {
    const now = nowLocal();
    const blocks = await db.listBlocksFrom(now.date);
    res.json({ blocks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'Impossible de charger les blocages.' });
  }
});

router.post('/blocks', async (req, res) => {
  const body = req.body || {};
  const date = clean(body.date, 10);
  const allDay = Boolean(body.allDay);
  if (!isValidISODate(date)) return badRequest(res, 'Date invalide.');
  let startTime = null;
  let endTime = null;
  if (!allDay) {
    startTime = clean(body.startTime, 5);
    endTime = clean(body.endTime, 5);
    if (!isValidTime(startTime) || !isValidTime(endTime) || startTime >= endTime) {
      return badRequest(res, 'Plage horaire invalide.');
    }
  }
  try {
    const block = await db.createBlock({
      date,
      all_day: allDay,
      start_time: startTime,
      end_time: endTime,
      reason: clean(body.reason, 200) || null,
    });
    res.status(201).json({ block });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: "L'ajout du blocage a échoué." });
  }
});

router.delete('/blocks/:id', async (req, res) => {
  try {
    await db.deleteBlock(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'La suppression a échoué.' });
  }
});

// ----------------------------------------------------------------- services

router.get('/services', async (req, res) => {
  try {
    const services = await db.listServices();
    res.json({ services });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'Impossible de charger les prestations.' });
  }
});

router.post('/services', async (req, res) => {
  const body = req.body || {};
  const name = clean(body.name, 120);
  const category = clean(body.category, 60);
  const durationMin = parseInt(body.durationMin, 10);
  const price = Number(body.price);
  if (!name) return badRequest(res, 'Nom requis.');
  if (!category) return badRequest(res, 'Catégorie requise.');
  if (!durationMin || durationMin <= 0) return badRequest(res, 'Durée invalide.');
  if (Number.isNaN(price) || price < 0) return badRequest(res, 'Prix invalide.');
  try {
    const service = await db.createService({
      name,
      category,
      duration_min: durationMin,
      price,
      description: clean(body.description, 400) || null,
      active: body.active !== false,
      sort_order: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
    });
    res.status(201).json({ service });
  } catch (err) {
    if (err.code === '23505') return badRequest(res, 'Une prestation porte déjà ce nom.');
    console.error(err);
    res.status(500).json({ error: 'server_error', message: "La création a échoué." });
  }
});

router.patch('/services/:id', async (req, res) => {
  const body = req.body || {};
  const patch = {};
  if (body.name !== undefined) {
    const name = clean(body.name, 120);
    if (!name) return badRequest(res, 'Nom requis.');
    patch.name = name;
  }
  if (body.category !== undefined) {
    const category = clean(body.category, 60);
    if (!category) return badRequest(res, 'Catégorie requise.');
    patch.category = category;
  }
  if (body.durationMin !== undefined) {
    const d = parseInt(body.durationMin, 10);
    if (!d || d <= 0) return badRequest(res, 'Durée invalide.');
    patch.duration_min = d;
  }
  if (body.price !== undefined) {
    const p = Number(body.price);
    if (Number.isNaN(p) || p < 0) return badRequest(res, 'Prix invalide.');
    patch.price = p;
  }
  if (body.description !== undefined) patch.description = clean(body.description, 400) || null;
  if (body.active !== undefined) patch.active = Boolean(body.active);
  if (body.sortOrder !== undefined) patch.sort_order = Number(body.sortOrder) || 0;

  if (Object.keys(patch).length === 0) return badRequest(res, 'Aucune modification fournie.');

  try {
    const service = await db.updateService(req.params.id, patch);
    if (!service) return res.status(404).json({ error: 'not_found', message: 'Prestation introuvable.' });
    res.json({ service });
  } catch (err) {
    if (err.code === '23505') return badRequest(res, 'Une prestation porte déjà ce nom.');
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'La mise à jour a échoué.' });
  }
});

router.delete('/services/:id', async (req, res) => {
  try {
    await db.deleteService(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'La suppression a échoué. Ce service est peut-être encore référencé par des rendez-vous.' });
  }
});

module.exports = router;
