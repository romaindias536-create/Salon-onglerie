// Point d'entrée alternatif pour un déploiement sur Vercel (fonctions
// serverless). Non utilisé par un hébergement "process Node classique"
// (Render, Railway, un VPS...) qui exécute simplement server.js.
module.exports = require('../server');
