# REST API Plan

This document defines a versioned REST API for the **Fishing Journal MVP** built on **Astro 5 + TypeScript + Supabase**. The database is protected with **RLS-first** policies and several invariants are enforced by constraints and triggers.

## Assumptions

- The app uses **Supabase Auth** (email/password or social). The REST API is a thin backend-for-frontend (BFF) that calls Supabase using the user session (JWT).
- Endpoints live under Astro routes: `src/pages/api/v1/**` and are deployed with the Node adapter.
- Soft-delete is the default for user equipment and trips (DB has `deleted_at`). The API exposes `DELETE` but implements it as **soft-delete** (sets `deleted_at`) unless explicitly stated otherwise.
- Weather provider (AccuWeather) calls are implemented server-side; the API stores immutable snapshots in DB (`weather_snapshots` + `weather_hours`).
- Photos are stored in Supabase Storage bucket `catch-photos` with object keys `{user_id}/{catch_id}.webp`. The API provides:
  - **Recommended**: Direct upload endpoint with server-side Sharp processing (resize, WebP conversion, EXIF stripping)
  - **Alternative**: Signed upload/download URL helpers for direct-to-storage workflow

---

## 1. Resources

- **FishSpecies** → `public.fish_species` (global dictionary, read-only for app users)
- **Rod** → `public.rods` (user-owned, soft-delete)
- **Lure** → `public.lures` (user-owned, soft-delete)
- **Groundbait** → `public.groundbaits` (user-owned, soft-delete)
- **Trip** → `public.trips` (user-owned, soft-delete)
- **Catch** → `public.catches` (scoped by `trip_id`)
- **TripRod** → `public.trip_rods` (trip↔rod assignment with snapshot)
- **TripLure** → `public.trip_lures` (trip↔lure assignment with snapshot)
- **TripGroundbait** → `public.trip_groundbaits` (trip↔groundbait assignment with snapshot)
- **WeatherSnapshot** → `public.weather_snapshots` (scoped by trip)
- **WeatherHour** → `public.weather_hours` (scoped by snapshot)
- **Media (CatchPhoto)** → Supabase Storage `catch-photos` bucket + `catches.photo_path`

---

## 2. Endpoints

### 2.0 Conventions (applies to all endpoints)

- **Base URL**: `/api/v1`
- **Auth**: `Authorization: Bearer <supabase_jwt>` (required unless explicitly public)
- **Content type**: requests and responses use `application/json` unless specified
- **Error format**:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Human-readable message (English)",
    "details": {
      "field": "name",
      "reason": "must not be empty"
    }
  }
}
```

- **Pagination**:
  - Default `limit=20`, max `limit=100`
  - Cursor pagination preferred for large lists:
    - `cursor` is an opaque string (e.g., base64-encoded `{sortValue,id}`)
  - When not needed, offset pagination is acceptable for small collections:
    - `offset`, `limit`
- **Sorting**:
  - `sort` and `order` (e.g., `sort=started_at&order=desc`)
  - Allowed sort keys are per-endpoint and validated

---

### 2.1 Auth & session

Supabase handles core login. The API provides session introspection and logout helpers.

#### GET `/auth/session`
- **Description**: Returns current user session summary (authenticated only).
- **Response 200**:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

- **Errors**: `401 unauthorized`

#### POST `/auth/logout`
- **Description**: Revokes session (server-side sign-out).
- **Response 204**: no content
- **Errors**: `401 unauthorized`

---

### 2.2 Fish species (dictionary)

#### GET `/fish-species`
- **Description**: List species (read-only).
- **Query**:
  - `q` (optional, substring match on name)
  - `limit`, `cursor`
  - `sort` (allowed: `name`, `created_at`), `order`
- **Response 200**:

```json
{
  "data": [
    { "id": "uuid", "name": "Pike", "created_at": "2025-01-01T00:00:00Z" }
  ],
  "page": { "limit": 20, "next_cursor": "..." }
}
```

- **Errors**: `401 unauthorized`

#### GET `/fish-species/{id}`
- **Response 200**:

```json
{ "id": "uuid", "name": "Pike", "created_at": "2025-01-01T00:00:00Z" }
```

- **Errors**: `401 unauthorized`, `404 not_found`

---

### 2.3 Equipment: rods / lures / groundbaits

These three resources share the same patterns and validations.

#### GET `/rods`
- **Query**:
  - `q` (optional, substring match on name)
  - `include_deleted` (optional boolean, default `false`)
  - `limit`, `cursor`
  - `sort` (allowed: `name`, `created_at`, `updated_at`), `order`
- **Response 200**:

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Rod A",
      "deleted_at": null,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "page": { "limit": 20, "next_cursor": "..." }
}
```

- **Errors**: `401 unauthorized`

#### POST `/rods`
- **Request**:

```json
{ "name": "Rod A" }
```

- **Response 201**: returns created rod
- **Errors**:
  - `400 validation_error` (empty name)
  - `409 conflict` (unique active name per user, case-insensitive)
  - `401 unauthorized`

#### GET `/rods/{id}`
- **Response 200**: rod object
- **Errors**: `401 unauthorized`, `404 not_found`

#### PATCH `/rods/{id}`
- **Request** (partial):

```json
{ "name": "New name" }
```

- **Response 200**: updated rod object
- **Errors**: `401 unauthorized`, `404 not_found`, `409 conflict`, `400 validation_error`

#### DELETE `/rods/{id}`
- **Description**: Soft-delete (sets `deleted_at=now()`).
- **Response 204**
- **Errors**:
  - `401 unauthorized`, `404 not_found`
  - `409 conflict` (optional, if you decide to block deleting items currently assigned to an active trip; DB does not require this, but UX may)

> Identical endpoint sets exist for: `/lures` and `/groundbaits`.

---

### 2.4 Trips (dashboard + lifecycle)

#### GET `/trips`
- **Description**: Dashboard list (recent trips).
- **Query**:
  - `status` (optional: `draft|active|closed`)
  - `from` / `to` (optional date range on `started_at`)
  - `include_deleted` (optional boolean, default `false`)
  - `limit`, `cursor`
  - `sort` (allowed: `started_at`, `created_at`, `updated_at`), `order`
- **Response 200**:

```json
{
  "data": [
    {
      "id": "uuid",
      "started_at": "2025-12-12T10:00:00Z",
      "ended_at": null,
      "status": "active",
      "location": {
        "lat": 52.1,
        "lng": 21.0,
        "label": "Lake XYZ"
      },
      "summary": {
        "catch_count": 3
      },
      "deleted_at": null,
      "created_at": "2025-12-12T10:00:00Z",
      "updated_at": "2025-12-12T10:00:00Z"
    }
  ],
  "page": { "limit": 20, "next_cursor": "..." }
}
```

Notes:
- `summary.catch_count` is computed (query/aggregate); not stored in DB.
- Sorting by `started_at desc` aligns with DB index `idx_trips_user_started`.

#### POST `/trips`
- **Description**: Create a trip.
- **Request**:

```json
{
  "started_at": "2025-12-12T10:00:00Z",
  "ended_at": null,
  "status": "active",
  "location": { "lat": 52.1, "lng": 21.0, "label": "Lake XYZ" },
  "copy_equipment_from_last_trip": true
}
```

- **Response 201**: trip object (without nested lists by default)
- **Errors**:
  - `400 validation_error` (invalid status, ended_at < started_at, only one of lat/lng, etc.)
  - `401 unauthorized`

#### POST `/trips/quick-start`
- **Description**: One-tap trip creation for the FAB. Sets `started_at=now()`, `status=active`, optionally copies equipment from latest non-deleted trip.
- **Request**:

```json
{ "use_gps": true, "copy_equipment_from_last_trip": true }
```

- **Response 201**:

```json
{
  "trip": { "...": "..." },
  "copied_equipment": {
    "rod_ids": ["uuid"],
    "lure_ids": ["uuid"],
    "groundbait_ids": ["uuid"]
  }
}
```

#### GET `/trips/{id}`
- **Query**:
  - `include` (optional CSV): `catches,rods,lures,groundbaits,weather_current`
- **Response 200**:

```json
{
  "id": "uuid",
  "started_at": "2025-12-12T10:00:00Z",
  "ended_at": null,
  "status": "active",
  "location": { "lat": 52.1, "lng": 21.0, "label": "Lake XYZ" },
  "equipment": {
    "rods": [{ "id": "uuid", "name_snapshot": "Rod A" }],
    "lures": [{ "id": "uuid", "name_snapshot": "Lure A" }],
    "groundbaits": [{ "id": "uuid", "name_snapshot": "Groundbait A" }]
  },
  "catches": [
    {
      "id": "uuid",
      "caught_at": "2025-12-12T11:00:00Z",
      "species": { "id": "uuid", "name": "Pike" },
      "lure": { "id": "uuid", "name_snapshot": "Lure A" },
      "groundbait": { "id": "uuid", "name_snapshot": "Groundbait A" },
      "weight_g": 1200,
      "length_mm": 650,
      "photo": { "path": "user_id/catch_id.jpg", "url": null }
    }
  ],
  "weather_current": null
}
```

#### PATCH `/trips/{id}`
- **Description**: Update mutable trip fields.
- **Request**:

```json
{
  "started_at": "2025-12-12T10:00:00Z",
  "ended_at": "2025-12-12T14:00:00Z",
  "status": "closed",
  "location": { "lat": 52.1, "lng": 21.0, "label": "Updated label" }
}
```

- **Success 200**: updated trip
- **Errors**:
  - `400 validation_error` (DB constraints: status enum, ended_at >= started_at, closed requires ended_at, lat/lng both or none)
  - `409 conflict` (optional: if trying to close trip while there are drafts/incomplete data, depending on UX)

#### POST `/trips/{id}/close`
- **Description**: Lifecycle operation to close a trip safely.
- **Request**:

```json
{ "ended_at": "2025-12-12T14:00:00Z" }
```

- **Response 200**: updated trip with `status=closed`
- **Errors**: `400 validation_error`, `401 unauthorized`, `404 not_found`

#### DELETE `/trips/{id}`
- **Description**: Soft-delete trip (sets `deleted_at=now()`).
- **Response 204**
- **Errors**: `401 unauthorized`, `404 not_found`

---

### 2.5 Trip equipment assignment (multi-select)

These endpoints manage junction tables; snapshots are filled by DB triggers.

#### GET `/trips/{tripId}/rods`
- **Response 200**:

```json
{
  "data": [
    {
      "id": "uuid",
      "rod_id": "uuid",
      "rod_name_snapshot": "Rod A",
      "created_at": "2025-12-12T10:05:00Z"
    }
  ]
}
```

#### PUT `/trips/{tripId}/rods`
- **Description**: Replace the whole selection (idempotent).
- **Request**:

```json
{ "rod_ids": ["uuid", "uuid"] }
```

- **Response 200**:

```json
{ "data": [{ "id": "uuid", "rod_id": "uuid", "rod_name_snapshot": "Rod A" }] }
```

- **Errors**:
  - `400 validation_error` (too many items, duplicates)
  - `409 conflict` (DB unique `(trip_id, rod_id)`; also triggers reject cross-user and soft-deleted rods)

#### POST `/trips/{tripId}/rods`
- **Description**: Add a single rod to selection.
- **Request**:

```json
{ "rod_id": "uuid" }
```

- **Response 201**: created `trip_rods` row
- **Errors**: `409 conflict`, `400 validation_error`

#### DELETE `/trips/{tripId}/rods/{rodId}`
- **Response 204**
- **Errors**: `404 not_found`

> Identical endpoint sets exist for:
> - `/trips/{tripId}/lures` (junction `trip_lures`)
> - `/trips/{tripId}/groundbaits` (junction `trip_groundbaits`)

---

### 2.6 Catches (trophies)

Notes:
- `lure_name_snapshot` and `groundbait_name_snapshot` are **computed by DB triggers**; the API must not accept them from clients.
- DB triggers also reject using **soft-deleted** lures/groundbaits and cross-user references.
- PRD states `caught_at` range validation (within trip start/end) is handled in the app/API (not DB). The API should enforce it to protect data quality.

#### GET `/trips/{tripId}/catches`
- **Query**:
  - `from` / `to` (optional range on `caught_at`)
  - `species_id` (optional)
  - `limit`, `cursor`
  - `sort` (allowed: `caught_at`, `created_at`), `order`
- **Response 200**:

```json
{
  "data": [
    {
      "id": "uuid",
      "trip_id": "uuid",
      "caught_at": "2025-12-12T11:00:00Z",
      "species_id": "uuid",
      "lure_id": "uuid",
      "groundbait_id": "uuid",
      "lure_name_snapshot": "Lure A",
      "groundbait_name_snapshot": "Groundbait A",
      "weight_g": 1200,
      "length_mm": 650,
      "photo_path": "user_id/catch_id.jpg",
      "created_at": "2025-12-12T11:01:00Z",
      "updated_at": "2025-12-12T11:01:00Z"
    }
  ],
  "page": { "limit": 20, "next_cursor": "..." }
}
```

#### POST `/trips/{tripId}/catches`
- **Request**:

```json
{
  "caught_at": "2025-12-12T11:00:00Z",
  "species_id": "uuid",
  "lure_id": "uuid",
  "groundbait_id": "uuid",
  "weight_g": 1200,
  "length_mm": 650
}
```

- **Response 201**: created catch
- **Errors**:
  - `400 validation_error` (missing required fields; weight/length <= 0; caught_at invalid)
  - `409 conflict` (equipment invalid for trip/user; handled by DB trigger → map to `409`)
  - `401 unauthorized`, `404 not_found` (trip not found or not accessible)

#### GET `/catches/{id}`
- **Response 200**: catch object
- **Errors**: `401 unauthorized`, `404 not_found`

#### PATCH `/catches/{id}`
- **Request** (partial; snapshots not allowed):

```json
{
  "caught_at": "2025-12-12T11:30:00Z",
  "species_id": "uuid",
  "lure_id": "uuid",
  "groundbait_id": "uuid",
  "weight_g": 1100,
  "length_mm": 640,
  "photo_path": null
}
```

- **Response 200**: updated catch
- **Errors**:
  - `400 validation_error`
  - `409 conflict` (cross-user / soft-deleted equipment)
  - `401 unauthorized`, `404 not_found`

#### DELETE `/catches/{id}`
- **Description**: Hard delete (DB `catches` has no `deleted_at`). Allowed by RLS via trip ownership.
- **Response 204**
- **Errors**: `401 unauthorized`, `404 not_found`

---

### 2.7 Catch photos (Supabase Storage + Sharp compression)

**Architecture**: Hybrid approach with client-side resize + server-side compression.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CLIENT (Browser)                                                        │
│ ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│ │ 1. File select  │───►│ 2. Resize       │───►│ 3. Upload       │      │
│ │ (max 10MB)      │    │ OffscreenCanvas │    │ FormData        │      │
│ │                 │    │ (max 2000px)    │    │                 │      │
│ └─────────────────┘    └─────────────────┘    └────────┬────────┘      │
└────────────────────────────────────────────────────────┼────────────────┘
                                                         │
                                                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ SERVER (Astro API + Sharp)                                              │
│ ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│ │ 4. Sharp:       │───►│ 5. Convert to   │───►│ 6. Upload to    │      │
│ │ - Resize final  │    │ WebP (q:80)     │    │ Supabase Storage│      │
│ │ - Strip EXIF    │    │                 │    │                 │      │
│ └─────────────────┘    └─────────────────┘    └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why this approach:**
- ✅ No external client-side dependencies (native Canvas API)
- ✅ Sharp is actively maintained (~weekly releases)
- ✅ Full control over output format (WebP) and quality
- ✅ EXIF stripping for privacy
- ✅ Server can generate thumbnails in future

#### POST `/catches/{id}/photo` (recommended - server-side processing)
- **Description**: Upload photo with server-side compression via Sharp. Converts to WebP, strips EXIF metadata, resizes to max 2000px.
- **Request**: `multipart/form-data`
  - `file`: Image file (JPEG, PNG, WebP - max 10MB)
- **Response 201**:

```json
{
  "photo_path": "user_id/catch_id.webp",
  "size_bytes": 245000,
  "width": 1920,
  "height": 1440
}
```

- **Server-side processing (Sharp)**:

```typescript
import sharp from 'sharp';

const processed = await sharp(buffer)
  .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
  .rotate() // Auto-rotate based on EXIF
  .webp({ quality: 80 })
  .toBuffer();
```

- **Errors**:
  - `400 validation_error`:
    - Unsupported content type (only `image/jpeg`, `image/png`, `image/webp`)
    - File too large (>10MB)
    - Invalid image data
  - `401 unauthorized`
  - `404 not_found` (catch not found)
  - `413 payload_too_large` (file exceeds limit)

#### POST `/catches/{id}/photo/upload-url` (alternative - signed URL workflow)
- **Description**: Create a short-lived signed URL for direct upload to Storage. Use when server-side processing is not needed or for very large files.
- **Request**:

```json
{ "content_type": "image/jpeg", "file_ext": "jpg" }
```

- **Response 200**:

```json
{
  "object": { "bucket": "catch-photos", "path": "user_id/catch_id.jpg" },
  "upload": { "url": "https://...", "expires_in": 600, "method": "PUT" }
}
```

- **Errors**:
  - `400 validation_error` (unsupported content_type/ext)
  - `401 unauthorized`, `404 not_found`

#### POST `/catches/{id}/photo/commit`
- **Description**: After signed URL upload finishes, persist `photo_path` on the catch.
- **Request**:

```json
{ "photo_path": "user_id/catch_id.jpg" }
```

- **Response 200**: updated catch
- **Errors**: `400 validation_error`, `401 unauthorized`, `404 not_found`, `409 conflict` (path not under user folder)

#### GET `/catches/{id}/photo/download-url`
- **Description**: Returns a signed download URL for displaying the photo.
- **Response 200**:

```json
{ "url": "https://...", "expires_in": 600 }
```

- **Errors**: `404 not_found` (no photo), `401 unauthorized`

#### DELETE `/catches/{id}/photo`
- **Description**: Deletes storage object and sets `photo_path=null`.
- **Response 204**
- **Errors**: `401 unauthorized`, `404 not_found`

---

### 2.8 Weather snapshots & timeline

Goals:
- Preserve immutable historical weather data for each trip (PRD).
- Support auto-fetch for trips within last 24h and manual entry for older trips.
- Prefer manual snapshot when selecting “current” weather, else latest API snapshot.

#### GET `/trips/{tripId}/weather/snapshots`
- **Query**:
  - `source` (optional: `api|manual`)
  - `limit`, `cursor`
  - `sort` (allowed: `fetched_at`, `created_at`), `order`
- **Response 200**:

```json
{
  "data": [
    {
      "id": "uuid",
      "trip_id": "uuid",
      "source": "api",
      "fetched_at": "2025-12-12T12:00:00Z",
      "period_start": "2025-12-12T10:00:00Z",
      "period_end": "2025-12-12T14:00:00Z",
      "created_at": "2025-12-12T12:00:01Z"
    }
  ],
  "page": { "limit": 20, "next_cursor": "..." }
}
```

#### GET `/weather/snapshots/{snapshotId}`
- **Query**:
  - `include_hours` (optional boolean, default `false`)
- **Response 200**:

```json
{
  "snapshot": {
    "id": "uuid",
    "trip_id": "uuid",
    "source": "manual",
    "fetched_at": "2025-12-12T12:00:00Z",
    "period_start": "2025-12-12T10:00:00Z",
    "period_end": "2025-12-12T14:00:00Z"
  },
  "hours": [
    {
      "observed_at": "2025-12-12T10:00:00Z",
      "temperature_c": 10.5,
      "pressure_hpa": 1015,
      "wind_speed_kmh": 12.0,
      "wind_direction": 180,
      "humidity_percent": 70,
      "precipitation_mm": 0.0,
      "cloud_cover": 30,
      "weather_icon": "cloud",
      "weather_text": "Cloudy"
    }
  ]
}
```

#### GET `/trips/{tripId}/weather/current`
- **Description**: Returns the “selected” snapshot for UI (prefer manual; else latest API).
- **Response 200**:

```json
{ "snapshot_id": "uuid", "source": "manual" }
```

- **Errors**: `404 not_found` (no snapshots), `401 unauthorized`

#### POST `/trips/{tripId}/weather/refresh`
- **Description**: Server fetches weather from provider and stores a new snapshot (`source=api`) + hours.
- **Request**:

```json
{
  "period_start": "2025-12-12T10:00:00Z",
  "period_end": "2025-12-12T14:00:00Z",
  "force": false
}
```

- **Response 201**:

```json
{ "snapshot_id": "uuid" }
```

- **Errors**:
  - `400 validation_error` (period_end < period_start; trip too old for auto-fetch unless `force=true` and provider supports it)
  - `429 rate_limited` (protect provider)
  - `502 bad_gateway` (provider error)

#### POST `/trips/{tripId}/weather/manual`
- **Description**: Creates a manual snapshot with hours provided by user.
- **Request**:

```json
{
  "fetched_at": "2025-12-12T12:00:00Z",
  "period_start": "2025-12-12T10:00:00Z",
  "period_end": "2025-12-12T14:00:00Z",
  "hours": [
    {
      "observed_at": "2025-12-12T10:00:00Z",
      "temperature_c": 10.5,
      "pressure_hpa": 1015,
      "wind_speed_kmh": 12.0,
      "wind_direction": 180,
      "humidity_percent": 70,
      "precipitation_mm": 0.0,
      "cloud_cover": 30,
      "weather_icon": "cloud",
      "weather_text": "Cloudy"
    }
  ]
}
```

- **Response 201**: `{ "snapshot_id": "uuid" }`
- **Errors**:
  - `400 validation_error` (DB constraints: source enum, period validity; hour ranges; duplicate `(snapshot_id, observed_at)` not possible at insert time if validated)
  - `401 unauthorized`, `404 not_found`

#### DELETE `/weather/snapshots/{snapshotId}`
- **Description**: Deletes snapshot (and cascades to hours).
- **Response 204**
- **Errors**: `401 unauthorized`, `404 not_found`

---

### 2.9 Derived convenience endpoints (optional but useful for UX)

#### GET `/me/last-used-equipment`
- **Description**: Returns equipment selection from the latest non-deleted trip to support “remember last set”.
- **Response 200**:

```json
{
  "source_trip_id": "uuid",
  "rods": [{ "rod_id": "uuid", "rod_name_snapshot": "Rod A" }],
  "lures": [{ "lure_id": "uuid", "lure_name_snapshot": "Lure A" }],
  "groundbaits": [{ "groundbait_id": "uuid", "groundbait_name_snapshot": "Groundbait A" }]
}
```

---

## 3. Authentication & authorization

### 3.1 Mechanism

- **Supabase Auth** issues a JWT. The API requires `Authorization: Bearer <jwt>`.
- The API creates a Supabase client **bound to the user JWT** and relies on **RLS** policies for data isolation.
- `service_role` key is **never** used for user-scoped endpoints (only for internal jobs/admin tasks, if any).

### 3.2 RLS alignment

RLS is enabled and forced on all domain tables; authorization logic is:
- **Equipment tables** (`rods`, `lures`, `groundbaits`): `user_id = auth.uid()`
- **Trips**: `user_id = auth.uid()`
- **Trip-scoped tables** (`catches`, `trip_*`, `weather_*`): access is permitted iff the related trip belongs to `auth.uid()` and `trips.deleted_at is null`

### 3.3 Rate limiting & abuse controls

- **Per-IP** rate limit on auth endpoints: e.g. `POST /auth/logout` (light) and any future login proxy endpoints.
- **Per-user** rate limit on weather refresh endpoints: e.g. `POST /trips/{id}/weather/refresh` to protect provider quotas.
- **Request size limits**:
  - Manual weather hours payload caps (e.g., max 72 hours per snapshot).
  - Photo upload: max 10MB input, processed server-side via Sharp to optimized WebP (~200-500KB output).
  - Alternative signed URL workflow available for direct-to-storage uploads.

---

## 4. Validation & business logic

### 4.1 DB-driven validations (must be surfaced as API errors)

#### Trips (`public.trips`)
- `status` must be one of: `draft|active|closed`
- `ended_at` is null OR `ended_at >= started_at`
- if `status = 'closed'` then `ended_at is not null`
- `(location_lat is null) = (location_lng is null)` (both provided or both omitted)

API behavior:
- Validate on input and return `400 validation_error` with field-level details.

#### Catches (`public.catches`)
- `weight_g is null OR weight_g > 0`
- `length_mm is null OR length_mm > 0`
- `trip_id`, `species_id`, `lure_id`, `groundbait_id` required
- Snapshot fields are not client-controlled (DB triggers overwrite).

API behavior:
- Reject non-positive weight/length with `400`.
- Enforce `caught_at` presence and ISO8601 format.

#### Weather snapshots (`public.weather_snapshots`)
- `source in ('api','manual')`
- `period_end >= period_start`

#### Weather hours (`public.weather_hours`)
- Unique `(snapshot_id, observed_at)`
- Ranges:
  - `temperature_c`: -100..100
  - `pressure_hpa`: 800..1200
  - `wind_speed_kmh`: >= 0
  - `wind_direction`: 0..360
  - `humidity_percent`: 0..100
  - `precipitation_mm`: >= 0
  - `cloud_cover`: 0..100

### 4.2 Trigger-driven invariants (map to API-level conflicts)

#### Cross-user / soft-deleted equipment protection
DB triggers:
- Reject assigning equipment to a trip if equipment belongs to another user or is soft-deleted.
- Reject creating/updating a catch if lure/groundbait belongs to another user or is soft-deleted.

API behavior:
- Map these failures to `409 conflict` with a stable error code:
  - `equipment_owner_mismatch`
  - `equipment_soft_deleted`

#### Snapshot fill behavior
DB triggers fill:
- `catches.lure_name_snapshot`, `catches.groundbait_name_snapshot`
- `trip_rods.rod_name_snapshot`, `trip_lures.lure_name_snapshot`, `trip_groundbaits.groundbait_name_snapshot`

API behavior:
- Do not accept snapshot fields in request payloads (ignore or reject with `400`).
- Always return snapshot fields in responses to ensure historical stability in UI.

### 4.3 PRD business logic mapped to endpoints

- **Mini LP + Login + Logout**:
  - Use Supabase Auth directly; API supports `GET /auth/session` and `POST /auth/logout`.
- **Dashboard: list recent trips**:
  - `GET /trips` with sort by `started_at desc`, optional `status` filtering.
- **FAB “quick start” trip**:
  - `POST /trips/quick-start` creates trip with `started_at=now()` and optionally copies last equipment.
- **Trip lifecycle edits (start/stop/close)**:
  - `PATCH /trips/{id}` for general edits
  - `POST /trips/{id}/close` for a guided close operation.
- **CRUD equipment**:
  - `/rods`, `/lures`, `/groundbaits` CRUD with soft-delete.
- **Trip multi-select equipment**:
  - `PUT /trips/{tripId}/{rods|lures|groundbaits}` to set selection
  - `POST`/`DELETE` for incremental changes.
- **Trophy entry (catch)**:
  - `POST /trips/{tripId}/catches` and `PATCH /catches/{id}`.
  - `caught_at` validation: API should ensure it falls within trip `[started_at, ended_at]` when `ended_at` is present; otherwise allow any time >= started_at (configurable).
- **Weather snapshots**:
  - Auto-fetch: `POST /trips/{tripId}/weather/refresh`
  - Manual entry: `POST /trips/{tripId}/weather/manual`
  - Timeline read: `GET /weather/snapshots/{snapshotId}?include_hours=true`
  - Current snapshot selection: `GET /trips/{tripId}/weather/current` (manual preferred).
- **Photo: resize client-side (Canvas API) + compress server-side (Sharp)**:
  - `POST /catches/{id}/photo` (recommended - server-side Sharp processing to WebP)
  - Alternative signed URL workflow:
    - `POST /catches/{id}/photo/upload-url` (signed upload)
    - `POST /catches/{id}/photo/commit`
  - `GET /catches/{id}/photo/download-url`
  - `DELETE /catches/{id}/photo`


