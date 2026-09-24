// Confirmation par e-mail (optionnelle) via l'API HTTP de Resend
// (https://resend.com — offre gratuite largement suffisante pour un
// salon). Sans RESEND_API_KEY, cette fonction ne fait rien silencieusement :
// la confirmation reste de toute façon affichée à l'écran et consultable
// via le lien /rdv/CODE.

const config = require('./config');
const { formatDateLong } = require('./time');

function isEnabled() {
  return Boolean(process.env.RESEND_API_KEY);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

async function sendBookingConfirmation(appt, { manageUrl }) {
  if (!isEnabled() || !appt.email) return { sent: false };
  const dateLabel = formatDateLong(appt.date);
  const subject = `Confirmation de votre rendez-vous — ${config.salonName}`;
  const html = `
    <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;color:#2E2024;">
      <h1 style="font-size:20px;font-weight:600;margin:0 0 16px;">${escapeHtml(config.salonName)}</h1>
      <p>Bonjour ${escapeHtml(appt.first_name)},</p>
      <p>Votre rendez-vous est confirmé :</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:4px 0;color:#6B5658;">Prestation</td><td style="padding:4px 0;text-align:right;">${escapeHtml(appt.service_name)}</td></tr>
        <tr><td style="padding:4px 0;color:#6B5658;">Date</td><td style="padding:4px 0;text-align:right;">${escapeHtml(dateLabel)}</td></tr>
        <tr><td style="padding:4px 0;color:#6B5658;">Heure</td><td style="padding:4px 0;text-align:right;">${escapeHtml(appt.start_time.slice(0, 5))}</td></tr>
        <tr><td style="padding:4px 0;color:#6B5658;">Code de réservation</td><td style="padding:4px 0;text-align:right;letter-spacing:2px;">${escapeHtml(appt.booking_code)}</td></tr>
      </table>
      <p>Pour modifier ou annuler ce rendez-vous à tout moment :</p>
      <p><a href="${manageUrl}" style="color:#8B4A5C;">${manageUrl}</a></p>
      <p style="margin-top:24px;color:#6B5658;font-size:13px;">${escapeHtml(config.address.line1)}, ${escapeHtml(config.address.postalCode)} ${escapeHtml(config.address.city)}<br>${escapeHtml(config.contact.phone)}</p>
    </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || `${config.salonName} <onboarding@resend.dev>`,
      to: appt.email,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('Échec envoi e-mail de confirmation:', res.status, text);
    return { sent: false };
  }
  return { sent: true };
}

module.exports = { isEnabled, sendBookingConfirmation };
