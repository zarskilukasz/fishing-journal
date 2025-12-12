/*
  migration: create fishing journal mvp schema (rls-first)
  timestamp (utc): 2025-12-12 14:13:38

  purpose:
  - create core tables for the fishing journal mvp (multi-user from day 1)
  - enforce invariants with constraints and triggers (no cross-user equipment linking)
  - enable row level security (rls) on every new table and define granular policies
  - define supabase storage bucket convention and rls policies for catch photos

  touched objects:
  - extensions: pgcrypto
  - tables: public.fish_species, public.rods, public.lures, public.groundbaits,
            public.trips, public.catches, public.trip_rods, public.trip_lures,
            public.trip_groundbaits, public.weather_snapshots, public.weather_hours
  - indexes: per db-plan (dashboard/filtering + equipment + junction lookups)
  - functions/triggers:
    - public.update_updated_at_column()
    - public.check_catch_owner_consistency()
    - public.check_trip_equipment_owner()
    - public.fill_snapshots_for_catches()
    - public.fill_snapshots_for_trip_equipment()
  - rls: enabled + forced on all new tables
  - rls policies: one policy per action (select/insert/update/delete) and per role (anon/authenticated)
  - storage: bucket row + policies on storage.objects for catch-photos

  special notes:
  - all sql is intentionally written in lower-case (including comments) to match project conventions.
  - destructive commands are avoided; policy re-creates are done with drop policy if exists.
*/

-- ---------------------------------------------------------------------------
-- 0) extensions
-- ---------------------------------------------------------------------------
-- pgcrypto provides gen_random_uuid() used as the default primary key generator.
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1) tables
-- ---------------------------------------------------------------------------

-- 1.1) fish_species (global dictionary; app-managed as read-only)
create table if not exists public.fish_species (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

comment on table public.fish_species is 'global dictionary of fish species (managed by migrations; read-only for app users)';
comment on column public.fish_species.name is 'unique species name';

create unique index if not exists fish_species_name_unique
  on public.fish_species (lower(name));

-- 1.2) rods (user equipment; soft-delete via deleted_at)
create table if not exists public.rods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.rods is 'user-owned rods; soft-delete via deleted_at';

-- uniqueness per user for active records only (soft-deleted rows do not block re-using the name)
create unique index if not exists rods_user_name_unique
  on public.rods (user_id, lower(name))
  where deleted_at is null;

create index if not exists idx_rods_user_active
  on public.rods (user_id)
  where deleted_at is null;

-- 1.3) lures (user equipment; soft-delete via deleted_at)
create table if not exists public.lures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.lures is 'user-owned lures; soft-delete via deleted_at';

create unique index if not exists lures_user_name_unique
  on public.lures (user_id, lower(name))
  where deleted_at is null;

create index if not exists idx_lures_user_active
  on public.lures (user_id)
  where deleted_at is null;

-- 1.4) groundbaits (user equipment; soft-delete via deleted_at)
create table if not exists public.groundbaits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.groundbaits is 'user-owned groundbaits; soft-delete via deleted_at';

create unique index if not exists groundbaits_user_name_unique
  on public.groundbaits (user_id, lower(name))
  where deleted_at is null;

create index if not exists idx_groundbaits_user_active
  on public.groundbaits (user_id)
  where deleted_at is null;

-- 1.5) trips (fishing trips; soft-delete via deleted_at)
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  status text not null default 'active',
  location_lat double precision,
  location_lng double precision,
  location_label text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint trips_status_check
    check (status in ('draft', 'active', 'closed')),
  constraint trips_ended_after_started
    check (ended_at is null or ended_at >= started_at),
  constraint trips_closed_requires_ended
    check (status <> 'closed' or ended_at is not null),
  constraint trips_location_both_or_none
    check ((location_lat is null) = (location_lng is null))
);

comment on table public.trips is 'user-owned fishing trips';

create index if not exists idx_trips_user_started
  on public.trips (user_id, started_at desc)
  where deleted_at is null;

create index if not exists idx_trips_user_status
  on public.trips (user_id, status)
  where deleted_at is null;

-- 1.6) catches (fish catches within a trip)
create table if not exists public.catches (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  caught_at timestamptz not null,
  species_id uuid not null references public.fish_species(id),
  lure_id uuid not null references public.lures(id),
  groundbait_id uuid not null references public.groundbaits(id),
  lure_name_snapshot text not null,
  groundbait_name_snapshot text not null,
  weight_g integer,
  length_mm integer,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint catches_weight_positive
    check (weight_g is null or weight_g > 0),
  constraint catches_length_positive
    check (length_mm is null or length_mm > 0)
);

comment on table public.catches is 'fish caught (trophies) within a trip';
comment on column public.catches.lure_name_snapshot is 'immutable snapshot of lure name at insert time';
comment on column public.catches.groundbait_name_snapshot is 'immutable snapshot of groundbait name at insert time';
comment on column public.catches.weight_g is 'weight in grams';
comment on column public.catches.length_mm is 'length in millimeters';
comment on column public.catches.photo_path is 'path inside supabase storage bucket (catch-photos)';

create index if not exists idx_catches_trip_caught
  on public.catches (trip_id, caught_at);

create index if not exists idx_catches_species
  on public.catches (species_id);

-- 1.7) trip_rods (junction: rods used on a trip; snapshot preserves historical name)
create table if not exists public.trip_rods (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  rod_id uuid not null references public.rods(id),
  rod_name_snapshot text not null,
  created_at timestamptz not null default now(),

  constraint trip_rods_unique unique (trip_id, rod_id)
);

comment on table public.trip_rods is 'junction table: rods assigned to a trip (multi-select)';

create index if not exists idx_trip_rods_trip
  on public.trip_rods (trip_id);

-- 1.8) trip_lures (junction: lures used on a trip)
create table if not exists public.trip_lures (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  lure_id uuid not null references public.lures(id),
  lure_name_snapshot text not null,
  created_at timestamptz not null default now(),

  constraint trip_lures_unique unique (trip_id, lure_id)
);

comment on table public.trip_lures is 'junction table: lures assigned to a trip (multi-select)';

create index if not exists idx_trip_lures_trip
  on public.trip_lures (trip_id);

-- 1.9) trip_groundbaits (junction: groundbaits used on a trip)
create table if not exists public.trip_groundbaits (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  groundbait_id uuid not null references public.groundbaits(id),
  groundbait_name_snapshot text not null,
  created_at timestamptz not null default now(),

  constraint trip_groundbaits_unique unique (trip_id, groundbait_id)
);

comment on table public.trip_groundbaits is 'junction table: groundbaits assigned to a trip (multi-select)';

create index if not exists idx_trip_groundbaits_trip
  on public.trip_groundbaits (trip_id);

-- 1.10) weather_snapshots (weather snapshots for a trip)
create table if not exists public.weather_snapshots (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  source text not null,
  fetched_at timestamptz not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now(),

  constraint weather_snapshots_source_check
    check (source in ('api', 'manual')),
  constraint weather_snapshots_period_valid
    check (period_end >= period_start)
);

comment on table public.weather_snapshots is 'weather snapshots for trips (api or manual)';

create index if not exists idx_weather_snapshots_trip
  on public.weather_snapshots (trip_id);

-- 1.11) weather_hours (hourly timeline data within a snapshot)
create table if not exists public.weather_hours (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.weather_snapshots(id) on delete cascade,
  observed_at timestamptz not null,
  temperature_c numeric(4,1),
  pressure_hpa integer,
  wind_speed_kmh numeric(5,1),
  wind_direction integer,
  humidity_percent integer,
  precipitation_mm numeric(5,1),
  cloud_cover integer,
  weather_icon text,
  weather_text text,
  created_at timestamptz not null default now(),

  constraint weather_hours_unique unique (snapshot_id, observed_at),
  constraint weather_hours_temp_range
    check (temperature_c is null or (temperature_c >= -100 and temperature_c <= 100)),
  constraint weather_hours_pressure_range
    check (pressure_hpa is null or (pressure_hpa >= 800 and pressure_hpa <= 1200)),
  constraint weather_hours_wind_speed_positive
    check (wind_speed_kmh is null or wind_speed_kmh >= 0),
  constraint weather_hours_wind_direction_range
    check (wind_direction is null or (wind_direction >= 0 and wind_direction <= 360)),
  constraint weather_hours_humidity_range
    check (humidity_percent is null or (humidity_percent >= 0 and humidity_percent <= 100)),
  constraint weather_hours_precipitation_positive
    check (precipitation_mm is null or precipitation_mm >= 0),
  constraint weather_hours_cloud_cover_range
    check (cloud_cover is null or (cloud_cover >= 0 and cloud_cover <= 100))
);

comment on table public.weather_hours is 'hourly weather timeline records linked to a weather snapshot';
comment on column public.weather_hours.temperature_c is 'temperature in c';
comment on column public.weather_hours.pressure_hpa is 'pressure in hpa';
comment on column public.weather_hours.wind_speed_kmh is 'wind speed in km/h';
comment on column public.weather_hours.wind_direction is 'wind direction in degrees (0-360)';
comment on column public.weather_hours.humidity_percent is 'relative humidity percent (0-100)';
comment on column public.weather_hours.precipitation_mm is 'precipitation in mm';
comment on column public.weather_hours.cloud_cover is 'cloud cover percent (0-100)';

create index if not exists idx_weather_hours_snapshot_observed
  on public.weather_hours (snapshot_id, observed_at);

-- ---------------------------------------------------------------------------
-- 2) functions + triggers
-- ---------------------------------------------------------------------------

-- 2.1) updated_at maintenance for tables that have updated_at
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_trips on public.trips;
create trigger set_updated_at_trips
before update on public.trips
for each row
execute function public.update_updated_at_column();

drop trigger if exists set_updated_at_catches on public.catches;
create trigger set_updated_at_catches
before update on public.catches
for each row
execute function public.update_updated_at_column();

drop trigger if exists set_updated_at_rods on public.rods;
create trigger set_updated_at_rods
before update on public.rods
for each row
execute function public.update_updated_at_column();

drop trigger if exists set_updated_at_lures on public.lures;
create trigger set_updated_at_lures
before update on public.lures
for each row
execute function public.update_updated_at_column();

drop trigger if exists set_updated_at_groundbaits on public.groundbaits;
create trigger set_updated_at_groundbaits
before update on public.groundbaits
for each row
execute function public.update_updated_at_column();

-- 2.2) prevent cross-user equipment references in catches (trip owner == equipment owner)
create or replace function public.check_catch_owner_consistency()
returns trigger
language plpgsql
as $$
declare
  v_trip_user_id uuid;
  v_lure_user_id uuid;
  v_groundbait_user_id uuid;
  v_lure_deleted_at timestamptz;
  v_groundbait_deleted_at timestamptz;
begin
  -- defensive: ensure referenced rows exist (should be guaranteed by fks, but improves error clarity)
  select user_id into v_trip_user_id
  from public.trips
  where id = new.trip_id;

  if v_trip_user_id is null then
    raise exception 'trip does not exist: %', new.trip_id;
  end if;

  select user_id, deleted_at into v_lure_user_id, v_lure_deleted_at
  from public.lures
  where id = new.lure_id;

  if v_lure_user_id is null then
    raise exception 'lure does not exist: %', new.lure_id;
  end if;

  select user_id, deleted_at into v_groundbait_user_id, v_groundbait_deleted_at
  from public.groundbaits
  where id = new.groundbait_id;

  if v_groundbait_user_id is null then
    raise exception 'groundbait does not exist: %', new.groundbait_id;
  end if;

  -- enforce same owner
  if v_lure_user_id <> v_trip_user_id then
    raise exception 'lure belongs to a different user';
  end if;

  if v_groundbait_user_id <> v_trip_user_id then
    raise exception 'groundbait belongs to a different user';
  end if;

  -- prevent attaching soft-deleted equipment to new/updated catches
  if v_lure_deleted_at is not null then
    raise exception 'lure is soft-deleted and cannot be used';
  end if;

  if v_groundbait_deleted_at is not null then
    raise exception 'groundbait is soft-deleted and cannot be used';
  end if;

  return new;
end;
$$;

drop trigger if exists check_catch_owner on public.catches;
create trigger check_catch_owner
before insert or update on public.catches
for each row
execute function public.check_catch_owner_consistency();

-- 2.3) prevent cross-user equipment references in junction tables (trip owner == equipment owner)
create or replace function public.check_trip_equipment_owner()
returns trigger
language plpgsql
as $$
declare
  v_trip_user_id uuid;
  v_item_user_id uuid;
  v_item_deleted_at timestamptz;
begin
  select user_id into v_trip_user_id
  from public.trips
  where id = new.trip_id;

  if v_trip_user_id is null then
    raise exception 'trip does not exist: %', new.trip_id;
  end if;

  -- dynamic dispatch based on the junction table
  if tg_table_name = 'trip_rods' then
    select user_id, deleted_at into v_item_user_id, v_item_deleted_at
    from public.rods
    where id = new.rod_id;
  elsif tg_table_name = 'trip_lures' then
    select user_id, deleted_at into v_item_user_id, v_item_deleted_at
    from public.lures
    where id = new.lure_id;
  elsif tg_table_name = 'trip_groundbaits' then
    select user_id, deleted_at into v_item_user_id, v_item_deleted_at
    from public.groundbaits
    where id = new.groundbait_id;
  else
    raise exception 'unsupported junction table: %', tg_table_name;
  end if;

  if v_item_user_id is null then
    raise exception 'equipment does not exist for table %', tg_table_name;
  end if;

  if v_item_user_id <> v_trip_user_id then
    raise exception 'equipment belongs to a different user';
  end if;

  if v_item_deleted_at is not null then
    raise exception 'equipment is soft-deleted and cannot be assigned to a trip';
  end if;

  return new;
end;
$$;

drop trigger if exists check_trip_rods_owner on public.trip_rods;
create trigger check_trip_rods_owner
before insert or update on public.trip_rods
for each row
execute function public.check_trip_equipment_owner();

drop trigger if exists check_trip_lures_owner on public.trip_lures;
create trigger check_trip_lures_owner
before insert or update on public.trip_lures
for each row
execute function public.check_trip_equipment_owner();

drop trigger if exists check_trip_groundbaits_owner on public.trip_groundbaits;
create trigger check_trip_groundbaits_owner
before insert or update on public.trip_groundbaits
for each row
execute function public.check_trip_equipment_owner();

-- 2.4) fill snapshot columns on insert/update to preserve historical labels
-- note: snapshots are intentionally taken from the current equipment name at write time.
create or replace function public.fill_snapshots_for_catches()
returns trigger
language plpgsql
as $$
declare
  v_lure_name text;
  v_groundbait_name text;
begin
  select name into v_lure_name
  from public.lures
  where id = new.lure_id;

  select name into v_groundbait_name
  from public.groundbaits
  where id = new.groundbait_id;

  if v_lure_name is null then
    raise exception 'lure not found for snapshot';
  end if;

  if v_groundbait_name is null then
    raise exception 'groundbait not found for snapshot';
  end if;

  new.lure_name_snapshot = v_lure_name;
  new.groundbait_name_snapshot = v_groundbait_name;
  return new;
end;
$$;

drop trigger if exists fill_catch_snapshots on public.catches;
create trigger fill_catch_snapshots
before insert or update on public.catches
for each row
execute function public.fill_snapshots_for_catches();

create or replace function public.fill_snapshots_for_trip_equipment()
returns trigger
language plpgsql
as $$
declare
  v_name text;
begin
  if tg_table_name = 'trip_rods' then
    select name into v_name
    from public.rods
    where id = new.rod_id;

    if v_name is null then
      raise exception 'rod not found for snapshot';
    end if;

    new.rod_name_snapshot = v_name;
    return new;
  end if;

  if tg_table_name = 'trip_lures' then
    select name into v_name
    from public.lures
    where id = new.lure_id;

    if v_name is null then
      raise exception 'lure not found for snapshot';
    end if;

    new.lure_name_snapshot = v_name;
    return new;
  end if;

  if tg_table_name = 'trip_groundbaits' then
    select name into v_name
    from public.groundbaits
    where id = new.groundbait_id;

    if v_name is null then
      raise exception 'groundbait not found for snapshot';
    end if;

    new.groundbait_name_snapshot = v_name;
    return new;
  end if;

  raise exception 'unsupported junction table for snapshot: %', tg_table_name;
end;
$$;

drop trigger if exists fill_trip_rods_snapshot on public.trip_rods;
create trigger fill_trip_rods_snapshot
before insert or update on public.trip_rods
for each row
execute function public.fill_snapshots_for_trip_equipment();

drop trigger if exists fill_trip_lures_snapshot on public.trip_lures;
create trigger fill_trip_lures_snapshot
before insert or update on public.trip_lures
for each row
execute function public.fill_snapshots_for_trip_equipment();

drop trigger if exists fill_trip_groundbaits_snapshot on public.trip_groundbaits;
create trigger fill_trip_groundbaits_snapshot
before insert or update on public.trip_groundbaits
for each row
execute function public.fill_snapshots_for_trip_equipment();

-- ---------------------------------------------------------------------------
-- 3) row level security (rls)
-- ---------------------------------------------------------------------------
-- rls is enabled and forced on every new table. forcing rls ensures even table owners
-- do not accidentally bypass policies (service_role can still bypass by design).
alter table public.fish_species enable row level security;
alter table public.fish_species force row level security;

alter table public.rods enable row level security;
alter table public.rods force row level security;

alter table public.lures enable row level security;
alter table public.lures force row level security;

alter table public.groundbaits enable row level security;
alter table public.groundbaits force row level security;

alter table public.trips enable row level security;
alter table public.trips force row level security;

alter table public.catches enable row level security;
alter table public.catches force row level security;

alter table public.trip_rods enable row level security;
alter table public.trip_rods force row level security;

alter table public.trip_lures enable row level security;
alter table public.trip_lures force row level security;

alter table public.trip_groundbaits enable row level security;
alter table public.trip_groundbaits force row level security;

alter table public.weather_snapshots enable row level security;
alter table public.weather_snapshots force row level security;

alter table public.weather_hours enable row level security;
alter table public.weather_hours force row level security;

-- ---------------------------------------------------------------------------
-- 4) rls policies
-- ---------------------------------------------------------------------------
-- policy naming convention: <table>_<action>_<role>
-- each action has separate policies per role (anon/authenticated).

-- 4.1) fish_species: read-only for authenticated; fully denied for anon
-- rationale: dictionary data is not user-private, but the app expects a session for access.
drop policy if exists fish_species_select_anon on public.fish_species;
create policy fish_species_select_anon on public.fish_species
for select to anon
using (false);

drop policy if exists fish_species_insert_anon on public.fish_species;
create policy fish_species_insert_anon on public.fish_species
for insert to anon
with check (false);

drop policy if exists fish_species_update_anon on public.fish_species;
create policy fish_species_update_anon on public.fish_species
for update to anon
using (false) with check (false);

drop policy if exists fish_species_delete_anon on public.fish_species;
create policy fish_species_delete_anon on public.fish_species
for delete to anon
using (false);

drop policy if exists fish_species_select_authenticated on public.fish_species;
create policy fish_species_select_authenticated on public.fish_species
for select to authenticated
using (true);

-- migrations manage this table; deny all writes from authenticated clients
drop policy if exists fish_species_insert_authenticated on public.fish_species;
create policy fish_species_insert_authenticated on public.fish_species
for insert to authenticated
with check (false);

drop policy if exists fish_species_update_authenticated on public.fish_species;
create policy fish_species_update_authenticated on public.fish_species
for update to authenticated
using (false) with check (false);

drop policy if exists fish_species_delete_authenticated on public.fish_species;
create policy fish_species_delete_authenticated on public.fish_species
for delete to authenticated
using (false);

-- 4.2) rods: only the owner can read/write their rows
drop policy if exists rods_select_anon on public.rods;
create policy rods_select_anon on public.rods
for select to anon
using (false);

drop policy if exists rods_insert_anon on public.rods;
create policy rods_insert_anon on public.rods
for insert to anon
with check (false);

drop policy if exists rods_update_anon on public.rods;
create policy rods_update_anon on public.rods
for update to anon
using (false) with check (false);

drop policy if exists rods_delete_anon on public.rods;
create policy rods_delete_anon on public.rods
for delete to anon
using (false);

drop policy if exists rods_select_authenticated on public.rods;
create policy rods_select_authenticated on public.rods
for select to authenticated
using (user_id = auth.uid());

drop policy if exists rods_insert_authenticated on public.rods;
create policy rods_insert_authenticated on public.rods
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists rods_update_authenticated on public.rods;
create policy rods_update_authenticated on public.rods
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists rods_delete_authenticated on public.rods;
create policy rods_delete_authenticated on public.rods
for delete to authenticated
using (user_id = auth.uid());

-- 4.3) lures: only the owner can read/write their rows
drop policy if exists lures_select_anon on public.lures;
create policy lures_select_anon on public.lures
for select to anon
using (false);

drop policy if exists lures_insert_anon on public.lures;
create policy lures_insert_anon on public.lures
for insert to anon
with check (false);

drop policy if exists lures_update_anon on public.lures;
create policy lures_update_anon on public.lures
for update to anon
using (false) with check (false);

drop policy if exists lures_delete_anon on public.lures;
create policy lures_delete_anon on public.lures
for delete to anon
using (false);

drop policy if exists lures_select_authenticated on public.lures;
create policy lures_select_authenticated on public.lures
for select to authenticated
using (user_id = auth.uid());

drop policy if exists lures_insert_authenticated on public.lures;
create policy lures_insert_authenticated on public.lures
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists lures_update_authenticated on public.lures;
create policy lures_update_authenticated on public.lures
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists lures_delete_authenticated on public.lures;
create policy lures_delete_authenticated on public.lures
for delete to authenticated
using (user_id = auth.uid());

-- 4.4) groundbaits: only the owner can read/write their rows
drop policy if exists groundbaits_select_anon on public.groundbaits;
create policy groundbaits_select_anon on public.groundbaits
for select to anon
using (false);

drop policy if exists groundbaits_insert_anon on public.groundbaits;
create policy groundbaits_insert_anon on public.groundbaits
for insert to anon
with check (false);

drop policy if exists groundbaits_update_anon on public.groundbaits;
create policy groundbaits_update_anon on public.groundbaits
for update to anon
using (false) with check (false);

drop policy if exists groundbaits_delete_anon on public.groundbaits;
create policy groundbaits_delete_anon on public.groundbaits
for delete to anon
using (false);

drop policy if exists groundbaits_select_authenticated on public.groundbaits;
create policy groundbaits_select_authenticated on public.groundbaits
for select to authenticated
using (user_id = auth.uid());

drop policy if exists groundbaits_insert_authenticated on public.groundbaits;
create policy groundbaits_insert_authenticated on public.groundbaits
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists groundbaits_update_authenticated on public.groundbaits;
create policy groundbaits_update_authenticated on public.groundbaits
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists groundbaits_delete_authenticated on public.groundbaits;
create policy groundbaits_delete_authenticated on public.groundbaits
for delete to authenticated
using (user_id = auth.uid());

-- 4.5) trips: only the owner can read/write their rows
drop policy if exists trips_select_anon on public.trips;
create policy trips_select_anon on public.trips
for select to anon
using (false);

drop policy if exists trips_insert_anon on public.trips;
create policy trips_insert_anon on public.trips
for insert to anon
with check (false);

drop policy if exists trips_update_anon on public.trips;
create policy trips_update_anon on public.trips
for update to anon
using (false) with check (false);

drop policy if exists trips_delete_anon on public.trips;
create policy trips_delete_anon on public.trips
for delete to anon
using (false);

drop policy if exists trips_select_authenticated on public.trips;
create policy trips_select_authenticated on public.trips
for select to authenticated
using (user_id = auth.uid());

drop policy if exists trips_insert_authenticated on public.trips;
create policy trips_insert_authenticated on public.trips
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists trips_update_authenticated on public.trips;
create policy trips_update_authenticated on public.trips
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists trips_delete_authenticated on public.trips;
create policy trips_delete_authenticated on public.trips
for delete to authenticated
using (user_id = auth.uid());

-- 4.6) catches: access via trip ownership (trip must not be soft-deleted)
-- rationale: catches are scoped to trips; we authorise by verifying the related trip belongs to auth.uid().
drop policy if exists catches_select_anon on public.catches;
create policy catches_select_anon on public.catches
for select to anon
using (false);

drop policy if exists catches_insert_anon on public.catches;
create policy catches_insert_anon on public.catches
for insert to anon
with check (false);

drop policy if exists catches_update_anon on public.catches;
create policy catches_update_anon on public.catches
for update to anon
using (false) with check (false);

drop policy if exists catches_delete_anon on public.catches;
create policy catches_delete_anon on public.catches
for delete to anon
using (false);

drop policy if exists catches_select_authenticated on public.catches;
create policy catches_select_authenticated on public.catches
for select to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = catches.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists catches_insert_authenticated on public.catches;
create policy catches_insert_authenticated on public.catches
for insert to authenticated
with check (
  exists (
    select 1
    from public.trips t
    where t.id = catches.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists catches_update_authenticated on public.catches;
create policy catches_update_authenticated on public.catches
for update to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = catches.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
)
with check (
  exists (
    select 1
    from public.trips t
    where t.id = catches.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists catches_delete_authenticated on public.catches;
create policy catches_delete_authenticated on public.catches
for delete to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = catches.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

-- 4.7) trip_rods: access via trip ownership (trip must not be soft-deleted)
drop policy if exists trip_rods_select_anon on public.trip_rods;
create policy trip_rods_select_anon on public.trip_rods
for select to anon
using (false);

drop policy if exists trip_rods_insert_anon on public.trip_rods;
create policy trip_rods_insert_anon on public.trip_rods
for insert to anon
with check (false);

drop policy if exists trip_rods_update_anon on public.trip_rods;
create policy trip_rods_update_anon on public.trip_rods
for update to anon
using (false) with check (false);

drop policy if exists trip_rods_delete_anon on public.trip_rods;
create policy trip_rods_delete_anon on public.trip_rods
for delete to anon
using (false);

drop policy if exists trip_rods_select_authenticated on public.trip_rods;
create policy trip_rods_select_authenticated on public.trip_rods
for select to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = trip_rods.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists trip_rods_insert_authenticated on public.trip_rods;
create policy trip_rods_insert_authenticated on public.trip_rods
for insert to authenticated
with check (
  exists (
    select 1
    from public.trips t
    where t.id = trip_rods.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists trip_rods_update_authenticated on public.trip_rods;
create policy trip_rods_update_authenticated on public.trip_rods
for update to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = trip_rods.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
)
with check (
  exists (
    select 1
    from public.trips t
    where t.id = trip_rods.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists trip_rods_delete_authenticated on public.trip_rods;
create policy trip_rods_delete_authenticated on public.trip_rods
for delete to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = trip_rods.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

-- 4.8) trip_lures: access via trip ownership
drop policy if exists trip_lures_select_anon on public.trip_lures;
create policy trip_lures_select_anon on public.trip_lures
for select to anon
using (false);

drop policy if exists trip_lures_insert_anon on public.trip_lures;
create policy trip_lures_insert_anon on public.trip_lures
for insert to anon
with check (false);

drop policy if exists trip_lures_update_anon on public.trip_lures;
create policy trip_lures_update_anon on public.trip_lures
for update to anon
using (false) with check (false);

drop policy if exists trip_lures_delete_anon on public.trip_lures;
create policy trip_lures_delete_anon on public.trip_lures
for delete to anon
using (false);

drop policy if exists trip_lures_select_authenticated on public.trip_lures;
create policy trip_lures_select_authenticated on public.trip_lures
for select to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = trip_lures.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists trip_lures_insert_authenticated on public.trip_lures;
create policy trip_lures_insert_authenticated on public.trip_lures
for insert to authenticated
with check (
  exists (
    select 1
    from public.trips t
    where t.id = trip_lures.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists trip_lures_update_authenticated on public.trip_lures;
create policy trip_lures_update_authenticated on public.trip_lures
for update to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = trip_lures.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
)
with check (
  exists (
    select 1
    from public.trips t
    where t.id = trip_lures.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists trip_lures_delete_authenticated on public.trip_lures;
create policy trip_lures_delete_authenticated on public.trip_lures
for delete to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = trip_lures.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

-- 4.9) trip_groundbaits: access via trip ownership
drop policy if exists trip_groundbaits_select_anon on public.trip_groundbaits;
create policy trip_groundbaits_select_anon on public.trip_groundbaits
for select to anon
using (false);

drop policy if exists trip_groundbaits_insert_anon on public.trip_groundbaits;
create policy trip_groundbaits_insert_anon on public.trip_groundbaits
for insert to anon
with check (false);

drop policy if exists trip_groundbaits_update_anon on public.trip_groundbaits;
create policy trip_groundbaits_update_anon on public.trip_groundbaits
for update to anon
using (false) with check (false);

drop policy if exists trip_groundbaits_delete_anon on public.trip_groundbaits;
create policy trip_groundbaits_delete_anon on public.trip_groundbaits
for delete to anon
using (false);

drop policy if exists trip_groundbaits_select_authenticated on public.trip_groundbaits;
create policy trip_groundbaits_select_authenticated on public.trip_groundbaits
for select to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = trip_groundbaits.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists trip_groundbaits_insert_authenticated on public.trip_groundbaits;
create policy trip_groundbaits_insert_authenticated on public.trip_groundbaits
for insert to authenticated
with check (
  exists (
    select 1
    from public.trips t
    where t.id = trip_groundbaits.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists trip_groundbaits_update_authenticated on public.trip_groundbaits;
create policy trip_groundbaits_update_authenticated on public.trip_groundbaits
for update to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = trip_groundbaits.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
)
with check (
  exists (
    select 1
    from public.trips t
    where t.id = trip_groundbaits.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists trip_groundbaits_delete_authenticated on public.trip_groundbaits;
create policy trip_groundbaits_delete_authenticated on public.trip_groundbaits
for delete to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = trip_groundbaits.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

-- 4.10) weather_snapshots: access via trip ownership
drop policy if exists weather_snapshots_select_anon on public.weather_snapshots;
create policy weather_snapshots_select_anon on public.weather_snapshots
for select to anon
using (false);

drop policy if exists weather_snapshots_insert_anon on public.weather_snapshots;
create policy weather_snapshots_insert_anon on public.weather_snapshots
for insert to anon
with check (false);

drop policy if exists weather_snapshots_update_anon on public.weather_snapshots;
create policy weather_snapshots_update_anon on public.weather_snapshots
for update to anon
using (false) with check (false);

drop policy if exists weather_snapshots_delete_anon on public.weather_snapshots;
create policy weather_snapshots_delete_anon on public.weather_snapshots
for delete to anon
using (false);

drop policy if exists weather_snapshots_select_authenticated on public.weather_snapshots;
create policy weather_snapshots_select_authenticated on public.weather_snapshots
for select to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = weather_snapshots.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists weather_snapshots_insert_authenticated on public.weather_snapshots;
create policy weather_snapshots_insert_authenticated on public.weather_snapshots
for insert to authenticated
with check (
  exists (
    select 1
    from public.trips t
    where t.id = weather_snapshots.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists weather_snapshots_update_authenticated on public.weather_snapshots;
create policy weather_snapshots_update_authenticated on public.weather_snapshots
for update to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = weather_snapshots.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
)
with check (
  exists (
    select 1
    from public.trips t
    where t.id = weather_snapshots.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists weather_snapshots_delete_authenticated on public.weather_snapshots;
create policy weather_snapshots_delete_authenticated on public.weather_snapshots
for delete to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = weather_snapshots.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

-- 4.11) weather_hours: access via snapshot -> trip ownership
drop policy if exists weather_hours_select_anon on public.weather_hours;
create policy weather_hours_select_anon on public.weather_hours
for select to anon
using (false);

drop policy if exists weather_hours_insert_anon on public.weather_hours;
create policy weather_hours_insert_anon on public.weather_hours
for insert to anon
with check (false);

drop policy if exists weather_hours_update_anon on public.weather_hours;
create policy weather_hours_update_anon on public.weather_hours
for update to anon
using (false) with check (false);

drop policy if exists weather_hours_delete_anon on public.weather_hours;
create policy weather_hours_delete_anon on public.weather_hours
for delete to anon
using (false);

drop policy if exists weather_hours_select_authenticated on public.weather_hours;
create policy weather_hours_select_authenticated on public.weather_hours
for select to authenticated
using (
  exists (
    select 1
    from public.weather_snapshots ws
    join public.trips t on t.id = ws.trip_id
    where ws.id = weather_hours.snapshot_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists weather_hours_insert_authenticated on public.weather_hours;
create policy weather_hours_insert_authenticated on public.weather_hours
for insert to authenticated
with check (
  exists (
    select 1
    from public.weather_snapshots ws
    join public.trips t on t.id = ws.trip_id
    where ws.id = weather_hours.snapshot_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists weather_hours_update_authenticated on public.weather_hours;
create policy weather_hours_update_authenticated on public.weather_hours
for update to authenticated
using (
  exists (
    select 1
    from public.weather_snapshots ws
    join public.trips t on t.id = ws.trip_id
    where ws.id = weather_hours.snapshot_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
)
with check (
  exists (
    select 1
    from public.weather_snapshots ws
    join public.trips t on t.id = ws.trip_id
    where ws.id = weather_hours.snapshot_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists weather_hours_delete_authenticated on public.weather_hours;
create policy weather_hours_delete_authenticated on public.weather_hours
for delete to authenticated
using (
  exists (
    select 1
    from public.weather_snapshots ws
    join public.trips t on t.id = ws.trip_id
    where ws.id = weather_hours.snapshot_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

-- ---------------------------------------------------------------------------
-- 5) supabase storage (catch photos)
-- ---------------------------------------------------------------------------
-- convention:
-- bucket: catch-photos
-- object path: {user_id}/{catch_id}.jpg (or any extension; app controls mime/type)
--
-- note: storage.objects already has rls enabled by supabase; we only define policies.
-- this migration also ensures the bucket row exists.
insert into storage.buckets (id, name, public)
values ('catch-photos', 'catch-photos', false)
on conflict (id) do nothing;

-- deny anon access entirely
drop policy if exists catch_photos_select_anon on storage.objects;
create policy catch_photos_select_anon on storage.objects
for select to anon
using (false);

drop policy if exists catch_photos_insert_anon on storage.objects;
create policy catch_photos_insert_anon on storage.objects
for insert to anon
with check (false);

drop policy if exists catch_photos_update_anon on storage.objects;
create policy catch_photos_update_anon on storage.objects
for update to anon
using (false) with check (false);

drop policy if exists catch_photos_delete_anon on storage.objects;
create policy catch_photos_delete_anon on storage.objects
for delete to anon
using (false);

-- authenticated: allow access only inside the user's folder (bucket_id + first path segment = auth.uid())
drop policy if exists catch_photos_select_authenticated on storage.objects;
create policy catch_photos_select_authenticated on storage.objects
for select to authenticated
using (
  bucket_id = 'catch-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists catch_photos_insert_authenticated on storage.objects;
create policy catch_photos_insert_authenticated on storage.objects
for insert to authenticated
with check (
  bucket_id = 'catch-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- update is typically not needed for immutable object keys; keep it denied for safety.
drop policy if exists catch_photos_update_authenticated on storage.objects;
create policy catch_photos_update_authenticated on storage.objects
for update to authenticated
using (false) with check (false);

drop policy if exists catch_photos_delete_authenticated on storage.objects;
create policy catch_photos_delete_authenticated on storage.objects
for delete to authenticated
using (
  bucket_id = 'catch-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);


