# Tech stack (MVP – Dziennik Wędkarski)

## Frontend (UI)

- **Framework / routing**: Astro `^5.13.7`
- **UI (wyspy)**: React `^19.1.1`, React DOM `^19.1.1`
- **Język**: TypeScript (konfiguracja projektu) + `@types/react`, `@types/react-dom`
- **Styling**: Tailwind CSS `^4.1.13` + integracja przez `@tailwindcss/vite`
- **Komponenty UI**: shadcn/ui (komponenty w `src/components/ui`)
- **Primitivy**: Radix (`@radix-ui/react-slot`)
- **Ikony**: `lucide-react`
- **Utilities**: `clsx`, `tailwind-merge`, `class-variance-authority`, `tw-animate-css`

## Backend / BaaS

- **Baza danych + API + Auth**: Supabase (`@supabase/supabase-js`)
- **Model danych / typy współdzielone**: `src/types.ts` (zgodnie ze strukturą projektu)

## Warstwa serwerowa / runtime

- **Adapter**: `@astrojs/node` (uruchamianie Astro na Node)
- **SEO**: `@astrojs/sitemap`

## Offline-first / PWA (wymaganie z PRD)

- **Tryb działania**: offline-first (MVP: zapis lokalny + synchronizacja po odzyskaniu połączenia)
- **Magazyn lokalny (MVP)**: LocalStorage (wg PRD)
- **Synchronizacja**: docelowo do Supabase po powrocie online

## Integracje zewnętrzne (planowane wg PRD)

- **Pogoda**: AccuWeather API (pobieranie danych do 24h wstecz + snapshoty w bazie)
- **Mapy / lokalizacja**: Google Maps API (wizualizacja i edycja lokalizacji + GPS)

## Narzędzia developerskie / jakość

- **Linting**: ESLint `9` (+ `eslint-plugin-astro`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-plugin-import`, `eslint-plugin-prettier`)
- **Formatowanie**: Prettier + `prettier-plugin-astro`
- **TypeScript ESLint**: `@typescript-eslint/*`, `typescript-eslint`
- **Pre-commit**: Husky + lint-staged

## Package manager

- **pnpm** (obecność `pnpm-lock.yaml`)