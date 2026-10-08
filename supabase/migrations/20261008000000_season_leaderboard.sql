-- Season leaderboard for Marquee Night.
-- Run this once in the Supabase SQL editor (or `supabase db push`).
--
-- Row-level security is on with no policies, so the public anon key used for
-- Realtime can't touch these tables. The app's API routes use the service
-- role key on the server and check the Clerk session themselves.

create table if not exists public.players (
  id          text primary key,              -- Clerk user id
  name        text not null,
  image_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.nights (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  room_code     text not null,
  host_id       text not null references public.players (id),
  created_at    timestamptz not null default now(),
  finalized_at  timestamptz                  -- set once results are in
);

-- One row per player per night. A row is created when the player joins from
-- their phone; the place and points are filled in when the night ends.
create table if not exists public.night_players (
  night_id    uuid not null references public.nights (id) on delete cascade,
  player_id   text not null references public.players (id) on delete cascade,
  joined_at   timestamptz not null default now(),
  team_name   text,
  place       int,
  team_score  int,
  correct     int,
  points      int,
  primary key (night_id, player_id)
);

create index if not exists night_players_player_idx on public.night_players (player_id);
create index if not exists nights_finalized_idx on public.nights (finalized_at desc);

alter table public.players enable row level security;
alter table public.nights enable row level security;
alter table public.night_players enable row level security;

-- Season standings: one row per player who has finished at least one night.
create or replace view public.leaderboard
with (security_invoker = true) as
select
  p.id,
  p.name,
  p.image_url,
  sum(np.points)::int                          as points,
  count(*)::int                                as nights,
  count(*) filter (where np.place = 1)::int    as wins,
  coalesce(sum(np.correct), 0)::int            as correct,
  max(n.finalized_at)                          as last_played
from public.players p
join public.night_players np on np.player_id = p.id
join public.nights n on n.id = np.night_id
where n.finalized_at is not null
  and np.points is not null
group by p.id, p.name, p.image_url;
