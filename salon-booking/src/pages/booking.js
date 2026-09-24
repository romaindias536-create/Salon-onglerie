const icons = require('../icons');
const { flowLayout } = require('../layout');

function renderBookingPage() {
  const body = `
    <div class="booking-main">
      <div class="container container-narrow">
        <div class="booking-steps" id="stepIndicator">
          <div class="booking-steps__step is-active" data-step="1"><span class="booking-steps__num">1</span>Prestation</div>
          <div class="booking-steps__sep"></div>
          <div class="booking-steps__step" data-step="2"><span class="booking-steps__num">2</span>Date & heure</div>
          <div class="booking-steps__sep"></div>
          <div class="booking-steps__step" data-step="3"><span class="booking-steps__num">3</span>Coordonnées</div>
        </div>

        <section class="booking-panel" id="panel-service">
          <h2>Choisissez votre prestation</h2>
          <div class="category-tabs" id="bookingCatTabs"></div>
          <div class="pick-list" id="serviceList"><p class="slot-empty">Chargement des prestations…</p></div>
        </section>

        <section class="booking-panel" id="panel-datetime" hidden>
          <button type="button" class="btn-text" data-back="1" style="margin-bottom:8px">${icons.arrowLeft(15)} Changer de prestation</button>
          <h2>Choisissez une date et une heure</h2>
          <div class="summary-card" id="selectedServiceSummary"></div>
          <div class="date-strip" id="dateStrip"></div>
          <div class="slot-grid" id="slotGrid"><p class="slot-empty">Choisissez une date pour voir les créneaux disponibles.</p></div>
          <div class="step-actions">
            <span></span>
            <button type="button" class="btn btn-primary" id="toStep3" disabled>Continuer ${icons.chevronRight(16)}</button>
          </div>
        </section>

        <section class="booking-panel" id="panel-info" hidden>
          <button type="button" class="btn-text" data-back="2" style="margin-bottom:8px">${icons.arrowLeft(15)} Changer la date</button>
          <h2>Vos coordonnées</h2>
          <div class="summary-card" id="fullSummary"></div>
          <form id="bookingForm" novalidate>
            <div class="form-row">
              <div class="form-field"><label for="f-first">Prénom *</label><input id="f-first" type="text" name="firstName" required maxlength="60" autocomplete="given-name"></div>
              <div class="form-field"><label for="f-last">Nom *</label><input id="f-last" type="text" name="lastName" required maxlength="60" autocomplete="family-name"></div>
            </div>
            <div class="form-row">
              <div class="form-field"><label for="f-phone">Téléphone *</label><input id="f-phone" type="tel" name="phone" required maxlength="20" autocomplete="tel" placeholder="06 12 34 56 78"></div>
              <div class="form-field"><label for="f-email">E-mail</label><input id="f-email" type="email" name="email" maxlength="120" autocomplete="email" placeholder="pour la confirmation (facultatif)"></div>
            </div>
            <div class="form-field">
              <label for="f-notes">Une demande particulière ?</label>
              <textarea id="f-notes" name="notes" maxlength="500" placeholder="Forme, couleur, allergie, photo d'inspiration en tête..."></textarea>
            </div>
            <div class="visually-hidden" aria-hidden="true">
              <label for="f-website">Ne pas remplir</label>
              <input id="f-website" type="text" name="website" tabindex="-1" autocomplete="off">
            </div>
            <div id="bookingError"></div>
            <button type="submit" class="btn btn-primary btn-block" id="submitBtn">Confirmer la réservation</button>
            <p class="hint" style="text-align:center;margin-top:10px">Vous pourrez modifier ou annuler ce rendez-vous à tout moment via un lien personnel.</p>
          </form>
        </section>

        <section class="booking-panel" id="panel-confirm" hidden>
          <div class="confirm-hero">
            <div class="confirm-hero__icon">${icons.check(30)}</div>
            <h2>Rendez-vous confirmé</h2>
            <p id="confirmSummary"></p>
            <div class="code-pill" id="confirmCode"></div>
            <p class="hint">Ce code identifie votre rendez-vous. Gardez-le, ou enregistrez le lien ci-dessous, pour le modifier ou l'annuler facilement.</p>
            <div class="hero__cta-row" style="justify-content:center;margin-top:20px">
              <a class="btn btn-outline" id="manageLink" href="#">Gérer mon rendez-vous</a>
              <a class="btn btn-ghost" href="/">Retour à l'accueil</a>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;

  return flowLayout({
    title: 'Prendre rendez-vous',
    description: 'Réservez votre prestation en quelques clics.',
    bodyHtml: body,
    extraScripts: '<script src="/booking.js"></script>',
  });
}

module.exports = { renderBookingPage };
