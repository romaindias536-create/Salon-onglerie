# Système de réservation — Rose Ongles

Site de présentation + prise de rendez-vous en ligne + espace admin pour un
salon d'onglerie. Node.js/Express, HTML/CSS/JS sans framework front, base
de données Supabase (PostgreSQL).

## Ce que fait le site

- **Page d'accueil** : présentation du salon, prestations & tarifs, horaires,
  adresse, contact & réseaux sociaux, bouton « Prendre rendez-vous ».
- **Réservation en 3 étapes** (`/reserver`) : prestation → date & heure →
  coordonnées, avec confirmation immédiate et code de réservation.
- **Gestion autonome des rendez-vous** (`/rdv/CODE` et `/mes-rendez-vous`) :
  chaque cliente peut modifier l'heure ou annuler son rendez-vous elle-même.
- **Espace admin** (`/admin`, protégé par mot de passe) : agenda du jour,
  ajout/modification/suppression de rendez-vous, gestion des horaires
  d'ouverture, blocage de dates/créneaux, gestion des prestations.
- **Anti double-réservation** : vérifiée côté application *et* garantie au
  niveau de la base de données (un créneau ne peut jamais être pris deux fois,
  même en cas de réservations simultanées).
- **Confirmation par e-mail** (optionnelle) si vous activez Resend.

Tout est déjà écrit et prêt à déployer. Il reste deux étapes : créer la base
de données (Supabase) et mettre le site en ligne (Render, ou Vercel).
Comptez 15 minutes, aucune connaissance en programmation n'est requise —
suivez simplement les captures d'écran de chaque interface.

---

## 1. Créer la base de données (Supabase — gratuit)

1. Allez sur [supabase.com](https://supabase.com) → *Start your project* →
   créez un compte (gratuit) puis un nouveau projet (choisissez une région
   proche de la France, ex. `eu-central-1`). Notez le mot de passe de base
   de données que Supabase vous demande de choisir (vous n'en aurez pas
   besoin directement, mais gardez-le de côté).
2. Une fois le projet créé, ouvrez **SQL Editor** (menu de gauche) → **New
   query**.
3. Ouvrez le fichier [`supabase/schema.sql`](./supabase/schema.sql) de ce
   projet, copiez tout son contenu, collez-le dans l'éditeur SQL de Supabase,
   puis cliquez **Run**. Cela crée les tables, les règles de sécurité, et
   ajoute des prestations et horaires d'exemple (à modifier ensuite depuis
   l'espace admin).
4. Allez dans **Project Settings** (icône engrenage) → **API**. Notez deux
   valeurs, vous en aurez besoin à l'étape 3 :
   - **Project URL** (ex. `https://abcdefgh.supabase.co`)
   - **service_role key** (sous « Project API keys » — cliquez sur l'œil
     pour l'afficher). ⚠️ Cette clé est secrète : ne la partagez jamais,
     ne la mettez jamais dans du code visible publiquement (elle donne un
     accès complet à la base). Elle ne sera utilisée que comme variable
     d'environnement du serveur, jamais dans le navigateur.

## 2. Personnaliser les informations du salon

Ouvrez [`src/config.js`](./src/config.js) et modifiez le nom du salon,
l'adresse, le téléphone, l'e-mail et les liens Instagram/Facebook. C'est le
seul fichier à éditer pour ces informations (pas besoin de toucher au reste
du code). Les prestations, tarifs, horaires et blocages se gèrent ensuite
directement depuis l'espace admin (`/admin`), sans redéploiement.

## 3. Déployer le site (Render — gratuit pour démarrer)

Render fait tourner un vrai serveur Node.js en continu (contrairement à un
hébergement statique), ce qui convient parfaitement à cette application.

1. Créez un compte sur [render.com](https://render.com) (gratuit, possible
   avec GitHub).
2. Mettez ce dossier de projet sur GitHub (créez un nouveau dépôt, poussez
   le code) — ou utilisez le bouton d'import direct de Render si vous
   préférez déposer un zip.
3. Sur Render : **New** → **Web Service** → reliez votre dépôt GitHub.
4. Configuration :
   - **Runtime** : Node
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Plan** : Free
5. Dans l'onglet **Environment**, ajoutez ces variables (voir
   [`.env.example`](./.env.example) pour le détail de chacune) :

   | Variable | Valeur |
   |---|---|
   | `SUPABASE_URL` | l'URL notée à l'étape 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | la clé `service_role` notée à l'étape 1 |
   | `ADMIN_PASSWORD` | le mot de passe que la prothésiste utilisera pour se connecter à `/admin` |
   | `SESSION_SECRET` | une longue chaîne aléatoire (ex. générez-en une sur [1password.com/password-generator](https://1password.com/password-generator/) ou avec `openssl rand -hex 32`) |
   | `RESEND_API_KEY` *(facultatif)* | voir section 5 ci-dessous |
   | `EMAIL_FROM` *(facultatif)* | voir section 5 ci-dessous |

6. Cliquez **Create Web Service**. Au bout de 1 à 2 minutes, votre site est
   en ligne sur une adresse du type `https://rose-ongles.onrender.com`.
   Vous pouvez ensuite relier un nom de domaine personnel depuis les
   réglages Render (**Custom Domains**).

> **Note sur le plan gratuit** : un service Render gratuit se met en veille
> après 15 minutes sans visite, et met quelques secondes à se réveiller à la
> visite suivante. Pour un site toujours actif instantanément, passez au
> plan payant le moins cher de Render (quelques dollars/mois), ou déployez
> sur Vercel (voir alternative ci-dessous, sans mise en veille sur son offre
> gratuite).

### Alternative : déployer sur Vercel

Le projet inclut déjà `vercel.json` et `api/index.js` pour ce cas. Sur
[vercel.com](https://vercel.com) : **Add New** → **Project** → importez le
même dépôt GitHub → dans **Environment Variables**, ajoutez les mêmes
variables que ci-dessus → **Deploy**. Aucune configuration supplémentaire
n'est nécessaire.

## 4. Se connecter à l'espace admin

Rendez-vous sur `https://votre-site/admin`, connectez-vous avec le mot de
passe défini dans `ADMIN_PASSWORD`. Vous pourrez ensuite :

- consulter et gérer l'**agenda** jour par jour,
- ajuster les **horaires d'ouverture** et poser des **blocages** (congés,
  formations...),
- ajouter, modifier ou masquer des **prestations**.

Gardez ce mot de passe confidentiel : toute personne qui le connaît peut
gérer les rendez-vous du salon.

## 5. Confirmation par e-mail (facultatif)

Sans configuration, les clientes reçoivent quand même une confirmation à
l'écran avec un code et un lien personnel pour gérer leur rendez-vous — rien
n'est obligatoire ici. Pour en plus leur envoyer un e-mail automatique :

1. Créez un compte gratuit sur [resend.com](https://resend.com) (100
   e-mails/jour offerts).
2. Créez une clé API (**API Keys** → **Create API Key**) et ajoutez-la comme
   variable d'environnement `RESEND_API_KEY`.
3. Pour envoyer depuis votre propre adresse (ex. `reservation@votre-salon.fr`),
   suivez la vérification de domaine de Resend (**Domains**), puis renseignez
   `EMAIL_FROM=Rose Ongles <reservation@votre-salon.fr>`. Sans domaine
   vérifié, laissez `EMAIL_FROM` vide : les e-mails partiront d'une adresse
   Resend générique, ce qui fonctionne pour tester.

## Développement local

```bash
npm install
cp .env.example .env   # puis renseignez les valeurs
npm run dev             # démarre sur http://localhost:3000 avec rechargement automatique
```

## Structure du projet

```
server.js                  point d'entrée (Express)
src/config.js               informations du salon (à personnaliser)
src/db.js                    accès à Supabase (API REST PostgREST)
src/availability.js          calcul des créneaux disponibles
src/auth.js                  session admin (cookie signé, sans dépendance)
src/layout.js, src/icons.js  gabarit HTML & icônes du design
src/pages/                   pages rendues côté serveur
src/routes/                  routes Express (pages + API JSON)
public/                      CSS et JS chargés par le navigateur
supabase/schema.sql          schéma de base de données à exécuter une fois
```

## Sécurité — ce qui est déjà en place

- La base de données n'est accessible qu'au serveur (clé `service_role`),
  jamais depuis le navigateur : la sécurité des tables (RLS) bloque tout
  accès public direct.
- Un créneau ne peut jamais être doublement réservé, même en cas de
  réservations simultanées (contrainte au niveau de la base de données).
- L'espace admin est protégé par mot de passe et un cookie de session signé.
- Le lien personnel de gestion d'un rendez-vous (`/rdv/CODE`) utilise un
  code aléatoire à 8 caractères, difficile à deviner — comme la plupart des
  systèmes de réservation grand public (compagnies aériennes, restaurants...).

N'oubliez pas de choisir un `ADMIN_PASSWORD` et un `SESSION_SECRET` solides
et uniques, et de ne jamais les partager ni les publier.
