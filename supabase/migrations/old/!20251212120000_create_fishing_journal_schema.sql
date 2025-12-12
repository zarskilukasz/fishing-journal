/*
  migration: create fishing journal mvp schema (multi-user, rls-first)
  timestamp (utc): 2025-12-12 12:00:00

  goal:
  - create a secure, multi-tenant postgresql schema designed for supabase.
  - enforce "no cross-user fk" invariants via triggers (trip owner == equipment owner).
  - preserve historical integrity via immutable name snapshots in join/catch tables.

  touched objects:
  - extensions: pgcrypto
  - types: public.trip_status, public.weather_source
  - tables: public.fish_species, public.rods, public.lures, public.groundbaits,
           public.trips, public.trip_rods, public.trip_lures, public.trip_groundbaits,
           public.catches, public.weather_snapshots, public.weather_hours
  - functions/triggers: public.set_updated_at, public.assert_trip_owner_and_fill_snapshots,
                        public.assert_catch_owner_and_fill_snapshots
  - rls: enabled on all tables + granular policies per role (anon/authenticated)

  notes:
  - all ddl is idempotent where practical (if not exists / drop ... if exists).
  - "anon" access is explicitly denied via policies using false, except for fish_species select.
  - equipment name uniqueness is strict: unique(user_id, lower(name)) even across soft-delete.
*/

-- ---------------------------------------------------------------------------
-- 0) extensions
-- ---------------------------------------------------------------------------
-- pgcrypto provides gen_random_uuid() for uuid primary keys.
create extension if not exists "pgcrypto" with schema extensions;

-- ---------------------------------------------------------------------------
-- 1) enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.trip_status as enum ('draft', 'active', 'closed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.weather_source as enum ('api', 'manual');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2) tables
-- ---------------------------------------------------------------------------

-- 2.1) public.fish_species (global dictionary, read-only from the app)
create table if not exists public.fish_species (
  id bigint generated always as identity primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists fish_species_name_lower_uniq
  on public.fish_species (lower(name));

-- 2.2) equipment tables (rods / lures / groundbaits)
create table if not exists public.rods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists rods_user_name_lower_uniq
  on public.rods (user_id, lower(name));

create table if not exists public.lures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists lures_user_name_lower_uniq
  on public.lures (user_id, lower(name));

create table if not exists public.groundbaits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists groundbaits_user_name_lower_uniq
  on public.groundbaits (user_id, lower(name));

-- 2.3) public.trips
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.trip_status not null default 'active',
  started_at timestamptz not null,
  ended_at timestamptz,
  location_lat double precision,
  location_lng double precision,
  location_label text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint trips_ended_after_started
    check (ended_at is null or ended_at >= started_at),
  constraint trips_closed_requires_ended
    check (status <> 'closed' or ended_at is not null),
  constraint trips_location_pair
    check ((location_lat is null) = (location_lng is null)),
  constraint trips_location_lat_range
    check (location_lat is null or (location_lat >= -90 and location_lat <= 90)),
  constraint trips_location_lng_range
    check (location_lng is null or (location_lng >= -180 and location_lng <= 180))
);

-- 2.4) trip equipment join tables (with immutable name snapshots)
create table if not exists public.trip_rods (
  trip_id uuid not null references public.trips(id) on delete cascade,
  rod_id uuid not null references public.rods(id),
  rod_name_snapshot text not null,
  created_at timestamptz not null default now(),
  constraint trip_rods_pk primary key (trip_id, rod_id)
);

create table if not exists public.trip_lures (
  trip_id uuid not null references public.trips(id) on delete cascade,
  lure_id uuid not null references public.lures(id),
  lure_name_snapshot text not null,
  created_at timestamptz not null default now(),
  constraint trip_lures_pk primary key (trip_id, lure_id)
);

create table if not exists public.trip_groundbaits (
  trip_id uuid not null references public.trips(id) on delete cascade,
  groundbait_id uuid not null references public.groundbaits(id),
  groundbait_name_snapshot text not null,
  created_at timestamptz not null default now(),
  constraint trip_groundbaits_pk primary key (trip_id, groundbait_id)
);

-- 2.5) public.catches (trophies)
create table if not exists public.catches (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  caught_at timestamptz not null,
  species_id bigint not null references public.fish_species(id),
  lure_id uuid not null references public.lures(id),
  groundbait_id uuid not null references public.groundbaits(id),
  lure_name_snapshot text not null,
  groundbait_name_snapshot text not null,
  weight_g integer,
  length_mm integer,
  photo_path text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint catches_weight_positive check (weight_g is null or weight_g > 0),
  constraint catches_length_positive check (length_mm is null or length_mm > 0)
);

-- 2.6) weather snapshots + hourly timeline
create table if not exists public.weather_snapshots (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  source public.weather_source not null,
  fetched_at timestamptz not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  provider text,
  payload jsonb,
  created_at timestamptz not null default now(),

  constraint weather_snapshots_window_valid check (window_end >= window_start)
);

create table if not exists public.weather_hours (
  snapshot_id uuid not null references public.weather_snapshots(id) on delete cascade,
  observed_at timestamptz not null,
  temperature_c numeric(5,2),
  pressure_hpa numeric(6,2),
  wind_kph numeric(6,2),
  wind_gust_kph numeric(6,2),
  wind_dir_deg smallint,
  humidity_pct smallint,
  precip_mm numeric(6,2),
  cloud_pct smallint,
  conditions_text text,
  conditions_icon text,
  created_at timestamptz not null default now(),

  constraint weather_hours_pk primary key (snapshot_id, observed_at),
  constraint weather_hours_temp_range check (temperature_c is null or (temperature_c >= -100 and temperature_c <= 100)),
  constraint weather_hours_pressure_range check (pressure_hpa is null or (pressure_hpa >= 800 and pressure_hpa <= 1200)),
  constraint weather_hours_wind_nonneg check (wind_kph is null or wind_kph >= 0),
  constraint weather_hours_wind_gust_nonneg check (wind_gust_kph is null or wind_gust_kph >= 0),
  constraint weather_hours_wind_dir_range check (wind_dir_deg is null or (wind_dir_deg >= 0 and wind_dir_deg <= 360)),
  constraint weather_hours_humidity_range check (humidity_pct is null or (humidity_pct >= 0 and humidity_pct <= 100)),
  constraint weather_hours_precip_nonneg check (precip_mm is null or precip_mm >= 0),
  constraint weather_hours_cloud_range check (cloud_pct is null or (cloud_pct >= 0 and cloud_pct <= 100))
);

-- ---------------------------------------------------------------------------
-- 3) indexes (performance)
-- ---------------------------------------------------------------------------

-- dashboard: user's latest trips (excluding soft-deleted trips)
create index if not exists trips_user_started_at_desc_active_idx
  on public.trips (user_id, started_at desc)
  where deleted_at is null;

-- catches list per trip (excluding soft-deleted catches)
create index if not exists catches_trip_caught_at_desc_active_idx
  on public.catches (trip_id, caught_at desc)
  where deleted_at is null;

-- optional analytics filter by species (excluding soft-deleted catches)
create index if not exists catches_species_id_active_idx
  on public.catches (species_id)
  where deleted_at is null;

-- equipment: fast active lists by user
create index if not exists rods_user_active_idx
  on public.rods (user_id)
  where deleted_at is null;

create index if not exists lures_user_active_idx
  on public.lures (user_id)
  where deleted_at is null;

create index if not exists groundbaits_user_active_idx
  on public.groundbaits (user_id)
  where deleted_at is null;

-- weather: prefer latest snapshot by (trip, source, fetched_at desc)
create index if not exists weather_snapshots_trip_source_fetched_desc_idx
  on public.weather_snapshots (trip_id, source, fetched_at desc);

-- weather: timeline read pattern
create index if not exists weather_hours_snapshot_observed_idx
  on public.weather_hours (snapshot_id, observed_at);

-- ---------------------------------------------------------------------------
-- 4) audit helpers (updated_at)
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
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
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_rods on public.rods;
create trigger set_updated_at_rods
before update on public.rods
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_lures on public.lures;
create trigger set_updated_at_lures
before update on public.lures
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_groundbaits on public.groundbaits;
create trigger set_updated_at_groundbaits
before update on public.groundbaits
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_catches on public.catches;
create trigger set_updated_at_catches
before update on public.catches
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5) integrity triggers: enforce same-owner relations + fill immutable snapshots
-- ---------------------------------------------------------------------------

-- 5.1) join tables: ensure (trip.user_id == equipment.user_id) and fill snapshot on insert.
-- also ensure the snapshot is immutable once written (updates may happen due to rls-safe upserts).
create or replace function public.assert_trip_owner_and_fill_snapshots()
returns trigger
language plpgsql
as $$
declare
  v_trip_user uuid;
  v_item_user uuid;
  v_item_name text;
begin
  -- trip must exist and not be soft-deleted (soft-deleted trips are treated as non-existent for dependent data).
  select user_id
    into v_trip_user
  from public.trips
  where id = new.trip_id
    and deleted_at is null;

  if v_trip_user is null then
    raise exception 'trip not found or deleted';
  end if;

  if tg_table_name = 'trip_rods' then
    select user_id, name
      into v_item_user, v_item_name
    from public.rods
    where id = new.rod_id
      and deleted_at is null;

    if v_item_user is distinct from v_trip_user then
      raise exception 'rod belongs to different user';
    end if;

    if tg_op = 'insert' then
      new.rod_name_snapshot = v_item_name;
    else
      if new.rod_name_snapshot is distinct from old.rod_name_snapshot then
        raise exception 'snapshot is immutable';
      end if;
    end if;
  elsif tg_table_name = 'trip_lures' then
    select user_id, name
      into v_item_user, v_item_name
    from public.lures
    where id = new.lure_id
      and deleted_at is null;

    if v_item_user is distinct from v_trip_user then
      raise exception 'lure belongs to different user';
    end if;

    if tg_op = 'insert' then
      new.lure_name_snapshot = v_item_name;
    else
      if new.lure_name_snapshot is distinct from old.lure_name_snapshot then
        raise exception 'snapshot is immutable';
      end if;
    end if;
  elsif tg_table_name = 'trip_groundbaits' then
    select user_id, name
      into v_item_user, v_item_name
    from public.groundbaits
    where id = new.groundbait_id
      and deleted_at is null;

    if v_item_user is distinct from v_trip_user then
      raise exception 'groundbait belongs to different user';
    end if;

    if tg_op = 'insert' then
      new.groundbait_name_snapshot = v_item_name;
    else
      if new.groundbait_name_snapshot is distinct from old.groundbait_name_snapshot then
        raise exception 'snapshot is immutable';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trip_rods_owner_snapshot on public.trip_rods;
create trigger trip_rods_owner_snapshot
before insert or update on public.trip_rods
for each row execute function public.assert_trip_owner_and_fill_snapshots();

drop trigger if exists trip_lures_owner_snapshot on public.trip_lures;
create trigger trip_lures_owner_snapshot
before insert or update on public.trip_lures
for each row execute function public.assert_trip_owner_and_fill_snapshots();

drop trigger if exists trip_groundbaits_owner_snapshot on public.trip_groundbaits;
create trigger trip_groundbaits_owner_snapshot
before insert or update on public.trip_groundbaits
for each row execute function public.assert_trip_owner_and_fill_snapshots();

-- 5.2) catches: ensure (trip.user_id == lure.user_id == groundbait.user_id) and fill snapshots on insert.
create or replace function public.assert_catch_owner_and_fill_snapshots()
returns trigger
language plpgsql
as $$
declare
  v_trip_user uuid;
  v_lure_user uuid;
  v_lure_name text;
  v_gb_user uuid;
  v_gb_name text;
begin
  select user_id
    into v_trip_user
  from public.trips
  where id = new.trip_id
    and deleted_at is null;

  if v_trip_user is null then
    raise exception 'trip not found or deleted';
  end if;

  select user_id, name
    into v_lure_user, v_lure_name
  from public.lures
  where id = new.lure_id
    and deleted_at is null;

  select user_id, name
    into v_gb_user, v_gb_name
  from public.groundbaits
  where id = new.groundbait_id
    and deleted_at is null;

  if v_lure_user is distinct from v_trip_user then
    raise exception 'lure belongs to different user';
  end if;

  if v_gb_user is distinct from v_trip_user then
    raise exception 'groundbait belongs to different user';
  end if;

  if tg_op = 'insert' then
    new.lure_name_snapshot = v_lure_name;
    new.groundbait_name_snapshot = v_gb_name;
  else
    if new.lure_name_snapshot is distinct from old.lure_name_snapshot then
      raise exception 'snapshot is immutable';
    end if;
    if new.groundbait_name_snapshot is distinct from old.groundbait_name_snapshot then
      raise exception 'snapshot is immutable';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists catches_owner_snapshot on public.catches;
create trigger catches_owner_snapshot
before insert or update on public.catches
for each row execute function public.assert_catch_owner_and_fill_snapshots();

-- ---------------------------------------------------------------------------
-- 6) rls: enable row level security on all tables
-- ---------------------------------------------------------------------------

alter table public.fish_species enable row level security;
alter table public.rods enable row level security;
alter table public.lures enable row level security;
alter table public.groundbaits enable row level security;
alter table public.trips enable row level security;
alter table public.trip_rods enable row level security;
alter table public.trip_lures enable row level security;
alter table public.trip_groundbaits enable row level security;
alter table public.catches enable row level security;
alter table public.weather_snapshots enable row level security;
alter table public.weather_hours enable row level security;

-- ---------------------------------------------------------------------------
-- 7) rls policies (granular, per action, per role)
-- ---------------------------------------------------------------------------

-- helper principle:
-- - for anon: explicitly deny (using false / with check false).
-- - for authenticated: allow owner-scoped access, and hide soft-deleted trips and their dependents.

-- 7.1) fish_species (public read-only dictionary)
drop policy if exists fish_species_select_anon on public.fish_species;
create policy fish_species_select_anon
on public.fish_species
for select
to anon
using (true); -- public dictionary; safe to expose.

drop policy if exists fish_species_select_authenticated on public.fish_species;
create policy fish_species_select_authenticated
on public.fish_species
for select
to authenticated
using (true); -- same as anon; app reads from the client.

-- 7.2) trips (owner-scoped; soft-delete hides from select; updates allowed for owner)
drop policy if exists trips_select_anon on public.trips;
create policy trips_select_anon on public.trips
for select to anon
using (false); -- anon cannot read private user data.

drop policy if exists trips_insert_anon on public.trips;
create policy trips_insert_anon on public.trips
for insert to anon
with check (false); -- anon cannot create rows.

drop policy if exists trips_update_anon on public.trips;
create policy trips_update_anon on public.trips
for update to anon
using (false)
with check (false); -- anon cannot update.

drop policy if exists trips_delete_anon on public.trips;
create policy trips_delete_anon on public.trips
for delete to anon
using (false); -- anon cannot delete.

drop policy if exists trips_select_authenticated on public.trips;
create policy trips_select_authenticated on public.trips
for select to authenticated
using (user_id = auth.uid() and deleted_at is null); -- hide soft-deleted trips from the app.

drop policy if exists trips_insert_authenticated on public.trips;
create policy trips_insert_authenticated on public.trips
for insert to authenticated
with check (user_id = auth.uid()); -- enforce tenant ownership on insert.

drop policy if exists trips_update_authenticated on public.trips;
create policy trips_update_authenticated on public.trips
for update to authenticated
using (user_id = auth.uid()) -- allow edits (including setting deleted_at) only by owner.
with check (user_id = auth.uid());

drop policy if exists trips_delete_authenticated on public.trips;
create policy trips_delete_authenticated on public.trips
for delete to authenticated
using (user_id = auth.uid()); -- physical delete allowed for owner (optional in app).

-- 7.3) rods (owner-scoped; soft-delete hidden from select)
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
using (user_id = auth.uid() and deleted_at is null);

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

-- 7.4) lures (owner-scoped; soft-delete hidden from select)
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
using (user_id = auth.uid() and deleted_at is null);

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

-- 7.5) groundbaits (owner-scoped; soft-delete hidden from select)
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
using (user_id = auth.uid() and deleted_at is null);

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

-- 7.6) join tables: access via trip ownership (trip must not be soft-deleted)
-- trip_rods
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

-- trip_lures
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

-- trip_groundbaits
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

-- 7.7) catches: access via trip ownership + hide soft-deleted catches + hide catches when trip is soft-deleted
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
  deleted_at is null
  and exists (
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

-- 7.8) weather_snapshots: access via trip ownership (trip must not be soft-deleted)
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

-- 7.9) weather_hours: access via snapshot -> trip ownership
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


