const icons = require('../../icons');
const { escapeHtml } = require('../../html');
const { adminLayout } = require('../../layout');
const { DAY_NAMES, formatDateLong } = require('../../time');

const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // lundi -> dimanche

function hoursRow(row) {
  const closed = !row || row.is_closed;
  const open = row && row.open_time ? row.open_time.slice(0, 5) : '09:30';
  const close = row && row.close_time ? row.close_time.slice(0, 5) : '19:00';
  return `
    <div class="hours-editor-row" data-day="${row.day_of_week}">
      <div style="text-transform:capitalize;font-weight:500">${escapeHtml(DAY_NAMES[row.day_of_week])}</div>
      <label class="checkbox-row" style="font-size:0.82rem;color:var(--ink-soft)">
        <input type="checkbox" class="js-closed-toggle" ${closed ? 'checked' : ''}> Fermé
      </label>
      <input type="time" class="js-open-time" value="${open}" ${closed ? 'disabled' : ''}>
      <input type="time" class="js-close-time" value="${close}" ${closed ? 'disabled' : ''}>
    </div>`;
}

function blockRow(b) {
  const range = b.all_day ? 'Toute la journée' : `${b.start_time.slice(0, 5)} – ${b.end_time.slice(0, 5)}`;
  return `
    <div class="agenda-row" style="grid-template-columns:1fr auto" data-id="${b.id}">
      <div>
        <div class="agenda-row__client">${escapeHtml(formatDateLong(b.date))}</div>
        <div class="agenda-row__service">${escapeHtml(range)}${b.reason ? ' — ' + escapeHtml(b.reason) : ''}</div>
      </div>
      <div class="agenda-row__actions">
        <button type="button" class="btn btn-ghost btn-sm js-delete-block" data-id="${b.id}">${icons.trash(15)}</button>
      </div>
    </div>`;
}

function renderAvailabilityPage({ hours, blocks }) {
  const byDay = new Map(hours.map((h) => [h.day_of_week, h]));
  const rows = DISPLAY_ORDER.map((d) => hoursRow(byDay.get(d) || { day_of_week: d, is_closed: true })).join('');
  const blockList = blocks.length ? blocks.map(blockRow).join('') : '<p class="empty-state">Aucun blocage à venir.</p>';

  const body = `
    <div class="admin-topbar"><h2 style="margin:0">Disponibilités</h2></div>
    <div class="admin-content">
      <div class="card" style="margin-bottom:24px">
        <h3>${icons.clock(18)} Horaires hebdomadaires</h3>
        <p style="color:var(--ink-soft);font-size:0.88rem">Ces horaires déterminent les créneaux proposés aux clientes sur le site.</p>
        <div id="hoursEditor">${rows}</div>
        <div id="hoursError"></div>
        <div class="step-actions">
          <span></span>
          <button type="button" class="btn btn-primary" id="saveHoursBtn">Enregistrer les horaires</button>
        </div>
      </div>

      <div class="card">
        <h3>${icons.ban(18)} Blocages ponctuels</h3>
        <p style="color:var(--ink-soft);font-size:0.88rem">Bloquez une journée ou une plage horaire (congé, formation, rendez-vous personnel...).</p>
        <form id="blockForm">
          <div class="form-row">
            <div class="form-field"><label for="b-date">Date</label><input id="b-date" type="date" name="date" required></div>
            <div class="form-field" style="align-self:end">
              <label class="checkbox-row"><input type="checkbox" id="b-allday" checked> Toute la journée</label>
            </div>
          </div>
          <div class="form-row" id="blockTimeRow" hidden>
            <div class="form-field"><label for="b-start">Début</label><input id="b-start" type="time" name="startTime"></div>
            <div class="form-field"><label for="b-end">Fin</label><input id="b-end" type="time" name="endTime"></div>
          </div>
          <div class="form-field"><label for="b-reason">Motif (facultatif)</label><input id="b-reason" type="text" name="reason" maxlength="200"></div>
          <div id="blockFormError"></div>
          <button type="submit" class="btn btn-outline">${icons.plus(16)} Ajouter le blocage</button>
        </form>
        <div style="margin-top:20px" id="blockList">${blockList}</div>
      </div>
    </div>
  `;

  return adminLayout({
    title: 'Disponibilités',
    active: 'disponibilites',
    bodyHtml: body,
    extraScripts: '<script src="/admin.js"></script>',
  });
}

module.exports = { renderAvailabilityPage };
