// Utilitaires date/heure "à la française" — tout est manipulé comme du
// texte (YYYY-MM-DD et HH:MM) plutôt que via des objets Date, pour éviter
// tout décalage de fuseau horaire entre le serveur (souvent en UTC) et le
// salon (Europe/Paris). Les seules fois où l'on touche à un vrai fuseau,
// c'est pour déterminer "quelle heure est-il au salon en ce moment".

const config = require('./config');

const DAY_NAMES = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
];
const MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** Renvoie {date:'YYYY-MM-DD', time:'HH:MM', dayOfWeek:0-6} pour "maintenant"
 * dans le fuseau du salon, quel que soit le fuseau du serveur d'hébergement. */
function nowLocal() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute === '24' ? '00' : parts.minute}`;
  return { date, time, dayOfWeek: dayOfWeekFromISO(date) };
}

/** Jour de semaine (0=dimanche..6=samedi) d'une date 'YYYY-MM-DD', calculé
 * sans passer par un Date construit en local time (évite tout décalage). */
function dayOfWeekFromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  // Algorithme de Zeller-like via Date.UTC : sans heure, donc pas de décalage TZ.
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  return utcDate.getUTCDay();
}

function isValidISODate(str) {
  return typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str) && !Number.isNaN(Date.parse(str + 'T00:00:00Z'));
}

function isValidTime(str) {
  return typeof str === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(str);
}

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addDaysISO(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
}

/** Compare deux dates ISO : -1, 0, 1 */
function compareISO(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Formatage lisible : "mardi 30 septembre 2026" */
function formatDateLong(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dow = dayOfWeekFromISO(iso);
  return `${DAY_NAMES[dow]} ${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

/** Formatage court : "30 sept." */
function formatDateShort(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${parseInt(d, 10)} ${MONTH_NAMES[m - 1].slice(0, 4).replace(/\.?$/, '.')}`;
}

module.exports = {
  DAY_NAMES,
  MONTH_NAMES,
  nowLocal,
  dayOfWeekFromISO,
  isValidISODate,
  isValidTime,
  timeToMinutes,
  minutesToTime,
  addDaysISO,
  compareISO,
  formatDateLong,
  formatDateShort,
};
