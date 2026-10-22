-- Newsletter-Tabelle für die Portfolio-Seite (passend zu server/server.mjs)
-- Ausführen in Supabase: SQL Editor → New query → einfügen → Run

create table if not exists public.newsletter_subscribers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null unique,          -- der Server speichert sie immer kleingeschrieben
  consent      boolean not null default false,
  consented_at timestamptz,
  source       text default 'portfolio'
);

-- Row Level Security an, aber KEINE Policies:
-- Mit dem öffentlichen (publishable/anon) Key kann niemand lesen oder schreiben.
-- Nur der Node-Server mit dem Secret Key darf Einträge anlegen.
alter table public.newsletter_subscribers enable row level security;
