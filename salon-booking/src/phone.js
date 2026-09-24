// Normalisation des numéros de téléphone : on ne garde que les chiffres
// (et un éventuel "+" d'indicatif international en tête). Cela permet à une
// cliente de retrouver son rendez-vous même si elle retape son numéro avec
// une mise en forme différente de celle utilisée lors de la réservation
// ("06 12 34 56 78", "06.12.34.56.78", "0612345678"...).

function normalizePhone(raw) {
  const s = String(raw == null ? '' : raw).trim();
  const plus = s.startsWith('+') ? '+' : '';
  const digits = s.replace(/[^\d]/g, '');
  return plus + digits;
}

function isValidPhone(raw) {
  const normalized = normalizePhone(raw);
  const digitsOnly = normalized.replace(/^\+/, '');
  return digitsOnly.length >= 6 && digitsOnly.length <= 15;
}

/** Formatage lisible pour l'affichage (numéros français uniquement ; les
 * autres formats sont renvoyés tels quels, normalisés). */
function formatPhoneDisplay(raw) {
  const n = normalizePhone(raw);
  if (/^0\d{9}$/.test(n)) {
    return n.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  }
  if (/^\+33\d{9}$/.test(n)) {
    const rest = n.slice(3); // 9 chiffres, ex. "612345678"
    const grouped = `${rest[0]} ${rest.slice(1).replace(/(\d{2})(?=\d)/g, '$1 ')}`.trim();
    return `+33 ${grouped}`;
  }
  return n;
}

module.exports = { normalizePhone, isValidPhone, formatPhoneDisplay };
