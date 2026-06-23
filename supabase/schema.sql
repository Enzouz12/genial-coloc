-- Schéma de la table des offres pour Génial Coloc.
-- À exécuter dans Supabase : SQL Editor > New query > Run.

create table if not exists public.offers (
  id          uuid primary key,
  url         text,
  title       text not null,
  price       integer not null,
  surface     integer,
  rooms       integer,
  location    text not null,
  lat         double precision not null,
  lng         double precision not null,
  transit_min integer,
  bike_min    integer,
  added_by    text,
  notes         text,
  status        text,
  interested_by text[],
  details       jsonb,
  created_at    bigint not null
);

-- Migration pour une base déjà créée (sans la colonne status) :
-- alter table public.offers add column if not exists status text;
-- Migration handshake (colocataires ayant validé leur intérêt) :
-- alter table public.offers add column if not exists interested_by text[];
-- Migration notes structurées (contacts, liens, date de visite) :
-- alter table public.offers add column if not exists details jsonb;

-- Row Level Security activée, avec un accès partagé sans authentification.
-- Convient à un outil personnel à deux. La clé anon suffit pour lire/écrire.
alter table public.offers enable row level security;

create policy "acces partage" on public.offers
  for all
  using (true)
  with check (true);

-- Active la diffusion temps réel des changements sur la table.
alter publication supabase_realtime add table public.offers;

-- ----------------------------------------------------------------------------
-- Stockage des médias d'annonces (images/vidéos des notes structurées).
-- Bucket PRIVÉ : l'app affiche via des URLs signées temporaires. À exécuter
-- une fois dans le SQL Editor pour activer la fonctionnalité.
-- ----------------------------------------------------------------------------
-- insert into storage.buckets (id, name, public, file_size_limit)
-- values ('offer-media', 'offer-media', false, 157286400)  -- 150 Mo
-- on conflict (id) do nothing;
-- (bucket déjà créé : relever la limite à 150 Mo pour les vidéos compressées)
-- update storage.buckets set file_size_limit = 157286400 where id = 'offer-media';
--
-- create policy "offer-media anon select" on storage.objects
--   for select to anon using (bucket_id = 'offer-media');
-- create policy "offer-media anon insert" on storage.objects
--   for insert to anon with check (bucket_id = 'offer-media');
-- create policy "offer-media anon delete" on storage.objects
--   for delete to anon using (bucket_id = 'offer-media');
