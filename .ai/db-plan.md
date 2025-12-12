# Schemat bazy danych PostgreSQL — Dziennik Wędkarski MVP

## 1. Wymagane rozszerzenia

```sql
-- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## 2. Tabele

### 2.1. fish_species (słownik gatunków — globalny, read-only)

| Kolumna      | Typ                      | Ograniczenia                     |
|--------------|--------------------------|----------------------------------|
| id           | uuid                     | PRIMARY KEY, DEFAULT gen_random_uuid() |
| name         | text                     | NOT NULL, UNIQUE                 |
| created_at   | timestamptz              | NOT NULL, DEFAULT now()          |

```sql
CREATE TABLE fish_species (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE fish_species IS 'Globalny słownik gatunków ryb (read-only dla aplikacji)';
```

---

### 2.2. rods (wędki użytkownika)

| Kolumna      | Typ                      | Ograniczenia                     |
|--------------|--------------------------|----------------------------------|
| id           | uuid                     | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id      | uuid                     | NOT NULL, FK → auth.users(id)    |
| name         | text                     | NOT NULL                         |
| deleted_at   | timestamptz              | NULL (soft-delete)               |
| created_at   | timestamptz              | NOT NULL, DEFAULT now()          |
| updated_at   | timestamptz              | NOT NULL, DEFAULT now()          |

```sql
CREATE TABLE rods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unikalność nazwy per user (tylko aktywne rekordy)
CREATE UNIQUE INDEX rods_user_name_unique 
    ON rods (user_id, lower(name)) 
    WHERE deleted_at IS NULL;

COMMENT ON TABLE rods IS 'Wędki użytkownika z soft-delete';
```

---

### 2.3. lures (przynęty użytkownika)

| Kolumna      | Typ                      | Ograniczenia                     |
|--------------|--------------------------|----------------------------------|
| id           | uuid                     | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id      | uuid                     | NOT NULL, FK → auth.users(id)    |
| name         | text                     | NOT NULL                         |
| deleted_at   | timestamptz              | NULL (soft-delete)               |
| created_at   | timestamptz              | NOT NULL, DEFAULT now()          |
| updated_at   | timestamptz              | NOT NULL, DEFAULT now()          |

```sql
CREATE TABLE lures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX lures_user_name_unique 
    ON lures (user_id, lower(name)) 
    WHERE deleted_at IS NULL;

COMMENT ON TABLE lures IS 'Przynęty użytkownika z soft-delete';
```

---

### 2.4. groundbaits (zanęty użytkownika)

| Kolumna      | Typ                      | Ograniczenia                     |
|--------------|--------------------------|----------------------------------|
| id           | uuid                     | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id      | uuid                     | NOT NULL, FK → auth.users(id)    |
| name         | text                     | NOT NULL                         |
| deleted_at   | timestamptz              | NULL (soft-delete)               |
| created_at   | timestamptz              | NOT NULL, DEFAULT now()          |
| updated_at   | timestamptz              | NOT NULL, DEFAULT now()          |

```sql
CREATE TABLE groundbaits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX groundbaits_user_name_unique 
    ON groundbaits (user_id, lower(name)) 
    WHERE deleted_at IS NULL;

COMMENT ON TABLE groundbaits IS 'Zanęty użytkownika z soft-delete';
```

---

### 2.5. trips (wyprawy)

| Kolumna        | Typ              | Ograniczenia                                       |
|----------------|------------------|----------------------------------------------------|
| id             | uuid             | PRIMARY KEY, DEFAULT gen_random_uuid()             |
| user_id        | uuid             | NOT NULL, FK → auth.users(id)                      |
| started_at     | timestamptz      | NOT NULL                                           |
| ended_at       | timestamptz      | NULL                                               |
| status         | text             | NOT NULL, DEFAULT 'active', CHECK (status IN ('draft', 'active', 'closed')) |
| location_lat   | double precision | NULL                                               |
| location_lng   | double precision | NULL                                               |
| location_label | text             | NULL                                               |
| deleted_at     | timestamptz      | NULL (soft-delete)                                 |
| created_at     | timestamptz      | NOT NULL, DEFAULT now()                            |
| updated_at     | timestamptz      | NOT NULL, DEFAULT now()                            |

**Ograniczenia CHECK:**
- `ended_at IS NULL OR ended_at >= started_at`
- `status != 'closed' OR ended_at IS NOT NULL` (closed wymaga ended_at)
- `(location_lat IS NULL) = (location_lng IS NULL)` (oba null lub oba nie-null)

```sql
CREATE TABLE trips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at timestamptz NOT NULL,
    ended_at timestamptz,
    status text NOT NULL DEFAULT 'active',
    location_lat double precision,
    location_lng double precision,
    location_label text,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT trips_status_check 
        CHECK (status IN ('draft', 'active', 'closed')),
    CONSTRAINT trips_ended_after_started 
        CHECK (ended_at IS NULL OR ended_at >= started_at),
    CONSTRAINT trips_closed_requires_ended 
        CHECK (status != 'closed' OR ended_at IS NOT NULL),
    CONSTRAINT trips_location_both_or_none 
        CHECK ((location_lat IS NULL) = (location_lng IS NULL))
);

COMMENT ON TABLE trips IS 'Wyprawy wędkarskie użytkownika';
```

---

### 2.6. catches (połowy / trofea)

| Kolumna                   | Typ          | Ograniczenia                              |
|---------------------------|--------------|-------------------------------------------|
| id                        | uuid         | PRIMARY KEY, DEFAULT gen_random_uuid()    |
| trip_id                   | uuid         | NOT NULL, FK → trips(id)                  |
| caught_at                 | timestamptz  | NOT NULL                                  |
| species_id                | uuid         | NOT NULL, FK → fish_species(id)           |
| lure_id                   | uuid         | NOT NULL, FK → lures(id)                  |
| groundbait_id             | uuid         | NOT NULL, FK → groundbaits(id)            |
| lure_name_snapshot        | text         | NOT NULL                                  |
| groundbait_name_snapshot  | text         | NOT NULL                                  |
| weight_g                  | integer      | NULL, CHECK (weight_g > 0)                |
| length_mm                 | integer      | NULL, CHECK (length_mm > 0)               |
| photo_path                | text         | NULL                                      |
| created_at                | timestamptz  | NOT NULL, DEFAULT now()                   |
| updated_at                | timestamptz  | NOT NULL, DEFAULT now()                   |

```sql
CREATE TABLE catches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    caught_at timestamptz NOT NULL,
    species_id uuid NOT NULL REFERENCES fish_species(id),
    lure_id uuid NOT NULL REFERENCES lures(id),
    groundbait_id uuid NOT NULL REFERENCES groundbaits(id),
    lure_name_snapshot text NOT NULL,
    groundbait_name_snapshot text NOT NULL,
    weight_g integer,
    length_mm integer,
    photo_path text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT catches_weight_positive 
        CHECK (weight_g IS NULL OR weight_g > 0),
    CONSTRAINT catches_length_positive 
        CHECK (length_mm IS NULL OR length_mm > 0)
);

COMMENT ON TABLE catches IS 'Złowione ryby (trofea) w ramach wyprawy';
COMMENT ON COLUMN catches.lure_name_snapshot IS 'Snapshot nazwy przynęty w momencie zapisu';
COMMENT ON COLUMN catches.groundbait_name_snapshot IS 'Snapshot nazwy zanęty w momencie zapisu';
COMMENT ON COLUMN catches.weight_g IS 'Waga w gramach';
COMMENT ON COLUMN catches.length_mm IS 'Długość w milimetrach';
COMMENT ON COLUMN catches.photo_path IS 'Ścieżka do zdjęcia w Supabase Storage';
```

---

### 2.7. trip_rods (wędki użyte w wyprawie — junction table)

| Kolumna           | Typ          | Ograniczenia                           |
|-------------------|--------------|----------------------------------------|
| id                | uuid         | PRIMARY KEY, DEFAULT gen_random_uuid() |
| trip_id           | uuid         | NOT NULL, FK → trips(id)               |
| rod_id            | uuid         | NOT NULL, FK → rods(id)                |
| rod_name_snapshot | text         | NOT NULL                               |
| created_at        | timestamptz  | NOT NULL, DEFAULT now()                |

```sql
CREATE TABLE trip_rods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    rod_id uuid NOT NULL REFERENCES rods(id),
    rod_name_snapshot text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT trip_rods_unique UNIQUE (trip_id, rod_id)
);

COMMENT ON TABLE trip_rods IS 'Wędki przypisane do wyprawy (multiselect)';
```

---

### 2.8. trip_lures (przynęty użyte w wyprawie — junction table)

| Kolumna            | Typ          | Ograniczenia                           |
|--------------------|--------------|----------------------------------------|
| id                 | uuid         | PRIMARY KEY, DEFAULT gen_random_uuid() |
| trip_id            | uuid         | NOT NULL, FK → trips(id)               |
| lure_id            | uuid         | NOT NULL, FK → lures(id)               |
| lure_name_snapshot | text         | NOT NULL                               |
| created_at         | timestamptz  | NOT NULL, DEFAULT now()                |

```sql
CREATE TABLE trip_lures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    lure_id uuid NOT NULL REFERENCES lures(id),
    lure_name_snapshot text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT trip_lures_unique UNIQUE (trip_id, lure_id)
);

COMMENT ON TABLE trip_lures IS 'Przynęty przypisane do wyprawy (multiselect)';
```

---

### 2.9. trip_groundbaits (zanęty użyte w wyprawie — junction table)

| Kolumna                  | Typ          | Ograniczenia                           |
|--------------------------|--------------|----------------------------------------|
| id                       | uuid         | PRIMARY KEY, DEFAULT gen_random_uuid() |
| trip_id                  | uuid         | NOT NULL, FK → trips(id)               |
| groundbait_id            | uuid         | NOT NULL, FK → groundbaits(id)         |
| groundbait_name_snapshot | text         | NOT NULL                               |
| created_at               | timestamptz  | NOT NULL, DEFAULT now()                |

```sql
CREATE TABLE trip_groundbaits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    groundbait_id uuid NOT NULL REFERENCES groundbaits(id),
    groundbait_name_snapshot text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT trip_groundbaits_unique UNIQUE (trip_id, groundbait_id)
);

COMMENT ON TABLE trip_groundbaits IS 'Zanęty przypisane do wyprawy (multiselect)';
```

---

### 2.10. weather_snapshots (snapshoty pogodowe)

| Kolumna      | Typ          | Ograniczenia                           |
|--------------|--------------|----------------------------------------|
| id           | uuid         | PRIMARY KEY, DEFAULT gen_random_uuid() |
| trip_id      | uuid         | NOT NULL, FK → trips(id)               |
| source       | text         | NOT NULL, CHECK (source IN ('api', 'manual')) |
| fetched_at   | timestamptz  | NOT NULL                               |
| period_start | timestamptz  | NOT NULL                               |
| period_end   | timestamptz  | NOT NULL                               |
| created_at   | timestamptz  | NOT NULL, DEFAULT now()                |

```sql
CREATE TABLE weather_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    source text NOT NULL,
    fetched_at timestamptz NOT NULL,
    period_start timestamptz NOT NULL,
    period_end timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT weather_snapshots_source_check 
        CHECK (source IN ('api', 'manual')),
    CONSTRAINT weather_snapshots_period_valid 
        CHECK (period_end >= period_start)
);

COMMENT ON TABLE weather_snapshots IS 'Snapshoty pogodowe dla wypraw (API lub manualne)';
```

---

### 2.11. weather_hours (dane godzinowe pogody)

| Kolumna          | Typ            | Ograniczenia                              |
|------------------|----------------|-------------------------------------------|
| id               | uuid           | PRIMARY KEY, DEFAULT gen_random_uuid()    |
| snapshot_id      | uuid           | NOT NULL, FK → weather_snapshots(id)      |
| observed_at      | timestamptz    | NOT NULL                                  |
| temperature_c    | numeric(4,1)   | NULL, CHECK (-100 ≤ x ≤ 100)              |
| pressure_hpa     | integer        | NULL, CHECK (800 ≤ x ≤ 1200)              |
| wind_speed_kmh   | numeric(5,1)   | NULL, CHECK (x ≥ 0)                       |
| wind_direction   | integer        | NULL, CHECK (0 ≤ x ≤ 360)                 |
| humidity_percent | integer        | NULL, CHECK (0 ≤ x ≤ 100)                 |
| precipitation_mm | numeric(5,1)   | NULL, CHECK (x ≥ 0)                       |
| cloud_cover      | integer        | NULL, CHECK (0 ≤ x ≤ 100)                 |
| weather_icon     | text           | NULL                                      |
| weather_text     | text           | NULL                                      |
| created_at       | timestamptz    | NOT NULL, DEFAULT now()                   |

```sql
CREATE TABLE weather_hours (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id uuid NOT NULL REFERENCES weather_snapshots(id) ON DELETE CASCADE,
    observed_at timestamptz NOT NULL,
    temperature_c numeric(4,1),
    pressure_hpa integer,
    wind_speed_kmh numeric(5,1),
    wind_direction integer,
    humidity_percent integer,
    precipitation_mm numeric(5,1),
    cloud_cover integer,
    weather_icon text,
    weather_text text,
    created_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT weather_hours_unique UNIQUE (snapshot_id, observed_at),
    CONSTRAINT weather_hours_temp_range 
        CHECK (temperature_c IS NULL OR (temperature_c >= -100 AND temperature_c <= 100)),
    CONSTRAINT weather_hours_pressure_range 
        CHECK (pressure_hpa IS NULL OR (pressure_hpa >= 800 AND pressure_hpa <= 1200)),
    CONSTRAINT weather_hours_wind_speed_positive 
        CHECK (wind_speed_kmh IS NULL OR wind_speed_kmh >= 0),
    CONSTRAINT weather_hours_wind_direction_range 
        CHECK (wind_direction IS NULL OR (wind_direction >= 0 AND wind_direction <= 360)),
    CONSTRAINT weather_hours_humidity_range 
        CHECK (humidity_percent IS NULL OR (humidity_percent >= 0 AND humidity_percent <= 100)),
    CONSTRAINT weather_hours_precipitation_positive 
        CHECK (precipitation_mm IS NULL OR precipitation_mm >= 0),
    CONSTRAINT weather_hours_cloud_cover_range 
        CHECK (cloud_cover IS NULL OR (cloud_cover >= 0 AND cloud_cover <= 100))
);

COMMENT ON TABLE weather_hours IS 'Dane pogodowe godzinowe (timeline)';
COMMENT ON COLUMN weather_hours.temperature_c IS 'Temperatura w °C';
COMMENT ON COLUMN weather_hours.pressure_hpa IS 'Ciśnienie atmosferyczne w hPa';
COMMENT ON COLUMN weather_hours.wind_speed_kmh IS 'Prędkość wiatru w km/h';
COMMENT ON COLUMN weather_hours.wind_direction IS 'Kierunek wiatru w stopniach (0-360)';
COMMENT ON COLUMN weather_hours.humidity_percent IS 'Wilgotność względna w %';
COMMENT ON COLUMN weather_hours.precipitation_mm IS 'Opady w mm';
COMMENT ON COLUMN weather_hours.cloud_cover IS 'Zachmurzenie w %';
```

---

## 3. Relacje między tabelami

```
┌──────────────────┐
│   auth.users     │
└────────┬─────────┘
         │ 1
         │
    ┌────┴────┬─────────────┬─────────────┐
    │         │             │             │
    ▼ N       ▼ N           ▼ N           ▼ N
┌───────┐  ┌───────┐   ┌────────────┐  ┌───────┐
│ trips │  │ rods  │   │   lures    │  │ground-│
│       │  │       │   │            │  │baits  │
└───┬───┘  └───┬───┘   └─────┬──────┘  └───┬───┘
    │          │             │             │
    │ 1        │             │             │
    │          └─────┬───────┴─────┬───────┘
    │                │             │
    ├────────────────┼─────────────┤
    │                │             │
    ▼ N              ▼ N           ▼ N
┌─────────┐    ┌──────────┐   ┌─────────────┐
│trip_rods│    │trip_lures│   │trip_ground- │
│         │    │          │   │baits        │
└─────────┘    └──────────┘   └─────────────┘
    │
    │
    ├────────────────────┐
    │ 1                  │ 1
    ▼ N                  ▼ N
┌─────────┐        ┌──────────────────┐
│ catches │        │ weather_snapshots│
└────┬────┘        └────────┬─────────┘
     │                      │ 1
     │                      ▼ N
     │                ┌─────────────┐
     │                │weather_hours│
     │                └─────────────┘
     │
     ▼ N:1
┌─────────────┐
│fish_species │
└─────────────┘
```

### Kardynalność relacji:

| Relacja | Kardynalność | Opis |
|---------|--------------|------|
| auth.users → trips | 1:N | Użytkownik ma wiele wypraw |
| auth.users → rods | 1:N | Użytkownik ma wiele wędek |
| auth.users → lures | 1:N | Użytkownik ma wiele przynęt |
| auth.users → groundbaits | 1:N | Użytkownik ma wiele zanęt |
| trips → catches | 1:N | Wyprawa ma wiele połowów |
| trips → weather_snapshots | 1:N | Wyprawa może mieć wiele snapshotów pogody |
| weather_snapshots → weather_hours | 1:N | Snapshot ma wiele rekordów godzinowych |
| trips ↔ rods | N:M | Wiele wędek na wyprawie (przez trip_rods) |
| trips ↔ lures | N:M | Wiele przynęt na wyprawie (przez trip_lures) |
| trips ↔ groundbaits | N:M | Wiele zanęt na wyprawie (przez trip_groundbaits) |
| catches → fish_species | N:1 | Połów ma jeden gatunek |
| catches → lures | N:1 | Połów na jedną przynętę |
| catches → groundbaits | N:1 | Połów na jedną zanętę |

---

## 4. Indeksy

```sql
-- Trips: dashboard (ostatnie wyprawy użytkownika)
CREATE INDEX idx_trips_user_started 
    ON trips (user_id, started_at DESC) 
    WHERE deleted_at IS NULL;

-- Trips: filtrowanie po statusie
CREATE INDEX idx_trips_user_status 
    ON trips (user_id, status) 
    WHERE deleted_at IS NULL;

-- Catches: lista połowów per wyprawa
CREATE INDEX idx_catches_trip_caught 
    ON catches (trip_id, caught_at);

-- Catches: statystyki per gatunek
CREATE INDEX idx_catches_species 
    ON catches (species_id);

-- Weather snapshots: per wyprawa
CREATE INDEX idx_weather_snapshots_trip 
    ON weather_snapshots (trip_id);

-- Weather hours: per snapshot + czas
CREATE INDEX idx_weather_hours_snapshot_observed 
    ON weather_hours (snapshot_id, observed_at);

-- Junction tables: lookup by trip
CREATE INDEX idx_trip_rods_trip ON trip_rods (trip_id);
CREATE INDEX idx_trip_lures_trip ON trip_lures (trip_id);
CREATE INDEX idx_trip_groundbaits_trip ON trip_groundbaits (trip_id);

-- Equipment: user's active items
CREATE INDEX idx_rods_user_active 
    ON rods (user_id) 
    WHERE deleted_at IS NULL;
CREATE INDEX idx_lures_user_active 
    ON lures (user_id) 
    WHERE deleted_at IS NULL;
CREATE INDEX idx_groundbaits_user_active 
    ON groundbaits (user_id) 
    WHERE deleted_at IS NULL;
```

---

## 5. Funkcje i triggery

### 5.1. Trigger do automatycznej aktualizacji updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplikuj do tabel z updated_at
CREATE TRIGGER set_updated_at_trips
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_catches
    BEFORE UPDATE ON catches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_rods
    BEFORE UPDATE ON rods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_lures
    BEFORE UPDATE ON lures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_groundbaits
    BEFORE UPDATE ON groundbaits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 5.2. Trigger blokujący cross-user FK w catches

```sql
CREATE OR REPLACE FUNCTION check_catch_owner_consistency()
RETURNS TRIGGER AS $$
DECLARE
    v_trip_user_id uuid;
    v_lure_user_id uuid;
    v_groundbait_user_id uuid;
BEGIN
    -- Pobierz właściciela wyprawy
    SELECT user_id INTO v_trip_user_id FROM trips WHERE id = NEW.trip_id;
    
    -- Pobierz właścicieli sprzętu
    SELECT user_id INTO v_lure_user_id FROM lures WHERE id = NEW.lure_id;
    SELECT user_id INTO v_groundbait_user_id FROM groundbaits WHERE id = NEW.groundbait_id;
    
    -- Sprawdź spójność
    IF v_lure_user_id != v_trip_user_id THEN
        RAISE EXCEPTION 'Przynęta należy do innego użytkownika';
    END IF;
    
    IF v_groundbait_user_id != v_trip_user_id THEN
        RAISE EXCEPTION 'Zanęta należy do innego użytkownika';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_catch_owner
    BEFORE INSERT OR UPDATE ON catches
    FOR EACH ROW
    EXECUTE FUNCTION check_catch_owner_consistency();
```

### 5.3. Trigger blokujący cross-user FK w junction tables

```sql
CREATE OR REPLACE FUNCTION check_trip_equipment_owner()
RETURNS TRIGGER AS $$
DECLARE
    v_trip_user_id uuid;
    v_item_user_id uuid;
BEGIN
    SELECT user_id INTO v_trip_user_id FROM trips WHERE id = NEW.trip_id;
    
    -- Dynamiczne sprawdzenie w zależności od tabeli
    IF TG_TABLE_NAME = 'trip_rods' THEN
        SELECT user_id INTO v_item_user_id FROM rods WHERE id = NEW.rod_id;
    ELSIF TG_TABLE_NAME = 'trip_lures' THEN
        SELECT user_id INTO v_item_user_id FROM lures WHERE id = NEW.lure_id;
    ELSIF TG_TABLE_NAME = 'trip_groundbaits' THEN
        SELECT user_id INTO v_item_user_id FROM groundbaits WHERE id = NEW.groundbait_id;
    END IF;
    
    IF v_item_user_id != v_trip_user_id THEN
        RAISE EXCEPTION 'Sprzęt należy do innego użytkownika';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_trip_rods_owner
    BEFORE INSERT OR UPDATE ON trip_rods
    FOR EACH ROW
    EXECUTE FUNCTION check_trip_equipment_owner();

CREATE TRIGGER check_trip_lures_owner
    BEFORE INSERT OR UPDATE ON trip_lures
    FOR EACH ROW
    EXECUTE FUNCTION check_trip_equipment_owner();

CREATE TRIGGER check_trip_groundbaits_owner
    BEFORE INSERT OR UPDATE ON trip_groundbaits
    FOR EACH ROW
    EXECUTE FUNCTION check_trip_equipment_owner();
```

---

## 6. Row Level Security (RLS)

### 6.1. Włączenie RLS

```sql
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE catches ENABLE ROW LEVEL SECURITY;
ALTER TABLE rods ENABLE ROW LEVEL SECURITY;
ALTER TABLE lures ENABLE ROW LEVEL SECURITY;
ALTER TABLE groundbaits ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_rods ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_lures ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_groundbaits ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE fish_species ENABLE ROW LEVEL SECURITY;
```

### 6.2. Polityki dla fish_species (słownik globalny — read-only)

```sql
-- Każdy zalogowany użytkownik może czytać
CREATE POLICY "fish_species_select" ON fish_species
    FOR SELECT
    TO authenticated
    USING (true);

-- Brak INSERT/UPDATE/DELETE dla użytkowników (zarządzane przez migracje)
```

### 6.3. Polityki dla tabel sprzętu (rods, lures, groundbaits)

```sql
-- RODS
CREATE POLICY "rods_select" ON rods
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "rods_insert" ON rods
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "rods_update" ON rods
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "rods_delete" ON rods
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- LURES
CREATE POLICY "lures_select" ON lures
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "lures_insert" ON lures
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "lures_update" ON lures
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "lures_delete" ON lures
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- GROUNDBAITS
CREATE POLICY "groundbaits_select" ON groundbaits
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "groundbaits_insert" ON groundbaits
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "groundbaits_update" ON groundbaits
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "groundbaits_delete" ON groundbaits
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
```

### 6.4. Polityki dla trips

```sql
CREATE POLICY "trips_select" ON trips
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "trips_insert" ON trips
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "trips_update" ON trips
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "trips_delete" ON trips
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
```

### 6.5. Polityki dla catches (przez trip_id)

```sql
CREATE POLICY "catches_select" ON catches
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = catches.trip_id 
              AND trips.user_id = auth.uid()
              AND trips.deleted_at IS NULL
        )
    );

CREATE POLICY "catches_insert" ON catches
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = catches.trip_id 
              AND trips.user_id = auth.uid()
              AND trips.deleted_at IS NULL
        )
    );

CREATE POLICY "catches_update" ON catches
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = catches.trip_id 
              AND trips.user_id = auth.uid()
              AND trips.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = catches.trip_id 
              AND trips.user_id = auth.uid()
              AND trips.deleted_at IS NULL
        )
    );

CREATE POLICY "catches_delete" ON catches
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = catches.trip_id 
              AND trips.user_id = auth.uid()
              AND trips.deleted_at IS NULL
        )
    );
```

### 6.6. Polityki dla junction tables (trip_rods, trip_lures, trip_groundbaits)

```sql
-- TRIP_RODS
CREATE POLICY "trip_rods_select" ON trip_rods
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = trip_rods.trip_id 
              AND trips.user_id = auth.uid()
              AND trips.deleted_at IS NULL
        )
    );

CREATE POLICY "trip_rods_insert" ON trip_rods
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = trip_rods.trip_id 
              AND trips.user_id = auth.uid()
              AND trips.deleted_at IS NULL
        )
    );

CREATE POLICY "trip_rods_delete" ON trip_rods
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = trip_rods.trip_id 
              AND trips.user_id = auth.uid()
              AND trips.deleted_at IS NULL
        )
    );

-- TRIP_LURES
CREATE POLICY "trip_lures_select" ON trip_lures
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = trip_lures.trip_id 
              AND trips.user_id = auth.uid()
              AND trips.deleted_at IS NULL
        )
    );

CREATE POLICY "trip_lures_insert" ON trip_lures
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = trip_lures.trip_id 
              AND trips.user_id = auth.uid()
              AND trips.deleted_at IS NULL
        )
    );

CREATE POLICY "trip_lures_delete" ON trip_lures
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = trip_lures.trip_id 
              AND trips.user_id = auth.uid()
              AND trips.deleted_at IS NULL
        )
    );

-- TRIP_GROUNDBAITS
CREATE POLICY "trip_groundbaits_select" ON trip_groundbaits
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = trip_groundbaits.trip_id 
              AND trips.user_id = auth.uid()
              AND trips.deleted_at IS NULL
        )
    );

CREATE POLICY "trip_groundbaits_insert" ON trip_groundbaits
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = trip_groundbaits.trip_id 
              AND trips.user_id = auth.uid()
              AND trips.deleted_at IS NULL
        )
    );

CREATE POLICY "trip_groundbaits_delete" ON trip_groundbaits
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = trip_groundbaits.trip_id 
              AND trips.user_id = auth.uid()
              AND trips.deleted_at IS NULL
        )
    );
```

### 6.7. Polityki dla weather_snapshots i weather_hours

```sql
-- WEATHER_SNAPSHOTS
CREATE POLICY "weather_snapshots_select" ON weather_snapshots
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = weather_snapshots.trip_id 
              AND trips.user_id = auth.uid()
              AND trips.deleted_at IS NULL
        )
    );

CREATE POLICY "weather_snapshots_insert" ON weather_snapshots
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = weather_snapshots.trip_id 
              AND trips.user_id = auth.uid()
              AND trips.deleted_at IS NULL
        )
    );

CREATE POLICY "weather_snapshots_delete" ON weather_snapshots
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = weather_snapshots.trip_id 
              AND trips.user_id = auth.uid()
              AND trips.deleted_at IS NULL
        )
    );

-- WEATHER_HOURS
CREATE POLICY "weather_hours_select" ON weather_hours
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM weather_snapshots ws
            JOIN trips t ON t.id = ws.trip_id
            WHERE ws.id = weather_hours.snapshot_id 
              AND t.user_id = auth.uid()
              AND t.deleted_at IS NULL
        )
    );

CREATE POLICY "weather_hours_insert" ON weather_hours
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM weather_snapshots ws
            JOIN trips t ON t.id = ws.trip_id
            WHERE ws.id = weather_hours.snapshot_id 
              AND t.user_id = auth.uid()
              AND t.deleted_at IS NULL
        )
    );

CREATE POLICY "weather_hours_delete" ON weather_hours
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM weather_snapshots ws
            JOIN trips t ON t.id = ws.trip_id
            WHERE ws.id = weather_hours.snapshot_id 
              AND t.user_id = auth.uid()
              AND t.deleted_at IS NULL
        )
    );
```

---

## 7. Supabase Storage — konwencja i polityki

### 7.1. Struktura buckets

```
catch-photos/
└── {user_id}/
    └── {catch_id}.jpg
```

### 7.2. Polityki Storage

```sql
-- Bucket: catch-photos (publiczny odczyt, prywatny zapis)

-- SELECT: użytkownik może czytać tylko swoje zdjęcia
CREATE POLICY "catch_photos_select" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'catch-photos' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- INSERT: użytkownik może dodawać tylko do swojego folderu
CREATE POLICY "catch_photos_insert" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'catch-photos' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- DELETE: użytkownik może usuwać tylko swoje zdjęcia
CREATE POLICY "catch_photos_delete" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'catch-photos' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
```

---

## 8. Dodatkowe uwagi i decyzje projektowe

### 8.1. Snapshoty nazw sprzętu

Wszystkie tabele powiązane ze sprzętem (`catches`, `trip_rods`, `trip_lures`, `trip_groundbaits`) zawierają kolumny `*_name_snapshot`. Są one wypełniane w momencie tworzenia rekordu aktualną nazwą sprzętu. Dzięki temu:
- Zmiana nazwy sprzętu nie wpływa na dane historyczne
- Usunięcie (soft-delete) sprzętu nie psuje wyświetlania historii

### 8.2. Soft-delete

Tabele `trips`, `rods`, `lures`, `groundbaits` używają kolumny `deleted_at` zamiast fizycznego usuwania:
- Zachowuje integralność referencyjną
- Umożliwia "przywrócenie" omyłkowo usuniętych danych
- Upraszcza audyt

### 8.3. Multi-user od początku

Mimo że MVP jest dla jednego użytkownika, schemat jest zaprojektowany jako multi-user:
- Każda tabela domenowa ma `user_id` (lub jest powiązana przez `trip_id`)
- RLS izoluje dane per użytkownika
- Łatwe skalowanie do wielu użytkowników w przyszłości

### 8.4. Walidacja caught_at

Zgodnie z decyzją z sesji planowania, walidacja czy `caught_at` mieści się w zakresie `started_at`/`ended_at` wyprawy jest realizowana na poziomie aplikacji (nie w DB trigger). Jest to prostsze i pozwala na większą elastyczność UX.

### 8.5. Workflow statusów wyprawy

- **draft**: szkic wyprawy (opcjonalne, do rozważenia w UX)
- **active**: wyprawa w toku (domyślny status przy tworzeniu)
- **closed**: wyprawa zakończona (wymaga `ended_at`)

### 8.6. Wybór "aktualnej" pogody

Dla wyprawy z wieloma snapshotami pogodowymi:
1. Preferuj `source = 'manual'` (użytkownik wie lepiej)
2. W przeciwnym razie wybierz najnowszy snapshot API (`fetched_at DESC`)

Logika ta jest implementowana po stronie aplikacji, nie w bazie.

### 8.7. Jednostki miar

- **weight_g**: waga w gramach (integer)
- **length_mm**: długość w milimetrach (integer)
- **temperature_c**: temperatura w °C (numeric z 1 miejscem po przecinku)
- **pressure_hpa**: ciśnienie w hPa (integer)
- **wind_speed_kmh**: prędkość wiatru w km/h (numeric)
- **precipitation_mm**: opady w mm (numeric)

Wszystkie jednostki metryczne zgodnie z wymaganiami PRD.

### 8.8. Czasy

Wszystkie znaczniki czasu są przechowywane jako `timestamptz` (UTC). Konwersja na strefę czasową użytkownika odbywa się po stronie frontendu.

---

## 9. Diagram ERD (tekstowy)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              auth.users                                      │
│                                (Supabase)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
     ┌──────────────┼──────────────┬──────────────┬──────────────┐
     │              │              │              │              │
     ▼              ▼              ▼              ▼              │
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌────────────┐        │
│  trips  │   │  rods   │   │  lures  │   │ groundbaits│        │
└────┬────┘   └────┬────┘   └────┬────┘   └─────┬──────┘        │
     │              │              │              │              │
     │    ┌─────────┴──────────────┴──────────────┘              │
     │    │                                                      │
     │    ▼                                                      │
     │ ┌──────────────────────────────────────────┐              │
     │ │  trip_rods / trip_lures / trip_groundbaits│◄────────────┘
     │ │        (junction tables)                  │
     │ └──────────────────────────────────────────┘
     │
     ├────────────────┐
     │                │
     ▼                ▼
┌─────────┐    ┌───────────────────┐
│ catches │    │ weather_snapshots │
└────┬────┘    └────────┬──────────┘
     │                  │
     │                  ▼
     │           ┌─────────────┐
     │           │weather_hours│
     │           └─────────────┘
     │
     ▼
┌─────────────┐
│fish_species │
│  (global)   │
└─────────────┘
```

