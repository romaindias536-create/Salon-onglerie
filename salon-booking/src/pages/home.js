const db = require('../db');
const config = require('../config');
const icons = require('../icons');
const { escapeHtml } = require('../html');
const { publicLayout } = require('../layout');
const { nowLocal, DAY_NAMES } = require('../time');

const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // lundi -> dimanche

function money(n) {
  return `${Number(n).toFixed(2).replace(/\.00$/, '')} €`;
}

function groupByCategory(services) {
  const order = [];
  const map = new Map();
  for (const s of services) {
    if (!map.has(s.category)) {
      map.set(s.category, []);
      order.push(s.category);
    }
    map.get(s.category).push(s);
  }
  return order.map((cat) => ({ category: cat, items: map.get(cat) }));
}

function serviceRow(s) {
  return `
    <div class="service-row">
      <div>
        <div class="service-row__name">${escapeHtml(s.name)}</div>
        ${s.description ? `<p class="service-row__desc">${escapeHtml(s.description)}</p>` : ''}
      </div>
      <div class="service-row__duration">${icons.clock(14)} ${s.duration_min} min</div>
      <div class="service-row__price">${money(s.price)}</div>
    </div>`;
}

function hoursRows(hours) {
  const byDay = new Map(hours.map((h) => [h.day_of_week, h]));
  const today = nowLocal().dayOfWeek;
  return DISPLAY_ORDER.map((d) => {
    const row = byDay.get(d);
    const label = DAY_NAMES[d];
    const value = !row || row.is_closed ? 'Fermé' : `${row.open_time.slice(0, 5)} – ${row.close_time.slice(0, 5)}`;
    return `<tr class="${d === today ? 'is-today' : ''}"><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`;
  }).join('');
}

async function renderHome() {
  const [services, hours] = await Promise.all([
    db.listServices({ activeOnly: true }),
    db.listBusinessHours(),
  ]);
  const grouped = groupByCategory(services);
  const categories = grouped.map((g) => g.category);

  const tabs = categories
    .map((c, i) => `<button type="button" data-cat="${escapeHtml(c)}" class="${i === 0 ? 'is-active' : ''}">${escapeHtml(c)}</button>`)
    .join('');

  const panels = grouped
    .map(
      (g, i) => `<div class="service-list" data-panel="${escapeHtml(g.category)}" ${i === 0 ? '' : 'hidden'}>${g.items.map(serviceRow).join('')}</div>`
    )
    .join('');

  const body = `
    <section class="hero">
      <div class="container hero__grid">
        <div>
          <p class="eyebrow">${escapeHtml(config.tagline)}</p>
          <h1>Le soin de vos mains,<br>sans compromis.</h1>
          <p class="lede">${escapeHtml(config.description)}</p>
          <div class="hero__cta-row">
            <a class="btn btn-primary" href="/reserver">${icons.calendar(18)} Prendre rendez-vous</a>
            <a class="btn btn-ghost" href="#prestations">Voir les prestations</a>
          </div>
          <div class="hero__meta">
            <div><strong>4.9/5</strong>note moyenne des clientes</div>
            <div><strong>10 ans</strong>d'expertise ongulaire</div>
            <div><strong>100%</strong>matériel stérilisé</div>
          </div>
        </div>
        <div class="hero__art">
          <div class="hero__art-badge">
            ${icons.checkCircle(28)}
            <div>
              <strong>Réservation en ligne</strong>
              <span>Confirmation immédiate, modifiable à tout moment</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section>
      <div class="container">
        <div class="info-grid">
          <div class="card">
            <div class="info-card__icon">${icons.sparkle(20)}</div>
            <h3>Produits professionnels</h3>
            <p>Gels et vernis semi-permanents de marques reconnues, sélectionnés pour leur tenue et le respect de l'ongle naturel.</p>
          </div>
          <div class="card">
            <div class="info-card__icon">${icons.checkCircle(20)}</div>
            <h3>Hygiène irréprochable</h3>
            <p>Matériel stérilisé après chaque cliente et à usage unique dès que possible, dans le respect des normes en vigueur.</p>
          </div>
          <div class="card">
            <div class="info-card__icon">${icons.scissors(20)}</div>
            <h3>Savoir-faire précis</h3>
            <p>Un geste soigné et minutieux, à l'écoute de vos envies, pour un résultat net et durable.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="prestations">
      <div class="container">
        <div class="section-head">
          <div>
            <p class="eyebrow">Prestations & tarifs</p>
            <h2>Une carte pensée pour chaque envie</h2>
          </div>
          <a class="btn btn-outline" href="/reserver">Réserver une prestation</a>
        </div>
        <div class="category-tabs" role="tablist">${tabs}</div>
        ${panels}
        <p style="margin-top:18px;font-size:0.82rem;color:var(--ink-faint)">Tarifs indicatifs, susceptibles d'évoluer selon la longueur et l'état des ongles. Un devis est toujours proposé avant tout ajout.</p>
      </div>
    </section>

    <section id="horaires" style="background:var(--surface-alt)">
      <div class="container">
        <div class="section-head">
          <div>
            <p class="eyebrow">Infos pratiques</p>
            <h2>Horaires & adresse</h2>
          </div>
        </div>
        <div class="info-grid" style="grid-template-columns:1fr 1fr">
          <div class="card">
            <h3>${icons.clock(18)} Horaires d'ouverture</h3>
            <table class="hours-table"><tbody>${hoursRows(hours)}</tbody></table>
            <p style="margin-top:14px;font-size:0.85rem">${escapeHtml(config.hoursNote)}</p>
          </div>
          <div class="card">
            <h3>${icons.pin(18)} Nous trouver</h3>
            <p>${escapeHtml(config.address.line1)}<br>${escapeHtml(config.address.postalCode)} ${escapeHtml(config.address.city)}</p>
            <a class="btn btn-ghost btn-sm" href="${escapeHtml(config.address.mapsUrl)}" target="_blank" rel="noopener">Voir l'itinéraire ${icons.chevronRight(16)}</a>
            <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--line)">
              <h3 style="margin-bottom:8px">${icons.phone(18)} Téléphone</h3>
              <a class="btn-text" href="tel:${escapeHtml(config.contact.phoneHref)}">${escapeHtml(config.contact.phone)}</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="contact">
      <div class="container">
        <div class="card" style="background:linear-gradient(135deg, var(--accent) 0%, var(--accent-deep) 100%); color:#fff; padding:48px; text-align:center; border:none;">
          <p class="eyebrow" style="color:#F3E1E3">Contact & réseaux</p>
          <h2 style="color:#fff">Une question, une envie particulière ?</h2>
          <p style="color:#F3E1E3;max-width:52ch;margin:0 auto 24px">Écrivez-nous, appelez le salon ou suivez nos réalisations sur les réseaux — et retrouvez-nous en quelques clics pour votre prochain rendez-vous.</p>
          <div class="hero__cta-row" style="justify-content:center">
            <a class="btn" style="background:#fff;color:var(--accent-deep)" href="tel:${escapeHtml(config.contact.phoneHref)}">${icons.phone(18)} ${escapeHtml(config.contact.phone)}</a>
            <a class="btn" style="background:#fff;color:var(--accent-deep)" href="mailto:${escapeHtml(config.contact.email)}">${icons.mail(18)} E-mail</a>
            <a class="btn btn-primary" style="background:#2E2024" href="/reserver">Prendre rendez-vous</a>
          </div>
          <div class="social-row" style="justify-content:center;margin-top:28px">
            ${config.social.instagram ? `<a class="social-btn" style="background:rgba(255,255,255,0.16);color:#fff" href="${escapeHtml(config.social.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${icons.instagram(18)}</a>` : ''}
            ${config.social.facebook ? `<a class="social-btn" style="background:rgba(255,255,255,0.16);color:#fff" href="${escapeHtml(config.social.facebook)}" target="_blank" rel="noopener" aria-label="Facebook">${icons.facebook(18)}</a>` : ''}
          </div>
        </div>
      </div>
    </section>
  `;

  return publicLayout({
    title: `Manucure & beauté des ongles à ${config.address.city}`,
    description: config.description,
    active: 'home',
    bodyHtml: body,
    extraScripts: `<script>
      document.querySelectorAll('.category-tabs button').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.category-tabs button').forEach((b) => b.classList.remove('is-active'));
          document.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = true; });
          btn.classList.add('is-active');
          const panel = document.querySelector('[data-panel="' + CSS.escape(btn.dataset.cat) + '"]');
          if (panel) panel.hidden = false;
        });
      });
    </script>`,
  });
}

module.exports = { renderHome };
