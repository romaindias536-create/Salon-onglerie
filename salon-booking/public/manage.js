(function () {
  'use strict';
  if (!window.__APPT__) return;

  var DAY_NAMES = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  var MONTH_NAMES = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var DAY_NAMES_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MONTH_NAMES_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromISO(iso) { var p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function formatLong(iso) { var d = fromISO(iso); return DAY_NAMES_LONG[d.getDay()] + ' ' + d.getDate() + ' ' + MONTH_NAMES_LONG[d.getMonth()]; }
  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var code = window.__APPT__.code;
  var selected = { date: null, time: null };

  var toggleBtn = document.getElementById('toggleReschedule');
  var panel = document.getElementById('reschedulePanel');
  var dateStrip = document.getElementById('dateStrip');
  var slotGrid = document.getElementById('slotGrid');
  var confirmBtn = document.getElementById('confirmReschedule');
  var cancelBtn = document.getElementById('cancelReschedule');
  var errorBox = document.getElementById('rescheduleError');

  if (!toggleBtn) return;

  function buildDateStrip() {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var html = '';
    for (var i = 0; i < 30; i += 1) {
      var d = new Date(today);
      d.setDate(d.getDate() + i);
      var iso = toISO(d);
      html += '<button type="button" class="date-chip" data-date="' + iso + '">' +
        '<span class="date-chip__dow">' + DAY_NAMES[d.getDay()] + '</span>' +
        '<span class="date-chip__num">' + d.getDate() + '</span>' +
        '<span class="date-chip__dow">' + MONTH_NAMES[d.getMonth()] + '</span>' +
      '</button>';
    }
    dateStrip.innerHTML = html;
    dateStrip.querySelectorAll('.date-chip').forEach(function (chip) {
      chip.addEventListener('click', function () { selectDate(chip.dataset.date, chip); });
    });
  }

  function selectDate(iso, chipEl) {
    selected.date = iso;
    selected.time = null;
    confirmBtn.disabled = true;
    dateStrip.querySelectorAll('.date-chip').forEach(function (c) { c.classList.remove('is-selected'); });
    if (chipEl) chipEl.classList.add('is-selected');
    slotGrid.innerHTML = '<p class="slot-empty">Chargement…</p>';
    fetch('/api/booking/' + code + '/availability?date=' + iso)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.slots || !data.slots.length) {
          slotGrid.innerHTML = '<p class="slot-empty">Aucun créneau disponible ce jour-là.</p>';
          return;
        }
        slotGrid.innerHTML = data.slots.map(function (t) {
          return '<button type="button" class="slot-btn" data-time="' + t + '">' + t + '</button>';
        }).join('');
        slotGrid.querySelectorAll('.slot-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            selected.time = btn.dataset.time;
            slotGrid.querySelectorAll('.slot-btn').forEach(function (b) { b.classList.remove('is-selected'); });
            btn.classList.add('is-selected');
            confirmBtn.disabled = false;
          });
        });
      })
      .catch(function () {
        slotGrid.innerHTML = '<p class="slot-empty">Impossible de charger les créneaux.</p>';
      });
  }

  toggleBtn.addEventListener('click', function () {
    panel.hidden = !panel.hidden;
    if (!panel.hidden && !dateStrip.children.length) buildDateStrip();
  });
  cancelBtn.addEventListener('click', function () { panel.hidden = true; });

  confirmBtn.addEventListener('click', function () {
    if (!selected.date || !selected.time) return;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner"></span> Validation…';
    errorBox.innerHTML = '';
    fetch('/api/booking/' + code, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reschedule', date: selected.date, startTime: selected.time }),
    })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (res) {
        if (!res.ok) {
          errorBox.innerHTML = '<div class="alert alert-danger">' + escapeHtml((res.data && res.data.message) || 'Erreur') + '</div>';
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Valider le nouveau créneau';
          return;
        }
        var appt = res.data.appointment;
        document.getElementById('apptDate').textContent = formatLong(appt.date);
        document.getElementById('apptTime').textContent = appt.start_time.slice(0, 5) + ' – ' + appt.end_time.slice(0, 5);
        panel.hidden = true;
        var alertEl = document.createElement('div');
        alertEl.className = 'alert alert-success';
        alertEl.textContent = 'Votre rendez-vous a bien été déplacé.';
        panel.parentNode.insertBefore(alertEl, panel);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(function () {
        errorBox.innerHTML = '<div class="alert alert-danger">La connexion a échoué.</div>';
      })
      .finally(function () {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Valider le nouveau créneau';
      });
  });
})();
