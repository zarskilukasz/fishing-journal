# API Endpoint Implementation Plan: Catch Photos

## 1. Przegląd punktu końcowego

Ten plan opisuje implementację pięciu endpointów REST API do obsługi zdjęć połowów (catch photos) w aplikacji Dziennik Wędkarski. Endpointy umożliwiają:

1. **POST `/catches/{id}/photo`** - Upload zdjęcia z kompresją server-side via Sharp (zalecany)
2. **POST `/catches/{id}/photo/upload-url`** - Generowanie signed URL dla bezpośredniego uploadu
3. **POST `/catches/{id}/photo/commit`** - Zatwierdzenie photo_path po uploadzie przez signed URL
4. **GET `/catches/{id}/photo/download-url`** - Pobranie signed URL do wyświetlenia zdjęcia
5. **DELETE `/catches/{id}/photo`** - Usunięcie zdjęcia

### Architektura

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

---

## 2. Szczegóły żądania

### 2.1 POST `/catches/{id}/photo` (Upload z kompresją)

- **Metoda HTTP**: POST
- **Struktura URL**: `/api/v1/catches/{id}/photo`
- **Parametry**:
  - **Wymagane**: `id` (UUID) - identyfikator połowu w ścieżce
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `file` - plik obrazu (JPEG, PNG, WebP - max 10MB)

### 2.2 POST `/catches/{id}/photo/upload-url` (Signed URL)

- **Metoda HTTP**: POST
- **Struktura URL**: `/api/v1/catches/{id}/photo/upload-url`
- **Parametry**:
  - **Wymagane**: `id` (UUID) - identyfikator połowu w ścieżce
- **Content-Type**: `application/json`
- **Request Body**:

```json
{
  "content_type": "image/jpeg",
  "file_ext": "jpg"
}
```

### 2.3 POST `/catches/{id}/photo/commit` (Zatwierdzenie)

- **Metoda HTTP**: POST
- **Struktura URL**: `/api/v1/catches/{id}/photo/commit`
- **Parametry**:
  - **Wymagane**: `id` (UUID) - identyfikator połowu w ścieżce
- **Content-Type**: `application/json`
- **Request Body**:

```json
{
  "photo_path": "user_id/catch_id.jpg"
}
```

### 2.4 GET `/catches/{id}/photo/download-url` (Pobranie URL)

- **Metoda HTTP**: GET
- **Struktura URL**: `/api/v1/catches/{id}/photo/download-url`
- **Parametry**:
  - **Wymagane**: `id` (UUID) - identyfikator połowu w ścieżce

### 2.5 DELETE `/catches/{id}/photo` (Usunięcie)

- **Metoda HTTP**: DELETE
- **Struktura URL**: `/api/v1/catches/{id}/photo`
- **Parametry**:
  - **Wymagane**: `id` (UUID) - identyfikator połowu w ścieżce

---

## 3. Wykorzystywane typy

### 3.1 Istniejące typy (z `src/types.ts`)

```typescript
// Command Models
export interface CatchPhotoUploadUrlCommand {
  content_type: CatchPhotoContentType;
  file_ext: string;
}

export interface CatchPhotoCommitCommand {
  photo_path: NonNullable<CatchRow["photo_path"]>;
}

// Response DTOs
export interface CatchPhotoUploadUrlResponseDto {
  object: { bucket: CatchPhotoBucketId; path: string };
  upload: { url: string; expires_in: number; method: "PUT" };
}

export interface CatchPhotoDownloadUrlResponseDto {
  url: string;
  expires_in: number;
}

export type CatchPhotoContentType = "image/jpeg" | "image/png" | "image/webp" | (string & {});
export type CatchPhotoBucketId = "catch-photos";
```

### 3.2 Nowe typy do dodania (w `src/types.ts`)

```typescript
/**
 * Response DTO for POST /catches/{id}/photo (server-side processing)
 */
export interface CatchPhotoUploadResponseDto {
  photo_path: string;
  size_bytes: number;
  width: number;
  height: number;
}
```

### 3.3 Schematy Zod (nowy plik `src/lib/schemas/catch-photo.schema.ts`)

```typescript
import { z } from "zod";

// Dozwolone typy MIME
export const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_FILE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

// Stałe limitów
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGE_DIMENSION = 2000; // px
export const WEBP_QUALITY = 80;
export const SIGNED_URL_EXPIRES_IN = 600; // 10 minutes

// Schema dla upload-url
export const uploadUrlSchema = z.object({
  content_type: z.enum(ALLOWED_CONTENT_TYPES, {
    errorMap: () => ({ message: "Nieobsługiwany typ pliku. Dozwolone: JPEG, PNG, WebP" }),
  }),
  file_ext: z.enum(ALLOWED_FILE_EXTENSIONS, {
    errorMap: () => ({ message: "Nieobsługiwane rozszerzenie pliku. Dozwolone: jpg, jpeg, png, webp" }),
  }),
});

// Schema dla commit
export const commitPhotoSchema = z.object({
  photo_path: z
    .string()
    .min(1, "photo_path jest wymagany")
    .max(255, "photo_path nie może przekraczać 255 znaków")
    .regex(/^[a-f0-9-]+\/[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i, "Nieprawidłowy format ścieżki"),
});

export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;
export type CommitPhotoInput = z.infer<typeof commitPhotoSchema>;
```

---

## 4. Szczegóły odpowiedzi

### 4.1 POST `/catches/{id}/photo` - 201 Created

```json
{
  "photo_path": "user_id/catch_id.webp",
  "size_bytes": 245000,
  "width": 1920,
  "height": 1440
}
```

### 4.2 POST `/catches/{id}/photo/upload-url` - 200 OK

```json
{
  "object": { "bucket": "catch-photos", "path": "user_id/catch_id.jpg" },
  "upload": { "url": "https://...", "expires_in": 600, "method": "PUT" }
}
```

### 4.3 POST `/catches/{id}/photo/commit` - 200 OK

Zwraca zaktualizowany obiekt `CatchDto` z ustawionym `photo_path`.

### 4.4 GET `/catches/{id}/photo/download-url` - 200 OK

```json
{
  "url": "https://...",
  "expires_in": 600
}
```

### 4.5 DELETE `/catches/{id}/photo` - 204 No Content

Pusta odpowiedź.

### 4.6 Kody błędów

| Kod | Error Code | Scenariusz |
|-----|------------|------------|
| 400 | `validation_error` | Nieobsługiwany content type, nieprawidłowy plik, nieprawidłowe parametry |
| 401 | `unauthorized` | Brak sesji lub nieprawidłowy token |
| 404 | `not_found` | Połów nie istnieje lub brak zdjęcia (dla download-url) |
| 409 | `conflict` | Ścieżka zdjęcia nie jest w folderze użytkownika |
| 413 | `payload_too_large` | Plik przekracza 10MB |
| 500 | `internal_error` | Błąd przetwarzania Sharp lub błąd Storage |

---

## 5. Przepływ danych

### 5.1 Upload z kompresją (POST `/catches/{id}/photo`)

```
1. [Auth] Weryfikacja sesji użytkownika (supabase.auth.getUser())
2. [Validation] Walidacja ID połowu (UUID format)
3. [Authorization] Pobranie połowu + sprawdzenie czy user jest właścicielem (przez trip)
4. [Parse] Parsowanie multipart/form-data, ekstrakcja pliku
5. [Validation] Sprawdzenie:
   - Content-Type (tylko image/jpeg, image/png, image/webp)
   - Rozmiar pliku (max 10MB)
6. [Process] Sharp:
   - resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
   - rotate() - auto-rotate wg EXIF
   - webp({ quality: 80 })
   - toBuffer()
7. [Storage] Upload do Supabase Storage:
   - Bucket: catch-photos
   - Path: {user_id}/{catch_id}.webp
8. [Database] Update catches SET photo_path = '{user_id}/{catch_id}.webp'
9. [Response] Zwrócenie CatchPhotoUploadResponseDto
```

### 5.2 Signed URL workflow

```
┌──────────┐      ┌─────────────────┐      ┌───────────────┐      ┌─────────┐
│ Frontend │      │ POST upload-url │      │ Direct Upload │      │  POST   │
│          │─────►│ (get signed URL)│─────►│ to Storage    │─────►│ commit  │
│          │      │                 │      │               │      │         │
└──────────┘      └─────────────────┘      └───────────────┘      └─────────┘
     │                    │                       │                    │
     │   1. Request URL   │                       │                    │
     │──────────────────► │                       │                    │
     │                    │                       │                    │
     │   2. Signed URL    │                       │                    │
     │◄───────────────────│                       │                    │
     │                    │                       │                    │
     │   3. PUT file      │                       │                    │
     │───────────────────────────────────────────►│                    │
     │                    │                       │                    │
     │   4. 200 OK        │                       │                    │
     │◄───────────────────────────────────────────│                    │
     │                    │                       │                    │
     │   5. Commit photo_path                     │                    │
     │───────────────────────────────────────────────────────────────► │
     │                    │                       │                    │
     │   6. Updated catch │                       │                    │
     │◄────────────────────────────────────────────────────────────────│
```

### 5.3 Download URL

```
1. [Auth] Weryfikacja sesji
2. [Validation] Walidacja ID połowu
3. [Authorization] Sprawdzenie własności połowu
4. [Check] Sprawdzenie czy catch.photo_path != null
5. [Storage] createSignedUrl() dla ścieżki
6. [Response] Zwrócenie URL + expires_in
```

### 5.4 Delete

```
1. [Auth] Weryfikacja sesji
2. [Validation] Walidacja ID połowu
3. [Authorization] Sprawdzenie własności połowu
4. [Check] Pobranie aktualnego photo_path
5. [Storage] Usunięcie obiektu z Storage (jeśli istnieje)
6. [Database] Update catches SET photo_path = NULL
7. [Response] 204 No Content
```

---

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnianie

- Wszystkie endpointy wymagają zalogowanego użytkownika
- Sprawdzenie sesji przez `supabase.auth.getUser()`
- Brak sesji → 401 Unauthorized

### 6.2 Autoryzacja

- Użytkownik może operować tylko na połowach z własnych wypraw
- Weryfikacja własności przez łączenie `catches → trips.user_id = auth.uid()`
- RLS w Supabase zapewnia dodatkową warstwę ochrony

### 6.3 Walidacja ścieżki (Path Traversal Prevention)

```typescript
function validatePhotoPath(photoPath: string, userId: string): boolean {
  // Ścieżka musi zaczynać się od user_id użytkownika
  const expectedPrefix = `${userId}/`;
  if (!photoPath.startsWith(expectedPrefix)) {
    return false;
  }
  
  // Brak path traversal (../)
  if (photoPath.includes("..")) {
    return false;
  }
  
  // Dozwolone rozszerzenia
  const validExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const hasValidExt = validExtensions.some(ext => 
    photoPath.toLowerCase().endsWith(ext)
  );
  
  return hasValidExt;
}
```

### 6.4 Walidacja typu pliku

- Server-side sprawdzenie magic bytes (nie tylko extension/content-type)
- Użycie biblioteki `file-type` lub sprawdzenie nagłówka przez Sharp
- Odrzucenie plików z niepoprawnymi sygnaturami

### 6.5 EXIF Stripping

- Sharp automatycznie usuwa metadane EXIF przy konwersji do WebP
- Chroni prywatność użytkownika (lokalizacja GPS, dane urządzenia)

### 6.6 Rate Limiting (do rozważenia)

- Limit uploadów per użytkownik (np. 10/min)
- Implementacja przez middleware lub zewnętrzny service

---

## 7. Obsługa błędów

### 7.1 Błędy walidacji (400)

```typescript
// Nieobsługiwany typ MIME
{
  "error": {
    "code": "validation_error",
    "message": "Nieobsługiwany typ pliku. Dozwolone: JPEG, PNG, WebP",
    "details": { "field": "file", "reason": "unsupported_content_type" }
  }
}

// Nieprawidłowe dane obrazu
{
  "error": {
    "code": "validation_error",
    "message": "Nieprawidłowe dane obrazu",
    "details": { "field": "file", "reason": "invalid_image_data" }
  }
}

// Puste ciało żądania
{
  "error": {
    "code": "validation_error",
    "message": "Brak pliku w żądaniu"
  }
}
```

### 7.2 Błędy autoryzacji (401)

```typescript
{
  "error": {
    "code": "unauthorized",
    "message": "Wymagana autoryzacja"
  }
}
```

### 7.3 Błędy not found (404)

```typescript
// Połów nie istnieje
{
  "error": {
    "code": "not_found",
    "message": "Połów nie został znaleziony"
  }
}

// Brak zdjęcia (dla download-url)
{
  "error": {
    "code": "not_found",
    "message": "Połów nie posiada zdjęcia"
  }
}
```

### 7.4 Błędy konfliktów (409)

```typescript
// Ścieżka poza folderem użytkownika
{
  "error": {
    "code": "conflict",
    "message": "Ścieżka zdjęcia musi znajdować się w folderze użytkownika",
    "details": { "field": "photo_path" }
  }
}
```

### 7.5 Błędy rozmiaru (413)

```typescript
{
  "error": {
    "code": "payload_too_large",
    "message": "Plik przekracza maksymalny rozmiar 10MB"
  }
}
```

### 7.6 Błędy serwera (500)

```typescript
// Błąd przetwarzania obrazu
{
  "error": {
    "code": "internal_error",
    "message": "Błąd przetwarzania obrazu"
  }
}

// Błąd Storage
{
  "error": {
    "code": "internal_error",
    "message": "Błąd zapisu do storage"
  }
}
```

---

## 8. Rozważania dotyczące wydajności

### 8.1 Ograniczenia rozmiaru

| Limit | Wartość | Uzasadnienie |
|-------|---------|--------------|
| Max input size | 10MB | Zapobiega nadużyciom, wystarczy dla zdjęć mobilnych |
| Max dimension | 2000px | Optymalne dla wyświetlania na web |
| WebP quality | 80% | Dobry kompromis jakość/rozmiar |

### 8.2 Optymalizacja Sharp

```typescript
// Reuse Sharp instance settings
const processImage = async (buffer: Buffer) => {
  return sharp(buffer, {
    // Limit pamięci dla dużych obrazów
    limitInputPixels: 268402689, // ~16k x 16k max
    // Fail fast on invalid input
    failOnError: true,
  })
    .resize(2000, 2000, { 
      fit: 'inside', 
      withoutEnlargement: true 
    })
    .rotate() // Auto-rotate based on EXIF
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
};
```

### 8.3 Streaming considerations

- Dla bardzo dużych plików rozważyć streaming do temp file
- Aktualnie buffer w pamięci jest wystarczający (10MB limit)

### 8.4 Storage optimization

- Supabase Storage obsługuje CDN caching
- Signed URLs z expires_in=600 (10 min) zapewniają równowagę bezpieczeństwo/UX
- Rozważyć dłuższe expiry dla download URLs (3600s)

---

## 9. Etapy wdrożenia

### Etap 1: Przygotowanie infrastruktury

1. **Instalacja Sharp**
   ```bash
   pnpm add sharp
   pnpm add -D @types/sharp
   ```

2. **Utworzenie bucketa Storage w Supabase**
   - Nazwa: `catch-photos`
   - Public: false (dostęp przez signed URLs)
   - Polityki RLS zgodnie z db-plan.md

3. **Aktualizacja typów** (`src/types.ts`)
   - Dodać `CatchPhotoUploadResponseDto`

### Etap 2: Schematy walidacji

1. **Utworzenie pliku** `src/lib/schemas/catch-photo.schema.ts`
   - Schema `uploadUrlSchema`
   - Schema `commitPhotoSchema`
   - Stałe: `ALLOWED_CONTENT_TYPES`, `MAX_FILE_SIZE_BYTES`, etc.

### Etap 3: Serwis fotograficzny

1. **Utworzenie pliku** `src/lib/services/catch-photo.service.ts`

```typescript
import sharp from "sharp";
import type { SupabaseClient } from "@/db/supabase.client";
import type { UUID } from "@/types";

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
}

export const catchPhotoService = {
  // Sprawdzenie własności połowu
  async verifyCatchOwnership(
    supabase: SupabaseClient,
    catchId: UUID,
    userId: UUID
  ): Promise<{ exists: boolean; photoPath: string | null }>,

  // Przetwarzanie obrazu przez Sharp
  async processImage(buffer: Buffer): Promise<ProcessedImage>,

  // Upload do Storage
  async uploadToStorage(
    supabase: SupabaseClient,
    userId: UUID,
    catchId: UUID,
    buffer: Buffer,
    contentType: string
  ): Promise<{ path: string }>,

  // Generowanie signed URL dla uploadu
  async createUploadUrl(
    supabase: SupabaseClient,
    userId: UUID,
    catchId: UUID,
    fileExt: string
  ): Promise<{ path: string; signedUrl: string; expiresIn: number }>,

  // Generowanie signed URL dla downloadu
  async createDownloadUrl(
    supabase: SupabaseClient,
    photoPath: string
  ): Promise<{ url: string; expiresIn: number }>,

  // Aktualizacja photo_path w bazie
  async updatePhotoPath(
    supabase: SupabaseClient,
    catchId: UUID,
    photoPath: string | null
  ): Promise<void>,

  // Usunięcie z Storage
  async deleteFromStorage(
    supabase: SupabaseClient,
    photoPath: string
  ): Promise<void>,

  // Walidacja ścieżki zdjęcia
  validatePhotoPath(photoPath: string, userId: UUID): boolean,
};
```

### Etap 4: Endpointy API

1. **Struktura katalogów**
   ```
   src/pages/api/v1/catches/[id]/photo/
   ├── index.ts          # POST (upload), DELETE
   ├── upload-url.ts     # POST
   ├── commit.ts         # POST
   └── download-url.ts   # GET
   ```

2. **Implementacja POST `/catches/{id}/photo`** (`index.ts`)
   ```typescript
   export const POST: APIRoute = async ({ params, request, locals }) => {
     // 1. Auth check
     // 2. Parse & validate catch ID
     // 3. Verify catch ownership
     // 4. Parse multipart form data
     // 5. Validate file (type, size)
     // 6. Process with Sharp
     // 7. Upload to Storage
     // 8. Update catch.photo_path
     // 9. Return CatchPhotoUploadResponseDto
   };

   export const DELETE: APIRoute = async ({ params, locals }) => {
     // 1. Auth check
     // 2. Parse & validate catch ID
     // 3. Get catch with photo_path
     // 4. Delete from Storage (if exists)
     // 5. Set photo_path = null
     // 6. Return 204
   };
   ```

3. **Implementacja POST `/catches/{id}/photo/upload-url`** (`upload-url.ts`)
   ```typescript
   export const POST: APIRoute = async ({ params, request, locals }) => {
     // 1. Auth check
     // 2. Parse & validate catch ID
     // 3. Verify catch ownership
     // 4. Validate request body (content_type, file_ext)
     // 5. Generate signed URL
     // 6. Return CatchPhotoUploadUrlResponseDto
   };
   ```

4. **Implementacja POST `/catches/{id}/photo/commit`** (`commit.ts`)
   ```typescript
   export const POST: APIRoute = async ({ params, request, locals }) => {
     // 1. Auth check
     // 2. Parse & validate catch ID
     // 3. Verify catch ownership
     // 4. Validate request body (photo_path)
     // 5. Validate photo_path is under user folder
     // 6. Verify file exists in Storage
     // 7. Update catch.photo_path
     // 8. Return updated CatchDto
   };
   ```

5. **Implementacja GET `/catches/{id}/photo/download-url`** (`download-url.ts`)
   ```typescript
   export const GET: APIRoute = async ({ params, locals }) => {
     // 1. Auth check
     // 2. Parse & validate catch ID
     // 3. Get catch with photo_path
     // 4. Check photo_path is not null
     // 5. Generate signed download URL
     // 6. Return CatchPhotoDownloadUrlResponseDto
   };
   ```

### Etap 5: Testy jednostkowe

1. **Testy serwisu** (`src/lib/services/catch-photo.service.test.ts`)
   - Test przetwarzania obrazu Sharp
   - Test walidacji ścieżki
   - Test generowania ścieżek

2. **Testy schematów** (`src/lib/schemas/catch-photo.schema.test.ts`)
   - Test dozwolonych typów MIME
   - Test dozwolonych rozszerzeń
   - Test formatu photo_path

### Etap 6: Integracja i dokumentacja

1. **Aktualizacja error mappera** (`src/lib/errors/supabase-error-mapper.ts`)
   - Dodanie obsługi błędów Storage

2. **Aktualizacja API plan** (`.ai/api-plan.md`)
   - Potwierdzenie implementacji

### Checklist przed wdrożeniem

- [ ] Sharp zainstalowany i działa na target environment (Node.js)
- [ ] Bucket `catch-photos` utworzony w Supabase Storage
- [ ] Polityki RLS dla Storage skonfigurowane
- [ ] Wszystkie endpointy zwracają poprawne kody statusu
- [ ] Walidacja path traversal działa poprawnie
- [ ] EXIF stripping potwierdzone
- [ ] Signed URLs działają dla upload i download
- [ ] Błędy są logowane (console.error w development)
- [ ] Testy jednostkowe przechodzą

