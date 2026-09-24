const express = require('express');
const db = require('../db');
const availability = require('../availability');
const { generateBookingCode, normalizeCode } = require('../bookingCode');
const { isValidISODate, isValidTime, nowLocal, addDaysISO, minutesToTime, timeToMinutes } = require('../time');
const email = require('../email');
const config = require('../config');
const { normalizePhone, isValidPhone } = require('../phone');

const router = express.Router();

function badRequest(res, message) {
  return res.status(400).json({ error: 'bad_request', message });
}

function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str || ''));
}

function clean(str, max) {
  return String(str == null ? '' : str).trim().slice(0, max);
}

// ------------------------------------------------------------- GET /services

router.get('/services', async (req, res) => {
  try {
    const services = await db.listServices({ activeOnly: true });
    res.json({ services });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: "Impossible de charger les prestations pour le moment." });
  }
});

// ---------------------------------------------------------- GET /availability

router.get('/availability', async (req, res) => {
  const { date, serviceId } = req.query;
  if (!isValidISODate(date)) return badRequest(res, 'Date invalide.');
  if (!serviceId) return badRequest(res, 'Prestation manquante.');
  try {
    const service = await db.getService(serviceId);
    if (!service || !service.active) return badRequest(res, 'Cette prestation n\'est plus disponible.');
    const now = nowLocal();
    const horizon = addDaysISO(now.date, config.bookingHorizonDays);
    if (date < now.date || date > horizon) {
      return res.json({ slots: [] });
    }
    const slots = await availability.getAvailableSlots(date, service.duration_min);
    res.json({ slots, durationMin: service.duration_min });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'Impossible de calculer les disponibilités.' });
  }
});

// --------------------------------------------------------------- POST /booking

router.post('/booking', async (req, res) => {
  const body = req.body || {};
  // Piège à robots : ce champ doit rester vide pour un humain.
  if (clean(body.website, 200)) {
    return res.json({ ok: true }); // on fait semblant que tout va bien, sans rien créer
  }

  const serviceId = clean(body.serviceId, 100);
  const date = clean(body.date, 10);
  const startTime = clean(body.startTime, 5);
  const firstName = clean(body.firstName, 60);
  const lastName = clean(body.lastName, 60);
  const phone = normalizePhone(clean(body.phone, 30));
  const emailAddr = clean(body.email, 120);
  const notes = clean(body.notes, 500);

  if (!serviceId) return badRequest(res, 'Merci de choisir une prestation.');
  if (!isValidISODate(date) || !isValidTime(startTime)) return badRequest(res, 'Merci de choisir une date et une heure.');
  if (!firstName || !lastName) return badRequest(res, 'Merci de renseigner votre prénom et votre nom.');
  if (!isValidPhone(phone)) return badRequest(res, 'Numéro de téléphone invalide.');
  if (emailAddr && !isValidEmail(emailAddr)) return badRequest(res, 'Adresse e-mail invalide.');

  try {
    const service = await db.getService(serviceId);
    if (!service || !service.active) return badRequest(res, 'Cette prestation n\'est plus disponible.');

    const check = await availability.checkSlot(date, startTime, service.duration_min);
    if (!check.ok) return res.status(409).json({ error: 'slot_unavailable', message: check.reason });

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
          source: 'client',
        });
      } catch (err) {
        lastErr = err;
        // 23505 = code déjà pris (collision improbable) → on réessaie avec un nouveau code.
        // 23P01 = chevauchement détecté par la base (quelqu'un vient de prendre ce créneau).
        if (err.code === '23P01') {
          return res.status(409).json({
            error: 'slot_unavailable',
            message: "Ce créneau vient d'être réservé par quelqu'un d'autre, merci d'en choisir un autre.",
          });
        }
        if (err.code !== '23505') throw err;
      }
    }
    if (!appt) throw lastErr || new Error('Échec de création du rendez-vous.');

    const manageUrl = `${req.protocol}://${req.get('host')}/rdv/${appt.booking_code}`;
    email.sendBookingConfirmation(appt, { manageUrl }).catch((e) => console.error('email error', e));

    res.status(201).json({ appointment: appt, manageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: "La réservation n'a pas pu être enregistrée. Merci de réessayer." });
  }
});

// -------------------------------------------------------- GET /booking/:code

router.get('/booking/:code', async (req, res) => {
  const code = normalizeCode(req.params.code);
  try {
    const appt = await db.getAppointmentByCode(code);
    if (!appt) return res.status(404).json({ error: 'not_found', message: 'Rendez-vous introuvable.' });
    res.json({ appointment: appt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'Erreur serveur.' });
  }
});

// ---------------------------------------------- GET /booking/:code/availability

router.get('/booking/:code/availability', async (req, res) => {
  const code = normalizeCode(req.params.code);
  const { date } = req.query;
  if (!isValidISODate(date)) return badRequest(res, 'Date invalide.');
  try {
    const appt = await db.getAppointmentByCode(code);
    if (!appt) return res.status(404).json({ error: 'not_found', message: 'Rendez-vous introuvable.' });
    const now = nowLocal();
    const horizon = addDaysISO(now.date, config.bookingHorizonDays);
    if (date < now.date || date > horizon) return res.json({ slots: [] });
    const slots = await availability.getAvailableSlots(date, appt.duration_min, { excludeAppointmentId: appt.id });
    res.json({ slots, durationMin: appt.duration_min });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'Impossible de calculer les disponibilités.' });
  }
});

// ------------------------------------------------------ PATCH /booking/:code

router.patch('/booking/:code', async (req, res) => {
  const code = normalizeCode(req.params.code);
  const body = req.body || {};
  try {
    const appt = await db.getAppointmentByCode(code);
    if (!appt) return res.status(404).json({ error: 'not_found', message: 'Rendez-vous introuvable.' });
    if (appt.status === 'cancelled') {
      return badRequest(res, 'Ce rendez-vous est déjà annulé.');
    }

    if (body.action === 'cancel') {
      const updated = await db.updateAppointmentByCode(code, { status: 'cancelled' });
      return res.json({ appointment: updated });
    }

    if (body.action === 'reschedule') {
      const date = clean(body.date, 10);
      const startTime = clean(body.startTime, 5);
      if (!isValidISODate(date) || !isValidTime(startTime)) return badRequest(res, 'Date ou heure invalide.');

      const check = await availability.checkSlot(date, startTime, appt.duration_min, { excludeAppointmentId: appt.id });
      if (!check.ok) return res.status(409).json({ error: 'slot_unavailable', message: check.reason });

      const endTime = minutesToTime(timeToMinutes(startTime) + appt.duration_min);
      try {
        const updated = await db.updateAppointmentByCode(code, { date, start_time: startTime, end_time: endTime });
        return res.json({ appointment: updated });
      } catch (err) {
        if (err.code === '23P01') {
          return res.status(409).json({ error: 'slot_unavailable', message: "Ce créneau vient d'être pris, merci d'en choisir un autre." });
        }
        throw err;
      }
    }

    return badRequest(res, 'Action inconnue.');
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'Erreur serveur.' });
  }
});

// ------------------------------------------------------------------ POST /lookup

router.post('/lookup', async (req, res) => {
  const phone = normalizePhone(clean((req.body || {}).phone, 30));
  if (!isValidPhone(phone)) return badRequest(res, 'Numéro de téléphone invalide.');
  try {
    const now = nowLocal();
    const appts = await db.listUpcomingByPhone(phone, now.date);
    res.json({ appointments: appts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'Erreur serveur.' });
  }
});

module.exports = router;
