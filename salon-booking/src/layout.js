const config = require('./config');
const icons = require('./icons');
const { escapeHtml } = require('./html');

const FONT_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,500italic&family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">';

function htmlShell({ title, description, bodyClass = '', extraHead = '', bodyHtml, extraScripts = '' }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description || config.description)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${FONT_LINK}
<link rel="stylesheet" href="/styles.css">
${extraHead}
</head>
<body class="${bodyClass}">
${bodyHtml}
${extraScripts}
</body>
</html>`;
}

function siteHeader(active) {
  const link = (href, label, key) =>
    `<a href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `
  <header class="site-header">
    <div class="site-header__bar">
      <a class="brand" href="/">
        <span class="brand__mark">${icons.sparkle(18)}</span>
        ${escapeHtml(config.salonName)}
      </a>
      <nav class="site-nav">
        <div class="site-nav__links">
          ${link('/#prestations', 'Prestations & tarifs', 'prestations')}
          ${link('/#horaires', 'Horaires & adresse', 'horaires')}
          ${link('/#contact', 'Contact', 'contact')}
          ${link('/mes-rendez-vous', 'Mon rendez-vous', 'mon-rdv')}
        </div>
        <a class="btn btn-primary btn-sm" href="/reserver">Prendre rendez-vous</a>
      </nav>
    </div>
  </header>`;
}

function siteFooter() {
  return `
  <footer class="site-footer" id="contact">
    <div class="container">
      <div class="site-footer__grid">
        <div>
          <h4>${escapeHtml(config.salonName)}</h4>
          <p>${escapeHtml(config.tagline)}</p>
          <div class="social-row">
            ${config.social.instagram ? `<a class="social-btn" href="${escapeHtml(config.social.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${icons.instagram(18)}</a>` : ''}
            ${config.social.facebook ? `<a class="social-btn" href="${escapeHtml(config.social.facebook)}" target="_blank" rel="noopener" aria-label="Facebook">${icons.facebook(18)}</a>` : ''}
          </div>
        </div>
        <div>
          <h4>Nous trouver</h4>
          <ul class="site-footer__links">
            <li><a href="${escapeHtml(config.address.mapsUrl)}" target="_blank" rel="noopener">${escapeHtml(config.address.line1)}<br>${escapeHtml(config.address.postalCode)} ${escapeHtml(config.address.city)}</a></li>
            <li><a href="tel:${escapeHtml(config.contact.phoneHref)}">${escapeHtml(config.contact.phone)}</a></li>
            <li><a href="mailto:${escapeHtml(config.contact.email)}">${escapeHtml(config.contact.email)}</a></li>
          </ul>
        </div>
        <div>
          <h4>Réservation</h4>
          <ul class="site-footer__links">
            <li><a href="/reserver">Prendre rendez-vous</a></li>
            <li><a href="/mes-rendez-vous">Modifier / annuler un rendez-vous</a></li>
            <li><a href="/#horaires">Horaires d'ouverture</a></li>
          </ul>
        </div>
      </div>
      <div class="site-footer__bottom">
        <span>© ${new Date().getFullYear()} ${escapeHtml(config.salonName)}</span>
        <a href="/admin">Espace pro</a>
      </div>
    </div>
  </footer>`;
}

function mobileCta() {
  return `
  <div class="mobile-cta">
    <a class="btn btn-primary" href="/reserver">Prendre rendez-vous</a>
  </div>`;
}

function publicLayout({ title, description, active, bodyHtml, extraHead, extraScripts, hideMobileCta }) {
  return htmlShell({
    title: `${title} — ${config.salonName}`,
    description,
    extraHead,
    bodyHtml: `
      ${siteHeader(active)}
      ${bodyHtml}
      ${siteFooter()}
      ${hideMobileCta ? '' : mobileCta()}
    `,
    extraScripts,
  });
}

/** Habillage minimal (parcours de réservation) : pas de header/footer complet,
 * juste une barre avec le nom du salon et un lien de sortie. */
function flowLayout({ title, description, bodyHtml, extraScripts, backHref = '/', backLabel = 'Retour au site' }) {
  return htmlShell({
    title: `${title} — ${config.salonName}`,
    description,
    bodyHtml: `
      <div class="booking-shell">
        <div class="booking-topbar">
          <a class="brand" href="${backHref}" style="font-size:1.05rem">
            <span class="brand__mark">${icons.sparkle(16)}</span>${escapeHtml(config.salonName)}
          </a>
          <a class="btn-text" href="${backHref}">${escapeHtml(backLabel)}</a>
        </div>
        ${bodyHtml}
      </div>
    `,
    extraScripts,
  });
}

const ADMIN_NAV = [
  { href: '/admin', key: 'agenda', label: 'Agenda', icon: 'calendar' },
  { href: '/admin/disponibilites', key: 'disponibilites', label: 'Disponibilités', icon: 'gauge' },
  { href: '/admin/prestations', key: 'prestations', label: 'Prestations', icon: 'scissors' },
];

function adminLayout({ title, active, bodyHtml, extraScripts }) {
  const nav = ADMIN_NAV.map(
    (item) =>
      `<a href="${item.href}"${active === item.key ? ' class="is-active"' : ''}>${icons[item.icon](17)}${item.label}</a>`
  ).join('');
  return htmlShell({
    title: `${title} — Espace pro`,
    bodyHtml: `
      <div class="admin-shell">
        <aside class="admin-sidebar">
          <div class="admin-sidebar__brand">
            ${escapeHtml(config.salonName)}
            <span>Espace pro</span>
          </div>
          <nav class="admin-nav">${nav}</nav>
          <div class="admin-sidebar__foot">
            <a href="/" target="_blank">${icons.arrowLeft(15)} Voir le site</a>
            <form method="post" action="/admin/logout" style="margin:0">
              <button type="submit" class="btn-text" style="color:#D9C9C6;padding:0;font-size:0.82rem;text-decoration:none;display:flex;align-items:center;gap:10px;background:none;border:none;cursor:pointer">${icons.logout(15)} Déconnexion</button>
            </form>
          </div>
        </aside>
        <div class="admin-main">${bodyHtml}</div>
      </div>
    `,
    extraScripts,
  });
}

module.exports = { htmlShell, publicLayout, flowLayout, adminLayout, siteHeader, siteFooter };
