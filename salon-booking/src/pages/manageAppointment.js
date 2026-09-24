const icons = require('../icons');
const { escapeHtml } = require('../html');
const { publicLayout } = require('../layout');
const { formatDateLong } = require('../time');
const { formatPhoneDisplay } = require('../phone');

function money(n) {
  const v = Number(n);
  return `${v % 1 === 0 ? v : v.toFixed(2)} €`;
}

function notFoundPage() {
  return publicLayout({
    title: 'Rendez-vous introuvable',
    bodyHtml: `
      <div class="booking-main container container-narrow" style="padding-top:80px;padding-bottom:80px">
        <div class="empty-state card">
          <h2>Rendez-vous introuvable</h2>
          <p>Le lien utilisé ne correspond à aucun rendez-vous, ou il a peut-être été mal copié.</p>
          <a class="btn btn-primary" href="/mes-rendez-vous">Retrouver mon rendez-vous</a>
        </div>
      </div>
    `,
  });
}

function noticeHtml(notice) {
  if (!notice) return '';
  const cls = notice.type === 'error' ? 'alert-danger' : 'alert-success';
  return `<div class="alert ${cls}">${escapeHtml(notice.message)}</div>`;
}

function renderManagePage({ appt, notice }) {
  const isConfirmed = appt.status === 'confirmed';
  const statusBadge = isConfirmed
    ? `<span class="badge badge-success">${icons.checkCircle(13)} Confirmé</span>`
    : `<span class="badge badge-danger">${icons.ban(13)} Annulé</span>`;

  const actions = isConfirmed
    ? `
      <div class="hero__cta-row">
        <button type="button" class="btn btn-outline" id="toggleReschedule">${icons.calendar(16)} Modifier l'heure</button>
        <form method="post" action="/rdv/${escapeHtml(appt.booking_code)}/cancel" onsubmit="return confirm('Confirmer l\\'annulation de ce rendez-vous ?');" style="display:inline">
          <button type="submit" class="btn btn-ghost">${icons.trash(16)} Annuler le rendez-vous</button>
        </form>
      </div>
      <div id="reschedulePanel" hidden style="margin-top:28px;padding-top:28px;border-top:1px solid var(--line)">
        <h3>Choisir un nouveau créneau</h3>
        <div class="date-strip" id="dateStrip"></div>
        <div class="slot-grid" id="slotGrid"><p class="slot-empty">Choisissez une date.</p></div>
        <div id="rescheduleError"></div>
        <div class="step-actions">
          <button type="button" class="btn-text" id="cancelReschedule">Annuler</button>
          <button type="button" class="btn btn-primary" id="confirmReschedule" disabled>Valider le nouveau créneau</button>
        </div>
      </div>
    `
    : `<p>Ce rendez-vous a été annulé. Vous pouvez en reprendre un nouveau quand vous le souhaitez.</p>
       <a class="btn btn-primary" href="/reserver">Prendre un nouveau rendez-vous</a>`;

  const body = `
    <div class="booking-main container container-narrow" style="padding-top:56px">
      ${noticeHtml(notice)}
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
          <div>
            <p class="eyebrow">Votre rendez-vous</p>
            <h2 style="margin-bottom:4px">${escapeHtml(appt.service_name)}</h2>
          </div>
          ${statusBadge}
        </div>
        <div class="summary-card" style="margin-top:8px">
          <dl>
            <dt>Date</dt><dd id="apptDate" data-date="${escapeHtml(appt.date)}">${escapeHtml(formatDateLong(appt.date))}</dd>
            <dt>Heure</dt><dd id="apptTime">${escapeHtml(appt.start_time.slice(0, 5))} – ${escapeHtml(appt.end_time.slice(0, 5))}</dd>
            <dt>Durée</dt><dd>${appt.duration_min} min</dd>
            <dt>Prix</dt><dd>${money(appt.price)}</dd>
            <dt>Cliente</dt><dd>${escapeHtml(appt.first_name)} ${escapeHtml(appt.last_name)}</dd>
            <dt>Téléphone</dt><dd>${escapeHtml(formatPhoneDisplay(appt.phone))}</dd>
            ${appt.notes ? `<dt>Votre demande</dt><dd>${escapeHtml(appt.notes)}</dd>` : ''}
          </dl>
        </div>
        <p class="hint" style="margin-bottom:20px">Code de réservation : <strong style="letter-spacing:1px">${escapeHtml(appt.booking_code)}</strong></p>
        ${actions}
      </div>
    </div>
  `;

  return publicLayout({
    title: 'Mon rendez-vous',
    hideMobileCta: true,
    bodyHtml: body,
    extraScripts: isConfirmed
      ? `<script>window.__APPT__ = ${JSON.stringify({ code: appt.booking_code, durationMin: appt.duration_min })};</script><script src="/manage.js"></script>`
      : '',
  });
}

module.exports = { renderManagePage, notFoundPage };
