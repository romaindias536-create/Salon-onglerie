const express = require('express');
const db = require('../db');
const { renderHome } = require('../pages/home');
const { renderBookingPage } = require('../pages/booking');
const { renderManagePage, notFoundPage } = require('../pages/manageAppointment');
const { renderLookupPage } = require('../pages/lookup');
const { normalizeCode } = require('../bookingCode');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    res.send(await renderHome());
  } catch (err) {
    next(err);
  }
});

router.get('/reserver', (req, res) => {
  res.send(renderBookingPage());
});

router.get('/mes-rendez-vous', (req, res) => {
  res.send(renderLookupPage());
});

router.get('/rdv/:code', async (req, res, next) => {
  try {
    const code = normalizeCode(req.params.code);
    const appt = await db.getAppointmentByCode(code);
    if (!appt) return res.status(404).send(notFoundPage());
    res.send(renderManagePage({ appt }));
  } catch (err) {
    next(err);
  }
});

router.post('/rdv/:code/cancel', async (req, res, next) => {
  try {
    const code = normalizeCode(req.params.code);
    const appt = await db.getAppointmentByCode(code);
    if (!appt) return res.status(404).send(notFoundPage());
    if (appt.status === 'confirmed') {
      await db.updateAppointmentByCode(code, { status: 'cancelled' });
    }
    const updated = await db.getAppointmentByCode(code);
    res.send(renderManagePage({ appt: updated, notice: { type: 'success', message: 'Votre rendez-vous a bien été annulé.' } }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
