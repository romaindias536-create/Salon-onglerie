const icons = require('../icons');
const { publicLayout } = require('../layout');

function renderLookupPage() {
  const body = `
    <div class="booking-main container container-narrow" style="padding-top:56px">
      <p class="eyebrow">Mon rendez-vous</p>
      <h2>Retrouver mon rendez-vous</h2>
      <p class="lede">Renseignez le numéro de téléphone utilisé lors de la réservation pour retrouver vos rendez-vous à venir.</p>
      <div class="card">
        <form id="lookupForm">
          <div class="form-field">
            <label for="lookupPhone">Numéro de téléphone</label>
            <input id="lookupPhone" type="tel" name="phone" required placeholder="06 12 34 56 78" autocomplete="tel">
          </div>
          <button type="submit" class="btn btn-primary" id="lookupBtn">${icons.search(16)} Rechercher</button>
        </form>
        <div id="lookupResults" style="margin-top:24px"></div>
      </div>
    </div>
  `;

  const script = `<script>
    (function () {
      var form = document.getElementById('lookupForm');
      var results = document.getElementById('lookupResults');
      var btn = document.getElementById('lookupBtn');
      function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
      var DOW = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
      var MO = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
      function fmt(iso) { var p = iso.split('-').map(Number); var d = new Date(p[0], p[1]-1, p[2]); return DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MO[d.getMonth()]; }
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var phone = document.getElementById('lookupPhone').value.trim();
        btn.disabled = true;
        results.innerHTML = '<p class="slot-empty">Recherche…</p>';
        fetch('/api/lookup', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ phone: phone }) })
          .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
          .then(function (res) {
            if (!res.ok) { results.innerHTML = '<div class="alert alert-danger">' + esc((res.data && res.data.message) || 'Erreur') + '</div>'; return; }
            var list = res.data.appointments || [];
            if (!list.length) {
              results.innerHTML = '<div class="alert alert-info">Aucun rendez-vous à venir trouvé pour ce numéro.</div>';
              return;
            }
            results.innerHTML = list.map(function (a) {
              return '<a class="pick-card" style="display:block;margin-bottom:10px" href="/rdv/' + encodeURIComponent(a.booking_code) + '">' +
                '<div class="pick-card__row"><span class="pick-card__name">' + esc(a.service_name) + '</span><span class="pick-card__price">' + esc(a.start_time.slice(0,5)) + '</span></div>' +
                '<div class="pick-card__meta">' + esc(fmt(a.date)) + '</div>' +
              '</a>';
            }).join('');
          })
          .catch(function () { results.innerHTML = '<div class="alert alert-danger">La connexion a échoué.</div>'; })
          .finally(function () { btn.disabled = false; });
      });
    })();
  </script>`;

  return publicLayout({
    title: 'Retrouver mon rendez-vous',
    hideMobileCta: false,
    bodyHtml: body,
    extraScripts: script,
  });
}

module.exports = { renderLookupPage };
