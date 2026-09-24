// Calcul des créneaux disponibles : horaires d'ouverture - blocages -
// rendez-vous déjà confirmés, avec un délai minimum avant l'heure actuelle.
// Tout est fait en minutes entières (pas d'objets Date) pour rester exact
// quel que soit le fuseau horaire du serveur d'hébergement.

const db = require('./db');
const config = require('./config');
const { timeToMinutes, minutesToTime, dayOfWeekFromISO, nowLocal } = require('./time');

function normTime(t) {
  return t ? t.slice(0, 5) : null;
}

/** Intervalles [début, fin[ en minutes depuis minuit qui rendent une
 * plage indisponible ce jour-là (blocages + rendez-vous confirmés). */
function busyIntervals({ blocks, appointments, excludeAppointmentId }) {
  const busy = [];
  for (const b of blocks || []) {
    if (b.all_day) {
      busy.push([0, 24 * 60]);
      continue;
    }
    const s = b.start_time ? timeToMinutes(normTime(b.start_time)) : 0;
    const e = b.end_time ? timeToMinutes(normTime(b.end_time)) : 24 * 60;
    busy.push([s, e]);
  }
  for (const a of appointments || []) {
    if (a.status !== 'confirmed') continue;
    if (excludeAppointmentId && a.id === excludeAppointmentId) continue;
    busy.push([timeToMinutes(normTime(a.start_time)), timeToMinutes(normTime(a.end_time))]);
  }
  return busy;
}

function overlaps(startMin, endMin, busy) {
  return busy.some(([s, e]) => startMin < e && endMin > s);
}

/** Liste des créneaux de départ ("HH:MM") permettant de caser une
 * prestation de `durationMin` minutes le `dateISO` donné. */
function computeAvailableSlots({ dateISO, durationMin, hoursRow, blocks, appointments, excludeAppointmentId }) {
  if (!hoursRow || hoursRow.is_closed || !hoursRow.open_time || !hoursRow.close_time) return [];
  const openMin = timeToMinutes(normTime(hoursRow.open_time));
  const closeMin = timeToMinutes(normTime(hoursRow.close_time));
  const busy = busyIntervals({ blocks, appointments, excludeAppointmentId });
  const step = config.slotStepMinutes;

  let earliestStart = openMin;
  const now = nowLocal();
  if (dateISO === now.date) {
    const minStart = timeToMinutes(now.time) + config.minLeadTimeMinutes;
    earliestStart = Math.max(earliestStart, Math.ceil(minStart / step) * step);
  } else if (dateISO < now.date) {
    return []; // jour déjà passé
  }

  const slots = [];
  for (let start = openMin; start + durationMin <= closeMin; start += step) {
    if (start < earliestStart) continue;
    const end = start + durationMin;
    if (!overlaps(start, end, busy)) slots.push(minutesToTime(start));
  }
  return slots;
}

/** Vérifie qu'un créneau précis est encore libre (revalidation au moment
 * de la réservation / modification, pour éviter les doubles réservations
 * en cas de requêtes simultanées — la contrainte d'exclusion en base est
 * le dernier rempart, ceci donne un message d'erreur clair avant d'y arriver). */
function isSlotStillValid({ dateISO, startTime, durationMin, hoursRow, blocks, appointments, excludeAppointmentId }) {
  if (!hoursRow || hoursRow.is_closed || !hoursRow.open_time || !hoursRow.close_time) {
    return { ok: false, reason: 'Le salon est fermé ce jour-là.' };
  }
  const openMin = timeToMinutes(normTime(hoursRow.open_time));
  const closeMin = timeToMinutes(normTime(hoursRow.close_time));
  const startMin = timeToMinutes(startTime);
  const endMin = startMin + durationMin;
  if (startMin < openMin || endMin > closeMin) {
    return { ok: false, reason: "Ce créneau sort des horaires d'ouverture." };
  }
  const now = nowLocal();
  if (dateISO < now.date || (dateISO === now.date && startMin < timeToMinutes(now.time) + config.minLeadTimeMinutes)) {
    return { ok: false, reason: 'Ce créneau est trop proche ou déjà passé.' };
  }
  const busy = busyIntervals({ blocks, appointments, excludeAppointmentId });
  if (overlaps(startMin, endMin, busy)) {
    return { ok: false, reason: "Ce créneau vient d'être réservé, merci d'en choisir un autre." };
  }
  return { ok: true };
}

/** Charge tout le nécessaire depuis la base et calcule les créneaux
 * disponibles pour une date + une durée donnée. */
async function getAvailableSlots(dateISO, durationMin, { excludeAppointmentId } = {}) {
  const [hoursRows, blocks, appointments] = await Promise.all([
    db.listBusinessHours(),
    db.listBlocksForDate(dateISO),
    db.listAppointmentsForDate(dateISO),
  ]);
  const dow = dayOfWeekFromISO(dateISO);
  const hoursRow = hoursRows.find((h) => h.day_of_week === dow) || null;
  return computeAvailableSlots({ dateISO, durationMin, hoursRow, blocks, appointments, excludeAppointmentId });
}

/** Même chargement, mais pour valider un créneau précis (booking / reprogrammation). */
async function checkSlot(dateISO, startTime, durationMin, { excludeAppointmentId } = {}) {
  const [hoursRows, blocks, appointments] = await Promise.all([
    db.listBusinessHours(),
    db.listBlocksForDate(dateISO),
    db.listAppointmentsForDate(dateISO),
  ]);
  const dow = dayOfWeekFromISO(dateISO);
  const hoursRow = hoursRows.find((h) => h.day_of_week === dow) || null;
  return isSlotStillValid({ dateISO, startTime, durationMin, hoursRow, blocks, appointments, excludeAppointmentId });
}

module.exports = {
  computeAvailableSlots,
  isSlotStillValid,
  getAvailableSlots,
  checkSlot,
};
