(function () {
  'use strict';

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function errBox(id, message) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = '<div class="alert alert-danger">' + escapeHtml(message) + '</div>';
  }

  // =====================================================================
  // Agenda (dashboard)
  // =====================================================================
  var newApptBtn = document.getElementById('newApptBtn');
  if (newApptBtn) {
    var apptDialog = document.getElementById('apptDialog');
    var apptForm = document.getElementById('apptForm');
    var serviceSelect = document.getElementById('f-service');
    var freeSlotsEl = document.getElementById('freeSlots');
    var servicesCache = null;

    function fillServiceSelect(selectedId) {
      serviceSelect.innerHTML = servicesCache
        .map(function (s) {
          var label = s.name + ' — ' + s.duration_min + ' min' + (s.active ? '' : ' (masquée)');
          return '<option value="' + s.id + '"' + (s.id === selectedId ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
        })
        .join('');
    }

    function loadServices(selectedId) {
      if (servicesCache) {
        fillServiceSelect(selectedId);
        return Promise.resolve();
      }
      return fetch('/api/admin/services')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          servicesCache = data.services || [];
          fillServiceSelect(selectedId);
        });
    }

    function refreshFreeSlots() {
      var serviceId = serviceSelect.value;
      var date = document.getElementById('f-date').value;
      if (!serviceId || !date || !servicesCache) {
        freeSlotsEl.innerHTML = '';
        return;
      }
      var svc = servicesCache.filter(function (s) { return s.id === serviceId; })[0];
      if (!svc) return;
      var apptId = document.getElementById('f-id').value;
      var url = '/api/admin/availability?date=' + date + '&durationMin=' + svc.duration_min + (apptId ? '&excludeAppointmentId=' + apptId : '');
      freeSlotsEl.innerHTML = '<p class="hint">Chargement des créneaux libres…</p>';
      fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var slots = data.slots || [];
          if (!slots.length) {
            freeSlotsEl.innerHTML = '<p class="hint">Aucun créneau libre ce jour (horaires, blocage ou rendez-vous existant). Vous pouvez tout de même saisir une heure manuellement.</p>';
            return;
          }
          freeSlotsEl.innerHTML =
            '<p class="hint" style="margin-bottom:6px">Créneaux libres :</p><div class="slot-grid">' +
            slots.map(function (t) { return '<button type="button" class="slot-btn" data-time="' + t + '">' + t + '</button>'; }).join('') +
            '</div>';
          freeSlotsEl.querySelectorAll('.slot-btn').forEach(function (b) {
            b.addEventListener('click', function () {
              document.getElementById('f-time').value = b.dataset.time;
              freeSlotsEl.querySelectorAll('.slot-btn').forEach(function (x) { x.classList.remove('is-selected'); });
              b.classList.add('is-selected');
            });
          });
        })
        .catch(function () { freeSlotsEl.innerHTML = ''; });
    }

    serviceSelect.addEventListener('change', refreshFreeSlots);
    document.getElementById('f-date').addEventListener('change', refreshFreeSlots);

    newApptBtn.addEventListener('click', function () {
      apptForm.reset();
      document.getElementById('f-id').value = '';
      document.getElementById('apptDialogTitle').textContent = 'Nouveau rendez-vous';
      document.getElementById('statusField').hidden = true;
      document.getElementById('f-date').value = window.__ADMIN_DATE__ || '';
      document.getElementById('apptFormError').innerHTML = '';
      freeSlotsEl.innerHTML = '';
      loadServices(null).then(refreshFreeSlots);
      apptDialog.showModal();
    });

    document.querySelectorAll('.js-edit-appt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var appt = (window.__APPOINTMENTS__ || []).filter(function (a) { return a.id === btn.dataset.id; })[0];
        if (!appt) return;
        apptForm.reset();
        document.getElementById('f-id').value = appt.id;
        document.getElementById('apptDialogTitle').textContent = 'Modifier le rendez-vous';
        document.getElementById('statusField').hidden = false;
        document.getElementById('f-status').value = appt.status;
        document.getElementById('f-date').value = appt.date;
        document.getElementById('f-time').value = appt.start_time.slice(0, 5);
        document.getElementById('f-first').value = appt.first_name;
        document.getElementById('f-last').value = appt.last_name;
        document.getElementById('f-phone').value = appt.phone;
        document.getElementById('f-email').value = appt.email || '';
        document.getElementById('f-notes').value = appt.notes || '';
        document.getElementById('apptFormError').innerHTML = '';
        loadServices(appt.service_id).then(refreshFreeSlots);
        apptDialog.showModal();
      });
    });

    document.querySelectorAll('.js-cancel-appt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Annuler ce rendez-vous ?')) return;
        fetch('/api/admin/appointments/' + btn.dataset.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' }),
        }).then(function (r) { if (r.ok) window.location.reload(); else alert('Action impossible.'); });
      });
    });

    document.querySelectorAll('.js-delete-appt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer définitivement ce rendez-vous ? Cette action est irréversible.')) return;
        fetch('/api/admin/appointments/' + btn.dataset.id, { method: 'DELETE' })
          .then(function (r) { if (r.ok) window.location.reload(); else alert('Suppression impossible.'); });
      });
    });

    document.getElementById('apptDialogClose').addEventListener('click', function () { apptDialog.close(); });
    document.getElementById('apptCancelBtn').addEventListener('click', function () { apptDialog.close(); });

    apptForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = document.getElementById('f-id').value;
      var payload = {
        serviceId: serviceSelect.value,
        date: document.getElementById('f-date').value,
        startTime: document.getElementById('f-time').value,
        firstName: document.getElementById('f-first').value.trim(),
        lastName: document.getElementById('f-last').value.trim(),
        phone: document.getElementById('f-phone').value.trim(),
        email: document.getElementById('f-email').value.trim(),
        notes: document.getElementById('f-notes').value.trim(),
      };
      if (id) payload.status = document.getElementById('f-status').value;
      var url = id ? '/api/admin/appointments/' + id : '/api/admin/appointments';
      var method = id ? 'PATCH' : 'POST';
      var btn = document.getElementById('apptSubmitBtn');
      btn.disabled = true;
      fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
        .then(function (res) {
          if (!res.ok) {
            errBox('apptFormError', (res.data && res.data.message) || 'Une erreur est survenue.');
            btn.disabled = false;
            return;
          }
          window.location.reload();
        })
        .catch(function () { errBox('apptFormError', 'La connexion a échoué.'); btn.disabled = false; });
    });

    var includeCancelledEl = document.getElementById('includeCancelled');
    if (includeCancelledEl) {
      includeCancelledEl.addEventListener('change', function () {
        var url = new URL(window.location.href);
        if (includeCancelledEl.checked) url.searchParams.set('includeCancelled', '1');
        else url.searchParams.delete('includeCancelled');
        window.location.href = url.toString();
      });
    }
  }

  // =====================================================================
  // Disponibilités (horaires + blocages)
  // =====================================================================
  var saveHoursBtn = document.getElementById('saveHoursBtn');
  if (saveHoursBtn) {
    document.querySelectorAll('.js-closed-toggle').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var row = cb.closest('.hours-editor-row');
        row.querySelector('.js-open-time').disabled = cb.checked;
        row.querySelector('.js-close-time').disabled = cb.checked;
      });
    });

    saveHoursBtn.addEventListener('click', function () {
      var rows = document.querySelectorAll('#hoursEditor .hours-editor-row');
      var hours = [];
      rows.forEach(function (row) {
        hours.push({
          day_of_week: Number(row.dataset.day),
          is_closed: row.querySelector('.js-closed-toggle').checked,
          open_time: row.querySelector('.js-open-time').value,
          close_time: row.querySelector('.js-close-time').value,
        });
      });
      saveHoursBtn.disabled = true;
      fetch('/api/admin/hours', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hours: hours }) })
        .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
        .then(function (res) {
          var box = document.getElementById('hoursError');
          if (!res.ok) { errBox('hoursError', (res.data && res.data.message) || 'Erreur.'); return; }
          box.innerHTML = '<div class="alert alert-success">Horaires enregistrés.</div>';
        })
        .catch(function () { errBox('hoursError', 'La connexion a échoué.'); })
        .finally(function () { saveHoursBtn.disabled = false; });
    });
  }

  var alldayEl = document.getElementById('b-allday');
  if (alldayEl) {
    var timeRow = document.getElementById('blockTimeRow');
    alldayEl.addEventListener('change', function () { timeRow.hidden = alldayEl.checked; });
  }

  var blockForm = document.getElementById('blockForm');
  if (blockForm) {
    blockForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var payload = {
        date: document.getElementById('b-date').value,
        allDay: document.getElementById('b-allday').checked,
        startTime: document.getElementById('b-start').value,
        endTime: document.getElementById('b-end').value,
        reason: document.getElementById('b-reason').value.trim(),
      };
      fetch('/api/admin/blocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
        .then(function (res) {
          if (!res.ok) { errBox('blockFormError', (res.data && res.data.message) || 'Erreur.'); return; }
          window.location.reload();
        })
        .catch(function () { errBox('blockFormError', 'La connexion a échoué.'); });
    });
  }

  document.querySelectorAll('.js-delete-block').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!confirm('Supprimer ce blocage ?')) return;
      fetch('/api/admin/blocks/' + btn.dataset.id, { method: 'DELETE' })
        .then(function (r) { if (r.ok) window.location.reload(); });
    });
  });

  // =====================================================================
  // Prestations
  // =====================================================================
  var newServiceBtn = document.getElementById('newServiceBtn');
  if (newServiceBtn) {
    var serviceDialog = document.getElementById('serviceDialog');
    var serviceForm = document.getElementById('serviceForm');

    newServiceBtn.addEventListener('click', function () {
      serviceForm.reset();
      document.getElementById('s-id').value = '';
      document.getElementById('serviceDialogTitle').textContent = 'Nouvelle prestation';
      document.getElementById('s-active').checked = true;
      document.getElementById('serviceFormError').innerHTML = '';
      serviceDialog.showModal();
    });
    document.getElementById('serviceDialogClose').addEventListener('click', function () { serviceDialog.close(); });

    document.querySelectorAll('.js-edit-service').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var svc = (window.__SERVICES__ || []).filter(function (s) { return s.id === btn.dataset.id; })[0];
        if (!svc) return;
        document.getElementById('s-id').value = svc.id;
        document.getElementById('s-name').value = svc.name;
        document.getElementById('s-category').value = svc.category;
        document.getElementById('s-duration').value = svc.duration_min;
        document.getElementById('s-price').value = svc.price;
        document.getElementById('s-active').checked = !!svc.active;
        document.getElementById('s-description').value = svc.description || '';
        document.getElementById('serviceDialogTitle').textContent = 'Modifier la prestation';
        document.getElementById('serviceFormError').innerHTML = '';
        serviceDialog.showModal();
      });
    });

    document.querySelectorAll('.js-delete-service').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm("Supprimer définitivement cette prestation ? Les rendez-vous déjà pris avec cette prestation seront conservés.")) return;
        fetch('/api/admin/services/' + btn.dataset.id, { method: 'DELETE' })
          .then(function (r) { if (r.ok) window.location.reload(); else alert('Suppression impossible.'); });
      });
    });

    serviceForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = document.getElementById('s-id').value;
      var payload = {
        name: document.getElementById('s-name').value.trim(),
        category: document.getElementById('s-category').value.trim(),
        durationMin: Number(document.getElementById('s-duration').value),
        price: Number(document.getElementById('s-price').value),
        active: document.getElementById('s-active').checked,
        description: document.getElementById('s-description').value.trim(),
      };
      var url = id ? '/api/admin/services/' + id : '/api/admin/services';
      var method = id ? 'PATCH' : 'POST';
      fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
        .then(function (res) {
          if (!res.ok) { errBox('serviceFormError', (res.data && res.data.message) || 'Erreur.'); return; }
          window.location.reload();
        })
        .catch(function () { errBox('serviceFormError', 'La connexion a échoué.'); });
    });
  }
})();
