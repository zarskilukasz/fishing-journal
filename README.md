# Fishing Journal (Dziennik Wędkarski) — MVP

[![Astro](https://img.shields.io/badge/Astro-5-ff5d01?logo=astro&logoColor=white)](https://astro.build/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node](https://img.shields.io/badge/Node-22.14.0-3c873a?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Package Manager](https://img.shields.io/badge/pnpm-recommended-f69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![License](https://img.shields.io/badge/License-Unlicensed-lightgrey)](#8-license)

A private, offline-first PWA for logging fishing trips, catches, gear, and weather snapshots for later analysis.

## Table of Contents

- [1. Project name](#1-project-name)
- [2. Project description](#2-project-description)
- [3. Tech stack](#3-tech-stack)
- [4. Getting started locally](#4-getting-started-locally)
- [5. Available scripts](#5-available-scripts)
- [6. Project scope](#6-project-scope)
- [7. Project status](#7-project-status)
- [8. License](#8-license)

## 1. Project name

**Fishing Journal (Dziennik Wędkarski) — MVP**

## 2. Project description

Fishing Journal is a private MVP Progressive Web App (PWA) for a single user. Its goal is to capture:

- **Trips** (date/time, location, duration)
- **Catches** (species + required bait/groundbait, optional weight/length/photo)
- **Gear** (rods/baits/groundbaits with historical “snapshots”)
- **Weather** (automatic snapshots for recent trips, stored permanently for future analysis)

The product is designed to be **responsive (mobile + desktop)** and **offline-first**, so it remains usable near the water without reliable connectivity.

Additional internal docs:
- PRD: `./.ai/prd.md`
- Tech stack notes: `./.ai/tech-stack.md`

## 3. Tech stack

- **Framework**: Astro 5 (SSR output, Node adapter)
- **UI islands**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI components**: shadcn/ui + Radix primitives
- **Icons**: `lucide-react`
- **Backend (BaaS)**: Supabase (DB + API + Auth)
- **SEO**: `@astrojs/sitemap`
- **Quality tooling**: ESLint 9, Prettier, Husky, lint-staged
- **Package manager**: pnpm

## 4. Getting started locally

### Prerequisites

- **Node.js**: `22.14.0` (see `.nvmrc`)
- **pnpm**: recommended (project uses `pnpm-lock.yaml`)

### Install

```bash
pnpm install
```

### Environment variables

Create a `.env` file in the project root:

```bash
SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_KEY="YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY"
OPENROUTER_API_KEY="YOUR_OPENROUTER_API_KEY"
```

Notes:
- `SUPABASE_URL` / `SUPABASE_KEY` are required for Supabase connectivity.
- `OPENROUTER_API_KEY` is declared in `src/env.d.ts`; if you don’t use features requiring it yet, you can leave it empty.

### Run the dev server

```bash
pnpm dev
```

By default the app runs on `http://localhost:3000` (configured in `astro.config.mjs`).

## 5. Available scripts

All scripts are defined in `package.json`:

- **`pnpm dev`**: start the Astro development server
- **`pnpm build`**: build for production
- **`pnpm preview`**: preview the production build locally
- **`pnpm lint`**: run ESLint
- **`pnpm lint:fix`**: run ESLint with auto-fixes
- **`pnpm format`**: format code using Prettier

## 6. Project scope

### MVP features (from PRD)

- **Welcome / access**
  - Mini landing page for unauthenticated users with a “Log in” entry point
  - Simple auth (email/password or social login) for a single user
  - Logout action that clears the session and returns to the mini landing page
- **Dashboard**
  - Recent trips list, sorted chronologically
  - Quick-start “FAB” to start a new trip
- **Trip management**
  - Create a trip with default “now” timestamp and GPS-based location
  - Edit trip duration (start/stop)
  - Offline-first: save locally and sync to Supabase when back online
- **Weather module (AccuWeather integration)**
  - Auto-fetch for trips within the last 24h
  - Store weather snapshots permanently (no overwrites)
  - Manual, optional entry for older trips
  - Warning when changing trip date may invalidate weather data
- **Catches (“trophies”)**
  - Add fish from a species dictionary
  - Required fields: species, bait, groundbait
  - Optional: weight, length, photo (client-side compression, max 2000px on longer side)
  - Auto trip summary
- **Gear management**
  - CRUD for rods, baits, groundbaits
  - Allow selecting multiple gear items per trip (multiselect)
  - Remember last used set
  - Historical consistency via snapshots (renames don’t rewrite history)

### Out of scope / constraints (MVP)

- **Language**: Polish-only UI
- **Units**: metric only (kg, cm, m)
- **Registration**: no open self-registration (entry is hidden or placeholder)
- **Weather history**: auto-fetch limited to 24h back
- **Account deletion / GDPR**: not planned (private project)
- **Platform**: web app (mobile + desktop)

## 7. Project status

**Early MVP (in development).** The repository currently contains the Astro + React + Tailwind + shadcn/ui foundation; the PRD features are planned and will be implemented incrementally.

Planned integrations (per PRD):
- **AccuWeather API** (weather snapshots)
- **Google Maps API** (map-based location visualization and editing)

## 8. License

**Unlicensed (private project).** No `LICENSE` file is currently included. If you plan to open-source this repository, add a license file (e.g., MIT) and update this section accordingly.
