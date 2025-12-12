/**
 * Shared types for backend and frontend (Entities, DTOs).
 *
 * Notes:
 * - “DB row” entity types mirror `supabase/migrations/20251212141338_create_fishing_journal_schema.sql`.
 * - DTOs and Command Models are derived from those entities via `Pick` / `Omit` / `Partial`
 *   to keep a direct (or intentionally indirect) connection to the underlying schema.
 * - Some API DTOs *rename* fields (e.g. `rod_id` → `id` in trip equipment summaries). For those
 *   cases we still reference the DB types via indexed access (e.g. `TripRodRow["rod_id"]`).
 */

// ---------------------------------------------------------------------------
// 0) primitives
// ---------------------------------------------------------------------------

/** Postgres `uuid` serialized as string (Supabase). */
export type UUID = string;

/** Postgres `timestamptz` serialized as ISO8601 string. */
export type ISODateTime = string;

/** Opaque cursor string used for cursor pagination. */
export type Cursor = string;

export type SortOrder = "asc" | "desc";

export type ApiErrorCode =
  | "validation_error"
  | "unauthorized"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "bad_gateway"
  // stable conflict codes from the plan (409)
  | "equipment_owner_mismatch"
  | "equipment_soft_deleted"
  // allow extension without constantly updating the union
  | (string & {});

export type ApiErrorDetails =
  | {
      /** Field name for validation errors (when applicable). */
      field?: string;
      /** Human-readable reason (when applicable). */
      reason?: string;
    }
  | Record<string, unknown>;

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetails;
  };
}

export interface PageInfo {
  limit: number;
  next_cursor: Cursor | null;
}

export interface ListResponse<TItem> {
  data: TItem[];
  page: PageInfo;
}

// ---------------------------------------------------------------------------
// 1) DB entity (row) types — mirror the SQL schema
// ---------------------------------------------------------------------------

export type TripStatus = "draft" | "active" | "closed";

export type WeatherSnapshotSource = "api" | "manual";

export interface FishSpeciesRow {
  id: UUID;
  name: string;
  created_at: ISODateTime;
}

export interface RodRow {
  id: UUID;
  user_id: UUID;
  name: string;
  deleted_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface LureRow {
  id: UUID;
  user_id: UUID;
  name: string;
  deleted_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface GroundbaitRow {
  id: UUID;
  user_id: UUID;
  name: string;
  deleted_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface TripRow {
  id: UUID;
  user_id: UUID;
  started_at: ISODateTime;
  ended_at: ISODateTime | null;
  status: TripStatus;
  location_lat: number | null;
  location_lng: number | null;
  location_label: string | null;
  deleted_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CatchRow {
  id: UUID;
  trip_id: UUID;
  caught_at: ISODateTime;
  species_id: UUID;
  lure_id: UUID;
  groundbait_id: UUID;
  lure_name_snapshot: string;
  groundbait_name_snapshot: string;
  weight_g: number | null;
  length_mm: number | null;
  photo_path: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface TripRodRow {
  id: UUID;
  trip_id: UUID;
  rod_id: UUID;
  rod_name_snapshot: string;
  created_at: ISODateTime;
}

export interface TripLureRow {
  id: UUID;
  trip_id: UUID;
  lure_id: UUID;
  lure_name_snapshot: string;
  created_at: ISODateTime;
}

export interface TripGroundbaitRow {
  id: UUID;
  trip_id: UUID;
  groundbait_id: UUID;
  groundbait_name_snapshot: string;
  created_at: ISODateTime;
}

export interface WeatherSnapshotRow {
  id: UUID;
  trip_id: UUID;
  source: WeatherSnapshotSource;
  fetched_at: ISODateTime;
  period_start: ISODateTime;
  period_end: ISODateTime;
  created_at: ISODateTime;
}

/**
 * `numeric(...)` columns are modeled as `number | null` to match the API plan examples.
 * If you later decide to rely on Supabase-generated types, these might become `string`.
 */
export interface WeatherHourRow {
  id: UUID;
  snapshot_id: UUID;
  observed_at: ISODateTime;
  temperature_c: number | null;
  pressure_hpa: number | null;
  wind_speed_kmh: number | null;
  wind_direction: number | null;
  humidity_percent: number | null;
  precipitation_mm: number | null;
  cloud_cover: number | null;
  weather_icon: string | null;
  weather_text: string | null;
  created_at: ISODateTime;
}

// ---------------------------------------------------------------------------
// 2) DTOs — response payloads (as defined in .ai/api-plan.md)
// ---------------------------------------------------------------------------

// 2.1 Auth & session

export interface SessionUserDto {
  id: UUID;
  email: string;
}

export interface AuthSessionResponseDto {
  user: SessionUserDto;
}

// 2.2 Fish species

export type FishSpeciesDto = Pick<FishSpeciesRow, "id" | "name" | "created_at">;

export type FishSpeciesListResponseDto = ListResponse<FishSpeciesDto>;

export type FishSpeciesGetResponseDto = FishSpeciesDto;

// 2.3 Equipment (rods/lures/groundbaits)

export type RodDto = Omit<RodRow, "user_id">;
export type LureDto = Omit<LureRow, "user_id">;
export type GroundbaitDto = Omit<GroundbaitRow, "user_id">;

export type RodListResponseDto = ListResponse<RodDto>;
export type RodGetResponseDto = RodDto;

export type LureListResponseDto = ListResponse<LureDto>;
export type LureGetResponseDto = LureDto;

export type GroundbaitListResponseDto = ListResponse<GroundbaitDto>;
export type GroundbaitGetResponseDto = GroundbaitDto;

// 2.4 Trips

export interface TripLocationDto {
  lat: number;
  lng: number;
  label?: string | null;
}

export type TripDto = Omit<TripRow, "user_id" | "location_lat" | "location_lng" | "location_label"> & {
  /** API groups `location_*` columns into a single object. */
  location: TripLocationDto | null;
};

export interface TripSummaryDto {
  /** Computed/aggregated in queries; not stored in DB. */
  catch_count: number;
}

export type TripListItemDto = TripDto & {
  summary: TripSummaryDto;
};

export type TripListResponseDto = ListResponse<TripListItemDto>;

// Trip detail (GET /trips/{id})

export interface TripEquipmentRodItemDto {
  /** Derived from `trip_rods.rod_id` (renamed for the API DTO). */
  id: TripRodRow["rod_id"];
  /** Derived from `trip_rods.rod_name_snapshot` (renamed for the API DTO). */
  name_snapshot: TripRodRow["rod_name_snapshot"];
}

export interface TripEquipmentLureItemDto {
  id: TripLureRow["lure_id"];
  name_snapshot: TripLureRow["lure_name_snapshot"];
}

export interface TripEquipmentGroundbaitItemDto {
  id: TripGroundbaitRow["groundbait_id"];
  name_snapshot: TripGroundbaitRow["groundbait_name_snapshot"];
}

export interface TripEquipmentDto {
  rods: TripEquipmentRodItemDto[];
  lures: TripEquipmentLureItemDto[];
  groundbaits: TripEquipmentGroundbaitItemDto[];
}

export interface CatchPhotoDto {
  /** `catches.photo_path` (Supabase Storage object key). */
  path: CatchRow["photo_path"];
  /** Optional signed URL (when requested via photo endpoint); may be null. */
  url: string | null;
}

export interface CatchInTripDto {
  id: CatchRow["id"];
  caught_at: CatchRow["caught_at"];
  species: Pick<FishSpeciesRow, "id" | "name">;
  lure: { id: CatchRow["lure_id"]; name_snapshot: CatchRow["lure_name_snapshot"] };
  groundbait: {
    id: CatchRow["groundbait_id"];
    name_snapshot: CatchRow["groundbait_name_snapshot"];
  };
  weight_g: CatchRow["weight_g"];
  length_mm: CatchRow["length_mm"];
  photo: CatchPhotoDto;
}

export interface TripWeatherCurrentDto {
  snapshot_id: WeatherSnapshotRow["id"];
  source: WeatherSnapshotRow["source"];
}

export type TripInclude = "catches" | "rods" | "lures" | "groundbaits" | "weather_current";

/**
 * GET /trips/{id} supports `include=...` and may omit some sections.
 * We model this as optional fields.
 */
export type TripGetResponseDto = TripDto & {
  equipment?: TripEquipmentDto;
  catches?: CatchInTripDto[];
  weather_current?: TripWeatherCurrentDto | null;
};

// 2.5 Trip equipment assignment (junction tables)

export type TripRodDto = Pick<TripRodRow, "id" | "rod_id" | "rod_name_snapshot" | "created_at">;
export type TripLureDto = Pick<TripLureRow, "id" | "lure_id" | "lure_name_snapshot" | "created_at">;
export type TripGroundbaitDto = Pick<
  TripGroundbaitRow,
  "id" | "groundbait_id" | "groundbait_name_snapshot" | "created_at"
>;

export interface TripRodsListResponseDto {
  data: TripRodDto[];
}
export interface TripLuresListResponseDto {
  data: TripLureDto[];
}
export interface TripGroundbaitsListResponseDto {
  data: TripGroundbaitDto[];
}

export interface TripRodsPutResponseDto {
  data: TripRodDto[];
}
export interface TripLuresPutResponseDto {
  data: TripLureDto[];
}
export interface TripGroundbaitsPutResponseDto {
  data: TripGroundbaitDto[];
}

// 2.6 Catches

export type CatchDto = CatchRow;
export type CatchListResponseDto = ListResponse<CatchDto>;
export type CatchGetResponseDto = CatchDto;

// 2.7 Catch photos

export type CatchPhotoBucketId = "catch-photos";

export interface CatchPhotoUploadUrlResponseDto {
  object: { bucket: CatchPhotoBucketId; path: string };
  upload: { url: string; expires_in: number; method: "PUT" };
}

export interface CatchPhotoDownloadUrlResponseDto {
  url: string;
  expires_in: number;
}

// 2.8 Weather

export type WeatherSnapshotDto = WeatherSnapshotRow;

export type WeatherSnapshotListResponseDto = ListResponse<WeatherSnapshotDto>;

export type WeatherSnapshotDetailDto = Pick<
  WeatherSnapshotRow,
  "id" | "trip_id" | "source" | "fetched_at" | "period_start" | "period_end"
>;

export type WeatherHourDto = Omit<WeatherHourRow, "id" | "snapshot_id" | "created_at">;

export interface WeatherSnapshotGetResponseDto {
  snapshot: WeatherSnapshotDetailDto;
  hours: WeatherHourDto[];
}

export type TripWeatherCurrentResponseDto = TripWeatherCurrentDto;

export interface WeatherRefreshResponseDto {
  snapshot_id: WeatherSnapshotRow["id"];
}
export interface WeatherManualResponseDto {
  snapshot_id: WeatherSnapshotRow["id"];
}

// 2.9 Convenience

export interface LastUsedEquipmentResponseDto {
  source_trip_id: TripRow["id"];
  rods: Pick<TripRodRow, "rod_id" | "rod_name_snapshot">[];
  lures: Pick<TripLureRow, "lure_id" | "lure_name_snapshot">[];
  groundbaits: Pick<TripGroundbaitRow, "groundbait_id" | "groundbait_name_snapshot">[];
}

// ---------------------------------------------------------------------------
// 3) Command Models — request payloads (as defined in .ai/api-plan.md)
// ---------------------------------------------------------------------------

// Equipment commands (shared shape)
export interface CreateEquipmentCommand {
  name: string;
}
export type UpdateEquipmentCommand = Partial<{ name: string }>;

export type CreateRodCommand = CreateEquipmentCommand;
export type UpdateRodCommand = UpdateEquipmentCommand;

export type CreateLureCommand = CreateEquipmentCommand;
export type UpdateLureCommand = UpdateEquipmentCommand;

export type CreateGroundbaitCommand = CreateEquipmentCommand;
export type UpdateGroundbaitCommand = UpdateEquipmentCommand;

// Trips

export interface CreateTripCommand {
  started_at: TripRow["started_at"];
  ended_at: TripRow["ended_at"];
  status: TripRow["status"];
  location: TripLocationDto | null;
  copy_equipment_from_last_trip?: boolean;
}

export interface QuickStartTripCommand {
  use_gps: boolean;
  copy_equipment_from_last_trip: boolean;
}

export interface QuickStartTripResponseDto {
  trip: TripDto;
  copied_equipment: {
    rod_ids: TripRodRow["rod_id"][];
    lure_ids: TripLureRow["lure_id"][];
    groundbait_ids: TripGroundbaitRow["groundbait_id"][];
  };
}

export type UpdateTripCommand = Partial<{
  started_at: TripRow["started_at"];
  ended_at: TripRow["ended_at"];
  status: TripRow["status"];
  location: TripLocationDto | null;
}>;

export interface CloseTripCommand {
  ended_at: TripRow["ended_at"];
}

// Trip equipment assignment

export interface PutTripRodsCommand {
  rod_ids: TripRodRow["rod_id"][];
}
export interface PostTripRodsCommand {
  rod_id: TripRodRow["rod_id"];
}

export interface PutTripLuresCommand {
  lure_ids: TripLureRow["lure_id"][];
}
export interface PostTripLuresCommand {
  lure_id: TripLureRow["lure_id"];
}

export interface PutTripGroundbaitsCommand {
  groundbait_ids: TripGroundbaitRow["groundbait_id"][];
}
export interface PostTripGroundbaitsCommand {
  groundbait_id: TripGroundbaitRow["groundbait_id"];
}

// Catches

type CatchMutableFields = Pick<
  CatchRow,
  "caught_at" | "species_id" | "lure_id" | "groundbait_id" | "weight_g" | "length_mm" | "photo_path"
>;

export type CreateCatchCommand = Pick<CatchMutableFields, "caught_at" | "species_id" | "lure_id" | "groundbait_id"> &
  Partial<Pick<CatchMutableFields, "weight_g" | "length_mm">>;

export type UpdateCatchCommand = Partial<CatchMutableFields>;

// Catch photos

export type CatchPhotoContentType = "image/jpeg" | "image/png" | "image/webp" | (string & {});

export interface CatchPhotoUploadUrlCommand {
  content_type: CatchPhotoContentType;
  file_ext: string;
}

export interface CatchPhotoCommitCommand {
  photo_path: NonNullable<CatchRow["photo_path"]>;
}

// Weather

export interface WeatherRefreshCommand {
  period_start: WeatherSnapshotRow["period_start"];
  period_end: WeatherSnapshotRow["period_end"];
  force: boolean;
}

export type WeatherManualHourCommand = Pick<
  WeatherHourDto,
  | "observed_at"
  | "temperature_c"
  | "pressure_hpa"
  | "wind_speed_kmh"
  | "wind_direction"
  | "humidity_percent"
  | "precipitation_mm"
  | "cloud_cover"
  | "weather_icon"
  | "weather_text"
>;

export interface WeatherManualCommand {
  fetched_at: WeatherSnapshotRow["fetched_at"];
  period_start: WeatherSnapshotRow["period_start"];
  period_end: WeatherSnapshotRow["period_end"];
  hours: WeatherManualHourCommand[];
}
