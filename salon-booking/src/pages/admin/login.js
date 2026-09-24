const { htmlShell } = require('../../layout');
const config = require('../../config');
const icons = require('../../icons');
const { escapeHtml } = require('../../html');

function renderLoginPage({ error, next } = {}) {
  const body = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--ink)">
      <div class="card" style="max-width:380px;width:100%;">
        <div style="text-align:center;margin-bottom:24px">
          <div style="width:52px;height:52px;border-radius:999px;background:var(--accent-tint);color:var(--accent-deep);display:flex;align-items:center;justify-content:center;margin:0 auto 14px">${icons.lock(22)}</div>
          <h2 style="margin-bottom:4px">Espace pro</h2>
          <p style="margin:0;color:var(--ink-soft)">${escapeHtml(config.salonName)}</p>
        </div>
        ${error ? `<div class="alert alert-danger">${escapeHtml(error)}</div>` : ''}
        <form method="post" action="/admin/login">
          <input type="hidden" name="next" value="${escapeHtml(next || '')}">
          <div class="form-field">
            <label for="pwd">Mot de passe</label>
            <input id="pwd" type="password" name="password" required autofocus autocomplete="current-password">
          </div>
          <button type="submit" class="btn btn-primary btn-block">Se connecter</button>
        </form>
      </div>
    </div>
  `;
  return htmlShell({ title: `Connexion — ${config.salonName}`, bodyHtml: body });
}

module.exports = { renderLoginPage };
