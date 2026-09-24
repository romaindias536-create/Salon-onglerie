(function () {
  'use strict';

  var DAY_NAMES = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  var MONTH_NAMES = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var MONTH_NAMES_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromISO(iso) {
    var parts = iso.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  function formatLong(iso) {
    var d = fromISO(iso);
    return DAY_NAMES_LONG()[d.getDay()] + ' ' + d.getDate() + ' ' + MONTH_NAMES_LONG[d.getMonth()];
  }
  function DAY_NAMES_LONG() { return ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']; }
  function money(n) {
    var v = Math.round(Number(n) * 100) / 100;
    var s = v % 1 === 0 ? String(v) : v.toFixed(2);
    return s + ' €';
  }
  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var state = { services: [], service: null, date: null, time: null };

  var els = {
    catTabs: document.getElementById('bookingCatTabs'),
    serviceList: document.getElementById('serviceList'),
    panelService: document.getElementById('panel-service'),
    panelDatetime: document.getElementById('panel-datetime'),
    panelInfo: document.getElementById('panel-info'),
    panelConfirm: document.getElementById('panel-confirm'),
    selectedServiceSummary: document.getElementById('selectedServiceSummary'),
    dateStrip: document.getElementById('dateStrip'),
    slotGrid: document.getElementById('slotGrid'),
    toStep3: document.getElementById('toStep3'),
    fullSummary: document.getElementById('fullSummary'),
    bookingForm: document.getElementById('bookingForm'),
    bookingError: document.getElementById('bookingError'),
    submitBtn: document.getElementById('submitBtn'),
    confirmSummary: document.getElementById('confirmSummary'),
    confirmCode: document.getElementById('confirmCode'),
    manageLink: document.getElementById('manageLink'),
    stepIndicator: document.getElementById('stepIndicator'),
  };

  function setStep(n) {
    [els.panelService, els.panelDatetime, els.panelInfo, els.panelConfirm].forEach(function (p, i) {
      p.hidden = i + 1 !== n;
    });
    if (els.stepIndicator) {
      els.stepIndicator.querySelectorAll('[data-step]').forEach(function (el) {
        var step = Number(el.dataset.step);
        el.classList.toggle('is-active', step === n);
        el.classList.toggle('is-done', step < n);
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('[data-back]').forEach(function (btn) {
    btn.addEventListener('click', function () { setStep(Number(btn.dataset.back)); });
  });

  // ------------------------------------------------------------- step 1

  function groupByCategory(services) {
    var order = [], map = {};
    services.forEach(function (s) {
      if (!map[s.category]) { map[s.category] = []; order.push(s.category); }
      map[s.category].push(s);
    });
    return order.map(function (c) { return { category: c, items: map[c] }; });
  }

  function renderServices() {
    var grouped = groupByCategory(state.services);
    els.catTabs.innerHTML = grouped.map(function (g, i) {
      return '<button type="button" data-cat="' + escapeHtml(g.category) + '" class="' + (i === 0 ? 'is-active' : '') + '">' + escapeHtml(g.category) + '</button>';
    }).join('');

    function renderList(category) {
      var group = grouped.filter(function (g) { return g.category === category; })[0];
      if (!group) return;
      els.serviceList.innerHTML = group.items.map(function (s) {
        return (
          '<button type="button" class="pick-card" data-id="' + s.id + '">' +
            '<div class="pick-card__row">' +
              '<span class="pick-card__name">' + escapeHtml(s.name) + '</span>' +
              '<span class="pick-card__price">' + money(s.price) + '</span>' +
            '</div>' +
            '<div class="pick-card__meta">' + s.duration_min + ' min</div>' +
            (s.description ? '<p class="pick-card__desc">' + escapeHtml(s.description) + '</p>' : '') +
          '</button>'
        );
      }).join('');
      els.serviceList.querySelectorAll('.pick-card').forEach(function (card) {
        card.addEventListener('click', function () {
          var svc = state.services.filter(function (s) { return s.id === card.dataset.id; })[0];
          selectService(svc);
        });
      });
    }

    if (grouped.length) renderList(grouped[0].category);
    els.catTabs.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        els.catTabs.querySelectorAll('button').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        renderList(btn.dataset.cat);
      });
    });
  }

  function selectService(svc) {
    state.service = svc;
    state.date = null;
    state.time = null;
    els.selectedServiceSummary.innerHTML =
      '<dl><dt>Prestation</dt><dd>' + escapeHtml(svc.name) + '</dd>' +
      '<dt>Durée</dt><dd>' + svc.duration_min + ' min</dd>' +
      '<dt>Prix</dt><dd>' + money(svc.price) + '</dd></dl>';
    buildDateStrip();
    els.slotGrid.innerHTML = '<p class="slot-empty">Choisissez une date pour voir les créneaux disponibles.</p>';
    els.toStep3.disabled = true;
    setStep(2);
  }

  // ------------------------------------------------------------- step 2

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
    els.dateStrip.innerHTML = html;
    els.dateStrip.querySelectorAll('.date-chip').forEach(function (chip) {
      chip.addEventListener('click', function () { selectDate(chip.dataset.date, chip); });
    });
  }

  function selectDate(iso, chipEl) {
    state.date = iso;
    state.time = null;
    els.toStep3.disabled = true;
    els.dateStrip.querySelectorAll('.date-chip').forEach(function (c) { c.classList.remove('is-selected'); });
    if (chipEl) chipEl.classList.add('is-selected');
    els.slotGrid.innerHTML = '<p class="slot-empty">Chargement des créneaux…</p>';
    fetch('/api/availability?date=' + iso + '&serviceId=' + encodeURIComponent(state.service.id))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.slots || !data.slots.length) {
          els.slotGrid.innerHTML = '<p class="slot-empty">Aucun créneau disponible ce jour-là. Essayez une autre date.</p>';
          return;
        }
        els.slotGrid.innerHTML = data.slots.map(function (t) {
          return '<button type="button" class="slot-btn" data-time="' + t + '">' + t + '</button>';
        }).join('');
        els.slotGrid.querySelectorAll('.slot-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            state.time = btn.dataset.time;
            els.slotGrid.querySelectorAll('.slot-btn').forEach(function (b) { b.classList.remove('is-selected'); });
            btn.classList.add('is-selected');
            els.toStep3.disabled = false;
          });
        });
      })
      .catch(function () {
        els.slotGrid.innerHTML = '<p class="slot-empty">Impossible de charger les créneaux. Réessayez.</p>';
      });
  }

  els.toStep3.addEventListener('click', function () {
    if (!state.service || !state.date || !state.time) return;
    els.fullSummary.innerHTML =
      '<dl>' +
      '<dt>Prestation</dt><dd>' + escapeHtml(state.service.name) + '</dd>' +
      '<dt>Date</dt><dd>' + formatLong(state.date) + '</dd>' +
      '<dt>Heure</dt><dd>' + state.time + '</dd>' +
      '<dt>Prix</dt><dd>' + money(state.service.price) + '</dd>' +
      '</dl>';
    setStep(3);
  });

  // ------------------------------------------------------------- step 3

  els.bookingForm.addEventListener('submit', function (e) {
    e.preventDefault();
    els.bookingError.innerHTML = '';
    var fd = new FormData(els.bookingForm);
    var payload = {
      serviceId: state.service.id,
      date: state.date,
      startTime: state.time,
      firstName: (fd.get('firstName') || '').trim(),
      lastName: (fd.get('lastName') || '').trim(),
      phone: (fd.get('phone') || '').trim(),
      email: (fd.get('email') || '').trim(),
      notes: (fd.get('notes') || '').trim(),
      website: fd.get('website') || '',
    };
    els.submitBtn.disabled = true;
    els.submitBtn.innerHTML = '<span class="spinner"></span> Confirmation en cours…';

    fetch('/api/booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (res) {
        if (!res.ok) {
          if (res.data && res.data.error === 'slot_unavailable') {
            els.bookingError.innerHTML = '<div class="alert alert-danger">' + escapeHtml(res.data.message) + '</div>';
            setStep(2);
            if (state.date) selectDate(state.date);
          } else {
            els.bookingError.innerHTML = '<div class="alert alert-danger">' + escapeHtml((res.data && res.data.message) || 'Une erreur est survenue.') + '</div>';
          }
          return;
        }
        var appt = res.data.appointment;
        els.confirmSummary.textContent = escapeHtml(appt.service_name) + ' — ' + formatLong(appt.date) + ' à ' + appt.start_time.slice(0, 5);
        els.confirmCode.textContent = appt.booking_code;
        els.manageLink.href = '/rdv/' + appt.booking_code;
        setStep(4);
      })
      .catch(function () {
        els.bookingError.innerHTML = '<div class="alert alert-danger">La connexion a échoué. Merci de réessayer.</div>';
      })
      .finally(function () {
        els.submitBtn.disabled = false;
        els.submitBtn.textContent = 'Confirmer la réservation';
      });
  });

  // ------------------------------------------------------------- init

  fetch('/api/services')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      state.services = data.services || [];
      if (!state.services.length) {
        els.serviceList.innerHTML = '<p class="slot-empty">Aucune prestation disponible pour le moment. Merci de nous contacter directement.</p>';
        return;
      }
      renderServices();

      var params = new URLSearchParams(window.location.search);
      var preselect = params.get('service');
      if (preselect) {
        var svc = state.services.filter(function (s) { return s.id === preselect; })[0];
        if (svc) selectService(svc);
      }
    })
    .catch(function () {
      els.serviceList.innerHTML = '<p class="slot-empty">Impossible de charger les prestations. Merci de recharger la page.</p>';
    });
})();
