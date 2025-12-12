# Schemat bazy danych PostgreSQL (Supabase) — Dziennik Wędkarski MVP

Poniższy schemat jest zaprojektowany jako **multi-user** od początku (integracja z `auth.users`), z **RLS** umożliwiającym bezpieczny dostęp z klienta (`@supabase/supabase-js`). Dane są znormalizowane (≈3NF), a historyczna spójność zapewniona przez **snapshoty nazw sprzętu** i **soft-delete**.

---

## 1. Lista tabel z ich kolumnami, typami danych i ograniczeniami

### 1.1. Wymagane rozszerzenia i typy

```sql
-- UUID
create extension if not exists "pgcrypto";

-- Status wyprawy
do $$ begin
  create type public.trip_status as enum ('draft', 'active', 'closed');
exception when duplicate_object then null;
end $$;

-- Źródło snapshotu pogody
do $$ begin
  create type public.weather_source as enum ('api', 'manual');
exception when duplicate_object then null;
end $$;
```

### 1.2. `public.fish_species` (słownik globalny — read-only)

**Cel:** globalny słownik gatunków ryb, zarządzany migracjami/seedem. Aplikacja tylko odczytuje.

- **id**: `bigint` generated always as identity, **PK**
- **name**: `text` **NOT NULL**
- **created_at**: `timestamptz` **NOT NULL** default `now()`

Ograniczenia:
- **UNIQUE**: `lower(name)`

```sql
create table if not exists public.fish_species (
  id bigint generated always as identity primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists fish_species_name_lower_uniq
  on public.fish_species (lower(name));
```

### 1.3. Tabele sprzętu (3 osobne encje)

Wspólne założenia dla `public.rods`, `public.lures`, `public.groundbaits`:
- **Własność**: `user_id uuid references auth.users(id)`
- **Soft-delete**: `deleted_at timestamptz`
- **Audyt**: `created_at`, `updated_at`
- **Unikalność nazw**: `unique(user_id, lower(name))` (zgodnie z notatkami z sesji)

#### 1.3.1. `public.rods`

- **id**: `uuid` **PK** default `gen_random_uuid()`
- **user_id**: `uuid` **NOT NULL** FK → `auth.users(id)` (ON DELETE CASCADE)
- **name**: `text` **NOT NULL**
- **deleted_at**: `timestamptz` NULL
- **created_at**: `timestamptz` **NOT NULL** default `now()`
- **updated_at**: `timestamptz` **NOT NULL** default `now()`

```sql
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
```

#### 1.3.2. `public.lures`

```sql
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
```

#### 1.3.3. `public.groundbaits`

```sql
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
```

### 1.4. `public.trips` (wyprawy)

- **id**: `uuid` **PK** default `gen_random_uuid()`
- **user_id**: `uuid` **NOT NULL** FK → `auth.users(id)` (ON DELETE CASCADE)
- **status**: `public.trip_status` **NOT NULL** default `'active'`
- **started_at**: `timestamptz` **NOT NULL**
- **ended_at**: `timestamptz` NULL
- **location_lat**: `double precision` NULL
- **location_lng**: `double precision` NULL
- **location_label**: `text` NULL
- **deleted_at**: `timestamptz` NULL
- **created_at**: `timestamptz` **NOT NULL** default `now()`
- **updated_at**: `timestamptz` **NOT NULL** default `now()`

Ograniczenia:
- `ended_at is null OR ended_at >= started_at`
- `status != 'closed' OR ended_at is not null`
- `(location_lat is null) = (location_lng is null)`
- zakresy geo (jeśli podane): `location_lat between -90 and 90`, `location_lng between -180 and 180`

```sql
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

  constraint trips_ended_after_started check (ended_at is null or ended_at >= started_at),
  constraint trips_closed_requires_ended check (status <> 'closed' or ended_at is not null),
  constraint trips_location_pair check ((location_lat is null) = (location_lng is null)),
  constraint trips_location_lat_range check (location_lat is null or (location_lat >= -90 and location_lat <= 90)),
  constraint trips_location_lng_range check (location_lng is null or (location_lng >= -180 and location_lng <= 180))
);
```

### 1.5. Multiselect sprzętu na wyprawie (3 tabele łącznikowe)

Wspólne założenia:
- **UNIQUE(trip_id, item_id)** (brak duplikatów)
- **snapshot nazwy** w momencie przypisania do wyprawy

#### 1.5.1. `public.trip_rods`

- **trip_id**: `uuid` **NOT NULL** FK → `public.trips(id)` (ON DELETE CASCADE)
- **rod_id**: `uuid` **NOT NULL** FK → `public.rods(id)`
- **rod_name_snapshot**: `text` **NOT NULL**
- **created_at**: `timestamptz` **NOT NULL** default `now()`

```sql
create table if not exists public.trip_rods (
  trip_id uuid not null references public.trips(id) on delete cascade,
  rod_id uuid not null references public.rods(id),
  rod_name_snapshot text not null,
  created_at timestamptz not null default now(),
  constraint trip_rods_pk primary key (trip_id, rod_id)
);
```

#### 1.5.2. `public.trip_lures`

```sql
create table if not exists public.trip_lures (
  trip_id uuid not null references public.trips(id) on delete cascade,
  lure_id uuid not null references public.lures(id),
  lure_name_snapshot text not null,
  created_at timestamptz not null default now(),
  constraint trip_lures_pk primary key (trip_id, lure_id)
);
```

#### 1.5.3. `public.trip_groundbaits`

```sql
create table if not exists public.trip_groundbaits (
  trip_id uuid not null references public.trips(id) on delete cascade,
  groundbait_id uuid not null references public.groundbaits(id),
  groundbait_name_snapshot text not null,
  created_at timestamptz not null default now(),
  constraint trip_groundbaits_pk primary key (trip_id, groundbait_id)
);
```

### 1.6. `public.catches` (połowy / trofea)

Wymagania (PRD + notatki):
- **wymagane**: `species_id`, `lure_id`, `groundbait_id`
- snapshot nazw sprzętu dla historycznej spójności
- miary w najmniejszych jednostkach: `weight_g`, `length_mm` + CHECK
- jedno zdjęcie: `photo_path` (ścieżka w Storage)

- **id**: `uuid` **PK** default `gen_random_uuid()`
- **trip_id**: `uuid` **NOT NULL** FK → `public.trips(id)` (ON DELETE CASCADE)
- **caught_at**: `timestamptz` **NOT NULL**
- **species_id**: `bigint` **NOT NULL** FK → `public.fish_species(id)`
- **lure_id**: `uuid` **NOT NULL** FK → `public.lures(id)`
- **groundbait_id**: `uuid` **NOT NULL** FK → `public.groundbaits(id)`
- **lure_name_snapshot**: `text` **NOT NULL**
- **groundbait_name_snapshot**: `text` **NOT NULL**
- **weight_g**: `integer` NULL
- **length_mm**: `integer` NULL
- **photo_path**: `text` NULL
- **deleted_at**: `timestamptz` NULL (soft-delete; opcjonalne w UX, ale wspiera “kosz” bez psucia historii)
- **created_at**: `timestamptz` **NOT NULL** default `now()`
- **updated_at**: `timestamptz` **NOT NULL** default `now()`

Ograniczenia:
- `weight_g is null OR weight_g > 0`
- `length_mm is null OR length_mm > 0`

```sql
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
```

### 1.7. Pogoda (snapshoty + timeline godzinowa, bez nadpisywania)

#### 1.7.1. `public.weather_snapshots`

- **id**: `uuid` **PK** default `gen_random_uuid()`
- **trip_id**: `uuid` **NOT NULL** FK → `public.trips(id)` (ON DELETE CASCADE)
- **source**: `public.weather_source` **NOT NULL** (`api`/`manual`)
- **fetched_at**: `timestamptz` **NOT NULL** (kiedy pobrano/zapisano snapshot)
- **window_start**: `timestamptz` **NOT NULL**
- **window_end**: `timestamptz` **NOT NULL**
- **provider**: `text` NULL (np. `accuweather`)
- **payload**: `jsonb` NULL (opcjonalnie surowy payload dla debugowania/audytu)
- **created_at**: `timestamptz` **NOT NULL** default `now()`

Ograniczenia:
- `window_end >= window_start`

```sql
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
```

#### 1.7.2. `public.weather_hours`

Minimalny zestaw pól MVP (rozszerzalny bez zmiany relacji):
- **temperature_c**, **pressure_hpa**, **wind_kph**, **wind_dir_deg** (+ opcjonalnie gust), **humidity_pct**
- opis/ikona warunków dla UI

- **snapshot_id**: `uuid` **NOT NULL** FK → `public.weather_snapshots(id)` (ON DELETE CASCADE)
- **observed_at**: `timestamptz` **NOT NULL** (godzinny punkt czasu)
- **temperature_c**: `numeric(5,2)` NULL
- **pressure_hpa**: `numeric(6,2)` NULL
- **wind_kph**: `numeric(6,2)` NULL
- **wind_gust_kph**: `numeric(6,2)` NULL
- **wind_dir_deg**: `smallint` NULL
- **humidity_pct**: `smallint` NULL
- **precip_mm**: `numeric(6,2)` NULL
- **cloud_pct**: `smallint` NULL
- **conditions_text**: `text` NULL
- **conditions_icon**: `text` NULL
- **created_at**: `timestamptz` **NOT NULL** default `now()`

Ograniczenia (CHECK-y jakości danych, zgodnie z notatkami):
- `unique(snapshot_id, observed_at)`
- zakresy dla %/kierunku i wartości nieujemnych tam gdzie sensowne

```sql
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
```

---

## 2. Relacje między tabelami

- **`auth.users (1) → (N) public.trips`**
- **`auth.users (1) → (N) public.rods / public.lures / public.groundbaits`**
- **`public.trips (1) → (N) public.catches`**
- **`public.fish_species (1) → (N) public.catches`**
- **`public.trips (N) ↔ (M) public.rods`** przez `public.trip_rods`
- **`public.trips (N) ↔ (M) public.lures`** przez `public.trip_lures`
- **`public.trips (N) ↔ (M) public.groundbaits`** przez `public.trip_groundbaits`
- **`public.trips (1) → (N) public.weather_snapshots`**
- **`public.weather_snapshots (1) → (N) public.weather_hours`**

Krytyczna reguła spójności (z notatek): **brak cross-user FK**. Sprzęt przypięty do wyprawy/połowu musi należeć do tego samego użytkownika co `trips.user_id` (wymuszane triggerami).

---

## 3. Indeksy

```sql
-- Dashboard: ostatnie wyprawy użytkownika (pomija soft-deleted)
create index if not exists trips_user_started_at_desc_active_idx
  on public.trips (user_id, started_at desc)
  where deleted_at is null;

-- Catches: lista połowów per wyprawa (pomija soft-deleted połowy)
create index if not exists catches_trip_caught_at_desc_active_idx
  on public.catches (trip_id, caught_at desc)
  where deleted_at is null;

-- Catches: filtracja/agregacje po gatunku (opcjonalnie pod analizy)
create index if not exists catches_species_id_active_idx
  on public.catches (species_id)
  where deleted_at is null;

-- Sprzęt: szybkie listy po user_id (pomija soft-deleted)
create index if not exists rods_user_active_idx
  on public.rods (user_id)
  where deleted_at is null;
create index if not exists lures_user_active_idx
  on public.lures (user_id)
  where deleted_at is null;
create index if not exists groundbaits_user_active_idx
  on public.groundbaits (user_id)
  where deleted_at is null;

-- Weather: snapshoty per wyprawa (preferowanie "current" wg source + fetched_at)
create index if not exists weather_snapshots_trip_source_fetched_desc_idx
  on public.weather_snapshots (trip_id, source, fetched_at desc);

-- Weather: pobranie timeline godzinowej
create index if not exists weather_hours_snapshot_observed_idx
  on public.weather_hours (snapshot_id, observed_at);
```

---

## 4. Zasady PostgreSQL (RLS) — Supabase

### 4.1. Funkcja i triggery audytowe (`updated_at`)

```sql
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
```

### 4.2. Wymuszenie “no cross-user FK” + snapshoty nazw (sprzęt)

**Cel:** zablokować podpinanie cudzego sprzętu do cudzej wyprawy oraz automatycznie wypełniać snapshoty nazw.

```sql
create or replace function public.assert_trip_owner_and_fill_snapshots()
returns trigger
language plpgsql
as $$
declare
  v_trip_user uuid;
  v_item_user uuid;
  v_item_name text;
begin
  -- trip musi istnieć i nie być soft-deleted
  select user_id into v_trip_user
  from public.trips
  where id = new.trip_id and deleted_at is null;

  if v_trip_user is null then
    raise exception 'Trip not found or deleted';
  end if;

  if tg_table_name = 'trip_rods' then
    select user_id, name into v_item_user, v_item_name
    from public.rods
    where id = new.rod_id and deleted_at is null;

    if v_item_user is distinct from v_trip_user then
      raise exception 'Rod belongs to different user';
    end if;

    if tg_op = 'INSERT' then
      new.rod_name_snapshot = v_item_name;
    elsif new.rod_name_snapshot is distinct from old.rod_name_snapshot then
      raise exception 'Snapshot is immutable';
    end if;
  elsif tg_table_name = 'trip_lures' then
    select user_id, name into v_item_user, v_item_name
    from public.lures
    where id = new.lure_id and deleted_at is null;

    if v_item_user is distinct from v_trip_user then
      raise exception 'Lure belongs to different user';
    end if;

    if tg_op = 'INSERT' then
      new.lure_name_snapshot = v_item_name;
    elsif new.lure_name_snapshot is distinct from old.lure_name_snapshot then
      raise exception 'Snapshot is immutable';
    end if;
  elsif tg_table_name = 'trip_groundbaits' then
    select user_id, name into v_item_user, v_item_name
    from public.groundbaits
    where id = new.groundbait_id and deleted_at is null;

    if v_item_user is distinct from v_trip_user then
      raise exception 'Groundbait belongs to different user';
    end if;

    if tg_op = 'INSERT' then
      new.groundbait_name_snapshot = v_item_name;
    elsif new.groundbait_name_snapshot is distinct from old.groundbait_name_snapshot then
      raise exception 'Snapshot is immutable';
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
```

Analogiczny mechanizm dla `public.catches`:

```sql
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
  select user_id into v_trip_user
  from public.trips
  where id = new.trip_id and deleted_at is null;

  if v_trip_user is null then
    raise exception 'Trip not found or deleted';
  end if;

  select user_id, name into v_lure_user, v_lure_name
  from public.lures
  where id = new.lure_id and deleted_at is null;

  select user_id, name into v_gb_user, v_gb_name
  from public.groundbaits
  where id = new.groundbait_id and deleted_at is null;

  if v_lure_user is distinct from v_trip_user then
    raise exception 'Lure belongs to different user';
  end if;
  if v_gb_user is distinct from v_trip_user then
    raise exception 'Groundbait belongs to different user';
  end if;

  if tg_op = 'INSERT' then
    new.lure_name_snapshot = v_lure_name;
    new.groundbait_name_snapshot = v_gb_name;
  else
    if new.lure_name_snapshot is distinct from old.lure_name_snapshot then
      raise exception 'Snapshot is immutable';
    end if;
    if new.groundbait_name_snapshot is distinct from old.groundbait_name_snapshot then
      raise exception 'Snapshot is immutable';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists catches_owner_snapshot on public.catches;
create trigger catches_owner_snapshot
before insert or update on public.catches
for each row execute function public.assert_catch_owner_and_fill_snapshots();
```

### 4.3. Włączenie RLS

```sql
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
```

### 4.4. Polityki RLS (tabele właścicielskie: trips + sprzęt)

Wspólna zasada:
- **SELECT**: tylko właściciel i tylko `deleted_at is null`
- **INSERT/UPDATE/DELETE**: tylko właściciel (UPDATE pozwala na soft-delete przez ustawienie `deleted_at`)

```sql
-- fish_species: read-only (anon + authenticated)
drop policy if exists fish_species_select on public.fish_species;
create policy fish_species_select on public.fish_species
for select to anon, authenticated
using (true);

-- trips
drop policy if exists trips_select on public.trips;
create policy trips_select on public.trips
for select to authenticated
using (user_id = auth.uid() and deleted_at is null);

drop policy if exists trips_insert on public.trips;
create policy trips_insert on public.trips
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists trips_update on public.trips;
create policy trips_update on public.trips
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists trips_delete on public.trips;
create policy trips_delete on public.trips
for delete to authenticated
using (user_id = auth.uid());

-- rods
drop policy if exists rods_select on public.rods;
create policy rods_select on public.rods
for select to authenticated
using (user_id = auth.uid() and deleted_at is null);

drop policy if exists rods_insert on public.rods;
create policy rods_insert on public.rods
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists rods_update on public.rods;
create policy rods_update on public.rods
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists rods_delete on public.rods;
create policy rods_delete on public.rods
for delete to authenticated
using (user_id = auth.uid());

-- lures
drop policy if exists lures_select on public.lures;
create policy lures_select on public.lures
for select to authenticated
using (user_id = auth.uid() and deleted_at is null);

drop policy if exists lures_insert on public.lures;
create policy lures_insert on public.lures
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists lures_update on public.lures;
create policy lures_update on public.lures
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists lures_delete on public.lures;
create policy lures_delete on public.lures
for delete to authenticated
using (user_id = auth.uid());

-- groundbaits
drop policy if exists groundbaits_select on public.groundbaits;
create policy groundbaits_select on public.groundbaits
for select to authenticated
using (user_id = auth.uid() and deleted_at is null);

drop policy if exists groundbaits_insert on public.groundbaits;
create policy groundbaits_insert on public.groundbaits
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists groundbaits_update on public.groundbaits;
create policy groundbaits_update on public.groundbaits
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists groundbaits_delete on public.groundbaits;
create policy groundbaits_delete on public.groundbaits
for delete to authenticated
using (user_id = auth.uid());
```

### 4.5. Polityki RLS (tabele zależne przez `trip_id`)

Zasada z notatek: rekordy zależne są **niewidoczne**, jeśli wyprawa jest soft-deleted (`trips.deleted_at is null`).

```sql
-- trip_rods / trip_lures / trip_groundbaits
drop policy if exists trip_rods_all on public.trip_rods;
create policy trip_rods_all on public.trip_rods
for all to authenticated
using (
  exists (
    select 1 from public.trips t
    where t.id = trip_rods.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
)
with check (
  exists (
    select 1 from public.trips t
    where t.id = trip_rods.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists trip_lures_all on public.trip_lures;
create policy trip_lures_all on public.trip_lures
for all to authenticated
using (
  exists (
    select 1 from public.trips t
    where t.id = trip_lures.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
)
with check (
  exists (
    select 1 from public.trips t
    where t.id = trip_lures.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists trip_groundbaits_all on public.trip_groundbaits;
create policy trip_groundbaits_all on public.trip_groundbaits
for all to authenticated
using (
  exists (
    select 1 from public.trips t
    where t.id = trip_groundbaits.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
)
with check (
  exists (
    select 1 from public.trips t
    where t.id = trip_groundbaits.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

-- catches (soft-delete na poziomie rekordów połowów)
drop policy if exists catches_select on public.catches;
create policy catches_select on public.catches
for select to authenticated
using (
  deleted_at is null
  and exists (
    select 1 from public.trips t
    where t.id = catches.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists catches_insert on public.catches;
create policy catches_insert on public.catches
for insert to authenticated
with check (
  exists (
    select 1 from public.trips t
    where t.id = catches.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists catches_update on public.catches;
create policy catches_update on public.catches
for update to authenticated
using (
  exists (
    select 1 from public.trips t
    where t.id = catches.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
)
with check (
  exists (
    select 1 from public.trips t
    where t.id = catches.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

drop policy if exists catches_delete on public.catches;
create policy catches_delete on public.catches
for delete to authenticated
using (
  exists (
    select 1 from public.trips t
    where t.id = catches.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

-- weather_snapshots
drop policy if exists weather_snapshots_all on public.weather_snapshots;
create policy weather_snapshots_all on public.weather_snapshots
for all to authenticated
using (
  exists (
    select 1 from public.trips t
    where t.id = weather_snapshots.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
)
with check (
  exists (
    select 1 from public.trips t
    where t.id = weather_snapshots.trip_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  )
);

-- weather_hours (przez snapshot -> trip)
drop policy if exists weather_hours_all on public.weather_hours;
create policy weather_hours_all on public.weather_hours
for all to authenticated
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
```

---

## 5. Dodatkowe uwagi / decyzje projektowe

- **Soft-delete**:
  - **`trips`, `rods`, `lures`, `groundbaits`** używają `deleted_at`.
  - **Rekordy zależne** (połowy/pogoda/łączniki) stają się niewidoczne po soft-delete wyprawy przez RLS (`trips.deleted_at is null` w policy).
  - `catches.deleted_at` umożliwia “kosz” na poziomie połowów (opcjonalne UX; można pominąć i usuwać fizycznie).

- **Historyczna niezmienność sprzętu**:
  - Snapshoty nazw w `catches` i tabelach łącznikowych zapewniają stabilny widok historii po rename/soft-delete sprzętu.
  - Triggery wypełniają snapshoty na INSERT i blokują ich zmianę na UPDATE.

- **No cross-user FK (twardo)**:
  - Triggery blokują przypięcie sprzętu należącego do innego użytkownika niż właściciel wyprawy.

- **Czasy**:
  - Wszystkie czasy domenowe jako `timestamptz` (UTC). Konwersja do strefy użytkownika po stronie UI.

- **Walidacja `caught_at` w zakresie wyprawy**:
  - Zgodnie z notatkami: minimum walidacja aplikacyjna. Jeśli chcesz wymuszać w DB, można dodać trigger sprawdzający `caught_at` względem `started_at/ended_at`.

- **Pogoda “aktualna” dla wyprawy**:
  - Reguła biznesowa (aplikacja): preferuj snapshot `manual`, inaczej najnowszy `api` (`fetched_at desc`). Opcjonalnie można dodać widok `trip_weather_current_snapshot` (`distinct on (trip_id)` z odpowiednim sortowaniem).

- **Unikalność nazw sprzętu a soft-delete**:
  - W tym planie jest **strict** `unique(user_id, lower(name))` (nawet po soft-delete nie pozwala na ponowne użycie nazwy).
  - Jeśli chcesz pozwolić na ponowne użycie nazwy po soft-delete, zmień indeksy unikalne na **partial** z `where deleted_at is null`.


