begin;

create table public.song_wall (
  id uuid primary key default gen_random_uuid(),
  track_id text not null unique check (track_id ~ '^[A-Za-z0-9]{22}$'),
  link text not null check (link = 'https://open.spotify.com/track/' || track_id),
  cover text not null default '' check (char_length(cover) <= 2048),
  title text not null check (char_length(btrim(title)) between 1 and 300),
  artist text not null check (char_length(btrim(artist)) between 1 and 300),
  who text not null default 'Anonymous' check (char_length(btrim(who)) between 1 and 28),
  msg text not null default 'No explanation. Just trust me.'
    check (char_length(btrim(msg)) between 1 and 140),
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index song_wall_recent on public.song_wall (created_at desc, id desc)
  where visible;

alter table public.song_wall enable row level security;
revoke all on public.song_wall from anon, authenticated;
grant select on public.song_wall to anon, authenticated;
grant all on public.song_wall to service_role;

create policy "Visitors can read visible songs"
  on public.song_wall for select to anon, authenticated
  using (visible = true);

-- No public insert/update/delete policy: only the Edge Function may write.
-- A private attempt log limits anonymous traffic without storing visitor IPs.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.song_wall_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default clock_timestamp()
);
create index song_wall_requests_recent on private.song_wall_requests (created_at);
alter table private.song_wall_requests enable row level security;
revoke all on private.song_wall_requests from public, anon, authenticated;

-- Return seconds until another attempt is allowed, or 0 after reserving a slot.
-- The lock makes the limit hold across concurrent Edge Function instances.
create function public.reserve_song_wall_submission()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  checked_at timestamptz;
  recent_count integer;
  daily_count integer;
  first_recent timestamptz;
  first_daily timestamptz;
begin
  perform pg_catalog.pg_advisory_xact_lock(736641822);
  checked_at := pg_catalog.clock_timestamp();

  delete from private.song_wall_requests
    where created_at <= checked_at - interval '1 day';

  select count(*), min(created_at),
    count(*) filter (where created_at > checked_at - interval '1 minute'),
    min(created_at) filter (where created_at > checked_at - interval '1 minute')
  into daily_count, first_daily, recent_count, first_recent
  from private.song_wall_requests;

  -- Shared safety limits for this small public wall, not per-visitor quotas.
  if daily_count >= 200 then
    return greatest(1, ceil(extract(epoch from first_daily + interval '1 day' - checked_at))::integer);
  end if;
  if recent_count >= 20 then
    return greatest(1, ceil(extract(epoch from first_recent + interval '1 minute' - checked_at))::integer);
  end if;

  insert into private.song_wall_requests (created_at) values (checked_at);
  return 0;
end;
$$;

revoke all on function public.reserve_song_wall_submission() from public, anon, authenticated;
grant execute on function public.reserve_song_wall_submission() to service_role;

commit;
