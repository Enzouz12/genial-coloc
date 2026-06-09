-- Schéma de la table des offres pour Génial Colloc.
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
  notes       text,
  created_at  bigint not null
);

-- Row Level Security activée, avec un accès partagé sans authentification.
-- Convient à un outil personnel à deux. La clé anon suffit pour lire/écrire.
alter table public.offers enable row level security;

create policy "acces partage" on public.offers
  for all
  using (true)
  with check (true);

-- Active la diffusion temps réel des changements sur la table.
alter publication supabase_realtime add table public.offers;
