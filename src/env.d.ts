/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  /** AccuWeather API key for weather data fetching */
  readonly ACCUWEATHER_API_KEY: string;
  /** AccuWeather base URL (optional, defaults to production) */
  readonly ACCUWEATHER_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    supabase: import("@/db/supabase.client").SupabaseClient;
  }
}
