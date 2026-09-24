const crypto = require('crypto');

// Alphabet sans caractères ambigus (pas de 0/O, 1/I/l).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Code de réservation lisible, ex. "K7P4XQ9R". */
function generateBookingCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

function normalizeCode(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

module.exports = { generateBookingCode, normalizeCode };
