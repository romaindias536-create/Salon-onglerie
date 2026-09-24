const express = require('express');
const db = require('../db');
const config = require('../config');
const { renderLoginPage } = require('../pages/admin/login');
const { renderDashboard } = require('../pages/admin/dashboard');
const { renderAvailabilityPage } = require('../pages/admin/availability');
const { renderServicesPage } = require('../pages/admin/services');
const { checkPassword, issueSession, clearSession, isAdmin, requireAdminPage } = require('../auth');
const { isValidISODate, nowLocal, addDaysISO } = require('../time');

const router = express.Router();

router.get('/admin/login', (req, res) => {
  if (isAdmin(req)) return res.redirect('/admin');
  res.send(renderLoginPage({ next: req.query.next }));
});

router.post('/admin/login', (req, res) => {
  const password = (req.body || {}).password || '';
  const next = (req.body || {}).next || '/admin';
  if (!checkPassword(password)) {
    return res.status(401).send(renderLoginPage({ error: 'Mot de passe incorrect.', next }));
  }
  issueSession(res, req);
  res.redirect(next.startsWith('/') ? next : '/admin');
});

router.post('/admin/logout', (req, res) => {
  clearSession(res, req);
  res.redirect('/admin/login');
});

router.use('/admin', requireAdminPage);

async function computeStats() {
  const now = nowLocal();
  const weekEnd = addDaysISO(now.date, 6);
  const horizonEnd = addDaysISO(now.date, config.bookingHorizonDays);
  const [todayAppts, weekAppts, upcoming] = await Promise.all([
    db.listAppointmentsForDate(now.date),
    db.listAppointmentsBetween(now.date, weekEnd),
    db.listAppointmentsBetween(now.date, horizonEnd),
  ]);
  const next = upcoming.find((a) => a.date > now.date || (a.date === now.date && a.start_time.slice(0, 5) >= now.time)) || null;
  return { todayCount: todayAppts.length, weekCount: weekAppts.length, next };
}

router.get('/admin', async (req, res, next) => {
  try {
    const date = isValidISODate(req.query.date) ? req.query.date : nowLocal().date;
    const includeCancelled = req.query.includeCancelled === '1';
    const [appointments, stats] = await Promise.all([
      db.listAppointmentsForDate(date, { includeCancelled }),
      computeStats(),
    ]);
    res.send(renderDashboard({ date, appointments, stats, includeCancelled }));
  } catch (err) {
    next(err);
  }
});

router.get('/admin/disponibilites', async (req, res, next) => {
  try {
    const now = nowLocal();
    const [hours, blocks] = await Promise.all([db.listBusinessHours(), db.listBlocksFrom(now.date)]);
    res.send(renderAvailabilityPage({ hours, blocks }));
  } catch (err) {
    next(err);
  }
});

router.get('/admin/prestations', async (req, res, next) => {
  try {
    const services = await db.listServices();
    res.send(renderServicesPage({ services }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
