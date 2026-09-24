// Petites icônes SVG en ligne (trait fin, sans dépendance à une police
// d'icônes ni à un CDN). Chaque fonction renvoie une chaîne SVG prête à
// insérer dans le HTML.

const base = (inner, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

module.exports = {
  sparkle: (s) => base('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>', s),
  clock: (s) => base('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>', s),
  pin: (s) => base('<path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>', s),
  phone: (s) => base('<path d="M4 5c0 8.3 6.7 15 15 15l2-3.3a1.5 1.5 0 0 0-.8-2.1l-3.8-1.4a1.5 1.5 0 0 0-1.6.4l-1 1.2A11.4 11.4 0 0 1 8.2 9.2l1.2-1a1.5 1.5 0 0 0 .4-1.6L8.4 2.8A1.5 1.5 0 0 0 6.3 2L4 5Z"/>', s),
  mail: (s) => base('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>', s),
  check: (s) => base('<path d="M5 12.5 10 17l9-10"/>', s),
  checkCircle: (s) => base('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>', s),
  chevronRight: (s) => base('<path d="m9 6 6 6-6 6"/>', s),
  chevronLeft: (s) => base('<path d="m15 6-6 6 6 6"/>', s),
  chevronDown: (s) => base('<path d="m6 9 6 6 6-6"/>', s),
  calendar: (s) => base('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>', s),
  scissors: (s) => base('<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8.5 7.5 20 19M20 5 12 13M8.5 16.5 12 13"/>', s),
  instagram: (s) => base('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="0.6" fill="currentColor"/>', s),
  facebook: (s) => base('<path d="M14 21v-7h2.4l.4-3H14V9.2c0-.9.3-1.5 1.6-1.5H17V5.1C16.6 5 15.8 5 14.8 5 12.6 5 11 6.3 11 8.8V11H8.6v3H11v7h3Z"/>', s),
  plus: (s) => base('<path d="M12 5v14M5 12h14"/>', s),
  trash: (s) => base('<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 .7 12a1 1 0 0 0 1 1h6.6a1 1 0 0 0 1-1L17 7"/>', s),
  edit: (s) => base('<path d="M4 20h4.2L19 9.2a1.8 1.8 0 0 0 0-2.5l-1.7-1.7a1.8 1.8 0 0 0-2.5 0L4 15.8V20Z"/>', s),
  lock: (s) => base('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/>', s),
  logout: (s) => base('<path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M15 16l4-4-4-4M19 12H9"/>', s),
  gauge: (s) => base('<circle cx="12" cy="12" r="9"/><path d="M12 12 16 8M8 15a5 5 0 0 1 8-4"/>', s),
  ban: (s) => base('<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>', s),
  close: (s) => base('<path d="m6 6 12 12M18 6 6 18"/>', s),
  arrowLeft: (s) => base('<path d="M19 12H5M5 12l6-6M5 12l6 6"/>', s),
  search: (s) => base('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', s),
};
