// Authentification admin minimaliste : un seul mot de passe (ADMIN_PASSWORD),
// une session portée par un cookie signé (HMAC-SHA256, sans état côté
// serveur — donc compatible avec un hébergement "serverless"). Pas de
// dépendance externe : cookies et signature sont faits à la main.

const crypto = require('crypto');

const COOKIE_NAME = 'salon_admin';
const SESSION_HOURS = 12;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 8) {
    throw new Error(
      "SESSION_SECRET manquant ou trop court : définissez une chaîne aléatoire longue dans les variables d'environnement."
    );
  }
  return s;
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function sign(payloadObj) {
  const payload = b64url(JSON.stringify(payloadObj));
  const mac = crypto.createHmac('sha256', secret()).update(payload).digest();
  return `${payload}.${b64url(mac)}`;
}

function verify(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, mac] = token.split('.');
  if (!payload || !mac) return null;
  let expectedMac;
  try {
    expectedMac = b64url(crypto.createHmac('sha256', secret()).update(payload).digest());
  } catch {
    return null;
  }
  const a = Buffer.from(mac);
  const b = Buffer.from(expectedMac);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!data || typeof data.exp !== 'number' || Date.now() > data.exp) return null;
  return data;
}

/** Compare le mot de passe fourni à ADMIN_PASSWORD, résistant aux attaques
 * temporelles (les deux valeurs sont hashées pour se ramener à une taille
 * fixe avant comparaison). */
function checkPassword(candidate) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  const a = crypto.createHash('sha256').update(String(candidate || '')).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Middleware : lit le cookie brut et alimente req.cookies (sans dépendance). */
function parseCookies(req, _res, next) {
  const header = req.headers.cookie;
  const jar = {};
  if (header) {
    for (const part of header.split(';')) {
      const idx = part.indexOf('=');
      if (idx === -1) continue;
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      if (!key) continue;
      try {
        jar[key] = decodeURIComponent(val);
      } catch {
        jar[key] = val;
      }
    }
  }
  req.cookies = jar;
  next();
}

function issueSession(res, req) {
  const token = sign({ role: 'admin', exp: Date.now() + SESSION_HOURS * 3600 * 1000 });
  res.setHeader(
    'Set-Cookie',
    [
      `${COOKIE_NAME}=${encodeURIComponent(token)}`,
      'HttpOnly',
      'Path=/',
      'SameSite=Lax',
      `Max-Age=${SESSION_HOURS * 3600}`,
      req.secure ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; ')
  );
}

function clearSession(res, req) {
  res.setHeader(
    'Set-Cookie',
    [`${COOKIE_NAME}=`, 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0', req.secure ? 'Secure' : '']
      .filter(Boolean)
      .join('; ')
  );
}

function isAdmin(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  return Boolean(verify(token));
}

/** Middleware protégeant les pages HTML admin : redirige vers /admin/login. */
function requireAdminPage(req, res, next) {
  if (!isAdmin(req)) {
    const next_ = encodeURIComponent(req.originalUrl || '/admin');
    return res.redirect(`/admin/login?next=${next_}`);
  }
  next();
}

/** Middleware protégeant les routes API admin : renvoie un 401 JSON. */
function requireAdminApi(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'unauthorized', message: 'Session admin expirée ou absente.' });
  }
  next();
}

module.exports = {
  COOKIE_NAME,
  parseCookies,
  checkPassword,
  issueSession,
  clearSession,
  isAdmin,
  requireAdminPage,
  requireAdminApi,
};
