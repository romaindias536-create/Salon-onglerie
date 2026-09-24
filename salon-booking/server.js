const express = require('express');
const path = require('path');

const { parseCookies } = require('./src/auth');
const publicPages = require('./src/routes/publicPages');
const adminPages = require('./src/routes/adminPages');
const publicApi = require('./src/routes/publicApi');
const adminApi = require('./src/routes/adminApi');
const { htmlShell } = require('./src/layout');
const config = require('./src/config');

const app = express();

// Nécessaire pour que req.secure / req.protocol reflètent le HTTPS d'origine
// derrière un proxy d'hébergement (Vercel, Render, etc.).
app.set('trust proxy', 1);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(parseCookies);
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

app.use(publicPages);
app.use(adminPages);
app.use('/api', publicApi);
app.use('/api/admin', adminApi);

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'not_found', message: 'Route inconnue.' });
  }
  res.status(404).send(
    htmlShell({
      title: `Page introuvable — ${config.salonName}`,
      bodyHtml: `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center">
          <div>
            <h1 style="font-size:2rem">Page introuvable</h1>
            <p><a href="/" style="color:var(--accent)">Retour à l'accueil</a></p>
          </div>
        </div>`,
    })
  );
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api')) {
    const status = err.code === 'not_configured' ? 503 : 500;
    return res.status(status).json({
      error: 'server_error',
      message: err.code === 'not_configured' ? err.message : 'Une erreur inattendue est survenue.',
    });
  }
  res.status(500).send(
    htmlShell({
      title: `Erreur — ${config.salonName}`,
      bodyHtml: `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center">
          <div>
            <h1 style="font-size:2rem">Une erreur est survenue</h1>
            <p>${err.code === 'not_configured' ? "La base de données n'est pas encore configurée." : 'Merci de réessayer dans quelques instants.'}</p>
            <p><a href="/" style="color:var(--accent)">Retour à l'accueil</a></p>
          </div>
        </div>`,
    })
  );
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`${config.salonName} — serveur démarré sur http://localhost:${port}`);
  });
}

module.exports = app;
