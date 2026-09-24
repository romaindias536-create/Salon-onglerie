-- Schéma de la base de données du système de réservation.
-- À exécuter une seule fois dans l'éditeur SQL de votre projet Supabase
-- (Supabase > SQL Editor > New query > coller ce fichier > Run).
--
-- Toutes les tables ont la RLS (Row Level Security) activée SANS aucune
-- politique : cela bloque complètement l'accès via la clé publique "anon"
-- (donc depuis un navigateur) et n'autorise que la clé secrète
-- "service_role", utilisée uniquement par le serveur Node de cette
-- application. C'est ce qui rend la base sûre même si l'URL Supabase
-- venait à être connue.

create extension if not exists pgcrypto;   -- pour gen_random_uuid()
create extension if not exists btree_gist; -- pour la contrainte anti-chevauchement

-- --------------------------------------------------------------- services

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  duration_min integer not null check (duration_min > 0),
  price numeric(10,2) not null check (price >= 0),
  description text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table services enable row level security;

-- ---------------------------------------------------------- business_hours

-- day_of_week : 0 = dimanche, 1 = lundi, ... 6 = samedi (comme Date.getDay()
-- en JavaScript). Une ligne par jour ; is_closed=true si le salon est fermé
-- ce jour-là (open_time/close_time sont alors ignorés).
create table if not exists business_hours (
  day_of_week integer primary key check (day_of_week between 0 and 6),
  is_closed boolean not null default false,
  open_time time,
  close_time time
);

alter table business_hours enable row level security;

-- ------------------------------------------------------------------ blocks

-- Un blocage ponctuel décidé par la prothésiste (congé, formation,
-- rendez-vous personnel...). all_day=true bloque toute la journée ;
-- sinon start_time/end_time délimitent la plage bloquée.
create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  all_day boolean not null default true,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now(),
  constraint blocks_time_range check (
    all_day or (start_time is not null and end_time is not null and start_time < end_time)
  )
);

create index if not exists blocks_date_idx on blocks (date);

alter table blocks enable row level security;

-- ------------------------------------------------------------- appointments

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text,
  service_id uuid references services(id) on delete set null,
  service_name text not null,
  duration_min integer not null check (duration_min > 0),
  price numeric(10,2) not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  notes text,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  source text not null default 'client' check (source in ('client', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_range check (start_time < end_time),
  -- Période calculée (date + heures) utilisée par la contrainte
  -- anti-chevauchement ci-dessous.
  period tsrange generated always as (
    tsrange((date + start_time)::timestamp, (date + end_time)::timestamp, '[)')
  ) stored
);

create index if not exists appointments_date_idx on appointments (date);
create index if not exists appointments_code_idx on appointments (booking_code);
create index if not exists appointments_phone_idx on appointments (phone);

-- Garde-fou au niveau base de données : deux rendez-vous confirmés ne
-- peuvent jamais se chevaucher, même en cas de requêtes simultanées.
-- L'application revalide déjà la disponibilité avant l'écriture ; cette
-- contrainte est le dernier filet de sécurité, appliqué de façon atomique.
alter table appointments
  add constraint appointments_no_overlap
  exclude using gist (period with &&)
  where (status = 'confirmed');

alter table appointments enable row level security;

-- Maintient updated_at à jour automatiquement.
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists appointments_set_updated_at on appointments;
create trigger appointments_set_updated_at
  before update on appointments
  for each row execute function set_updated_at();

-- --------------------------------------------------------------- données de départ

insert into business_hours (day_of_week, is_closed, open_time, close_time) values
  (0, true,  null,    null),
  (1, true,  null,    null),
  (2, false, '09:30', '19:00'),
  (3, false, '09:30', '19:00'),
  (4, false, '09:30', '19:00'),
  (5, false, '09:30', '19:00'),
  (6, false, '09:00', '17:00')
on conflict (day_of_week) do nothing;

insert into services (name, category, duration_min, price, description, sort_order) values
  ('Pose complète gel', 'Manucure', 90, 45.00, 'Application d''un gel de couleur sur ongles naturels, forme et brillance sur mesure.', 10),
  ('Remplissage gel', 'Manucure', 75, 38.00, 'Entretien de votre pose gel existante.', 20),
  ('Semi-permanent — pose', 'Manucure', 45, 28.00, 'Vernis semi-permanent longue tenue sur ongles naturels.', 30),
  ('Semi-permanent — dépose et repose', 'Manucure', 60, 32.00, 'Retrait en douceur de l''ancien vernis puis nouvelle pose.', 40),
  ('Manucure classique', 'Manucure', 40, 25.00, 'Soin des mains, limage, cuticules et pose de vernis classique.', 50),
  ('Nail art personnalisé', 'Nail Art', 30, 15.00, 'Création sur mesure, à ajouter à une prestation manucure.', 60),
  ('French manucure', 'Nail Art', 15, 8.00, 'Liseré french sur une pose existante.', 70),
  ('Pédicure semi-permanent', 'Pédicure', 60, 40.00, 'Soin complet des pieds et pose semi-permanent.', 80),
  ('Pédicure spa', 'Pédicure', 75, 45.00, 'Bain, gommage, massage et pose au choix.', 90),
  ('Dépose', 'Dépose', 20, 10.00, 'Retrait d''un gel ou semi-permanent existant.', 100)
on conflict (name) do nothing;
