const icons = require('../../icons');
const { escapeHtml } = require('../../html');
const { adminLayout } = require('../../layout');
const { formatDateLong, addDaysISO } = require('../../time');
const { formatPhoneDisplay } = require('../../phone');

function money(n) {
  const v = Number(n);
  return `${v % 1 === 0 ? v : v.toFixed(2)} €`;
}

function agendaRow(a) {
  const cancelled = a.status === 'cancelled';
  return `
    <div class="agenda-row" data-id="${a.id}" style="${cancelled ? 'opacity:0.55' : ''}">
      <div class="agenda-row__time">${a.start_time.slice(0, 5)}<span>${a.duration_min} min</span></div>
      <div>
        <div class="agenda-row__client">${escapeHtml(a.first_name)} ${escapeHtml(a.last_name)} · <a href="tel:${escapeHtml(a.phone)}" style="color:var(--ink-soft);text-decoration:none">${escapeHtml(formatPhoneDisplay(a.phone))}</a></div>
        <div class="agenda-row__service">${escapeHtml(a.service_name)} — ${money(a.price)} ${cancelled ? '<span class="badge badge-danger" style="margin-left:8px">Annulé</span>' : ''}</div>
        ${a.notes ? `<div class="agenda-row__notes">${icons.edit(12)} ${escapeHtml(a.notes)}</div>` : ''}
      </div>
      <div class="agenda-row__actions">
        <button type="button" class="btn btn-ghost btn-sm js-edit-appt" data-id="${a.id}">${icons.edit(15)}</button>
        ${!cancelled ? `<button type="button" class="btn btn-ghost btn-sm js-cancel-appt" data-id="${a.id}">${icons.ban(15)}</button>` : ''}
        <button type="button" class="btn btn-ghost btn-sm js-delete-appt" data-id="${a.id}">${icons.trash(15)}</button>
      </div>
    </div>`;
}

function renderDashboard({ date, appointments, stats, includeCancelled }) {
  const prev = addDaysISO(date, -1);
  const next = addDaysISO(date, 1);

  const list = appointments.length
    ? `<div class="agenda-list">${appointments.map(agendaRow).join('')}</div>`
    : `<div class="agenda-empty">Aucun rendez-vous ce jour-là.</div>`;

  const body = `
    <div class="admin-topbar">
      <div>
        <h2 style="margin:0">Agenda</h2>
      </div>
      <div class="day-nav">
        <a class="btn btn-ghost btn-sm" href="/admin?date=${prev}">${icons.chevronLeft(16)}</a>
        <span class="day-nav__label">${escapeHtml(formatDateLong(date))}</span>
        <a class="btn btn-ghost btn-sm" href="/admin?date=${next}">${icons.chevronRight(16)}</a>
        <a class="btn btn-outline btn-sm" href="/admin">Aujourd'hui</a>
      </div>
      <button type="button" class="btn btn-primary btn-sm" id="newApptBtn">${icons.plus(16)} Nouveau rendez-vous</button>
    </div>
    <div class="admin-content">
      <div class="stat-row">
        <div class="stat-card"><div class="stat-card__label">Aujourd'hui</div><div class="stat-card__value">${stats.todayCount}</div></div>
        <div class="stat-card"><div class="stat-card__label">Cette semaine</div><div class="stat-card__value">${stats.weekCount}</div></div>
        <div class="stat-card">
          <div class="stat-card__label">Prochain rendez-vous</div>
          <div class="stat-card__value" style="font-size:1.15rem">${stats.next ? `${escapeHtml(formatDateLong(stats.next.date))}, ${stats.next.start_time.slice(0, 5)}` : '—'}</div>
        </div>
      </div>

      <div class="checkbox-row" style="margin-bottom:16px">
        <input type="checkbox" id="includeCancelled" ${includeCancelled ? 'checked' : ''}>
        <label for="includeCancelled" style="margin:0;font-weight:400;font-size:0.85rem;color:var(--ink-soft)">Afficher les rendez-vous annulés</label>
      </div>

      ${list}
    </div>

    <dialog id="apptDialog">
      <div class="dialog-body">
        <div class="dialog-head">
          <h3 id="apptDialogTitle" style="margin:0">Nouveau rendez-vous</h3>
          <button type="button" class="dialog-close" id="apptDialogClose">${icons.close(15)}</button>
        </div>
        <form id="apptForm">
          <input type="hidden" name="id" id="f-id">
          <div class="form-field">
            <label for="f-service">Prestation</label>
            <select id="f-service" name="serviceId" required></select>
          </div>
          <div class="form-row">
            <div class="form-field"><label for="f-date">Date</label><input id="f-date" type="date" name="date" required></div>
            <div class="form-field"><label for="f-time">Heure</label><input id="f-time" type="time" name="startTime" required></div>
          </div>
          <div id="freeSlots" style="margin-bottom:14px"></div>
          <div class="form-row">
            <div class="form-field"><label for="f-first">Prénom</label><input id="f-first" type="text" name="firstName" required maxlength="60"></div>
            <div class="form-field"><label for="f-last">Nom</label><input id="f-last" type="text" name="lastName" required maxlength="60"></div>
          </div>
          <div class="form-row">
            <div class="form-field"><label for="f-phone">Téléphone</label><input id="f-phone" type="tel" name="phone" required maxlength="20"></div>
            <div class="form-field"><label for="f-email">E-mail</label><input id="f-email" type="email" name="email" maxlength="120"></div>
          </div>
          <div class="form-field" id="statusField" hidden>
            <label for="f-status">Statut</label>
            <select id="f-status" name="status">
              <option value="confirmed">Confirmé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
          <div class="form-field"><label for="f-notes">Notes</label><textarea id="f-notes" name="notes" maxlength="500"></textarea></div>
          <div id="apptFormError"></div>
          <div class="step-actions">
            <button type="button" class="btn-text" id="apptCancelBtn">Annuler</button>
            <button type="submit" class="btn btn-primary" id="apptSubmitBtn">Enregistrer</button>
          </div>
        </form>
      </div>
    </dialog>
  `;

  return adminLayout({
    title: 'Agenda',
    active: 'agenda',
    bodyHtml: body,
    extraScripts: `<script>window.__ADMIN_DATE__ = ${JSON.stringify(date)}; window.__APPOINTMENTS__ = ${JSON.stringify(appointments)};</script><script src="/admin.js"></script>`,
  });
}

module.exports = { renderDashboard };
