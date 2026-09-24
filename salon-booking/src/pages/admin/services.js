const icons = require('../../icons');
const { escapeHtml } = require('../../html');
const { adminLayout } = require('../../layout');

function money(n) {
  const v = Number(n);
  return `${v % 1 === 0 ? v : v.toFixed(2)} €`;
}

function serviceRow(s) {
  return `
    <tr data-id="${s.id}">
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.category)}</td>
      <td class="num">${s.duration_min} min</td>
      <td class="num">${money(s.price)}</td>
      <td>${s.active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-neutral">Masquée</span>'}</td>
      <td>
        <div class="agenda-row__actions">
          <button type="button" class="btn btn-ghost btn-sm js-edit-service" data-id="${s.id}">${icons.edit(15)}</button>
          <button type="button" class="btn btn-ghost btn-sm js-delete-service" data-id="${s.id}">${icons.trash(15)}</button>
        </div>
      </td>
    </tr>`;
}

function renderServicesPage({ services }) {
  const rows = services.length
    ? services.map(serviceRow).join('')
    : '<tr><td colspan="6" class="empty-state">Aucune prestation pour le moment.</td></tr>';

  const body = `
    <div class="admin-topbar">
      <h2 style="margin:0">Prestations</h2>
      <button type="button" class="btn btn-primary btn-sm" id="newServiceBtn">${icons.plus(16)} Nouvelle prestation</button>
    </div>
    <div class="admin-content">
      <p style="color:var(--ink-soft);font-size:0.88rem;margin-top:0">Une prestation « masquée » n'apparaît plus sur le site mais reste visible dans l'historique des rendez-vous déjà pris.</p>
      <table class="data-table">
        <thead><tr><th>Nom</th><th>Catégorie</th><th>Durée</th><th>Prix</th><th>Statut</th><th></th></tr></thead>
        <tbody id="servicesBody">${rows}</tbody>
      </table>
    </div>

    <dialog id="serviceDialog">
      <div class="dialog-body">
        <div class="dialog-head">
          <h3 id="serviceDialogTitle" style="margin:0">Nouvelle prestation</h3>
          <button type="button" class="dialog-close" id="serviceDialogClose">${icons.close(15)}</button>
        </div>
        <form id="serviceForm">
          <input type="hidden" name="id" id="s-id">
          <div class="form-field"><label for="s-name">Nom</label><input id="s-name" type="text" name="name" required maxlength="120"></div>
          <div class="form-row">
            <div class="form-field"><label for="s-category">Catégorie</label><input id="s-category" type="text" name="category" required maxlength="60" list="categoryOptions"></div>
            <div class="form-field"><label for="s-duration">Durée (minutes)</label><input id="s-duration" type="number" name="durationMin" min="5" step="5" required></div>
          </div>
          <div class="form-row">
            <div class="form-field"><label for="s-price">Prix (€)</label><input id="s-price" type="number" name="price" min="0" step="0.5" required></div>
            <div class="form-field" style="align-self:end">
              <label class="checkbox-row"><input type="checkbox" id="s-active" checked> Visible sur le site</label>
            </div>
          </div>
          <div class="form-field"><label for="s-description">Description (facultatif)</label><textarea id="s-description" name="description" maxlength="400"></textarea></div>
          <div id="serviceFormError"></div>
          <div class="step-actions">
            <span></span>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </dialog>
    <datalist id="categoryOptions">
      ${[...new Set(services.map((s) => s.category))].map((c) => `<option value="${escapeHtml(c)}">`).join('')}
    </datalist>
  `;

  return adminLayout({
    title: 'Prestations',
    active: 'prestations',
    bodyHtml: body,
    extraScripts: `<script>window.__SERVICES__ = ${JSON.stringify(services)};</script><script src="/admin.js"></script>`,
  });
}

module.exports = { renderServicesPage };
