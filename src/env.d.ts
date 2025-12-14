/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  /** Public Supabase URL for client-side usage */
  readonly PUBLIC_SUPABASE_URL: string;
  /** Public Supabase anon key for client-side usage */
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  /** AccuWeather API key for weather data fetching */
  readonly ACCUWEATHER_API_KEY: string;
  /** AccuWeather base URL (optional, defaults to production) */
  readonly ACCUWEATHER_BASE_URL?: string;
  /** Google Maps API key for client-side map components */
  readonly PUBLIC_GOOGLE_MAPS_API_KEY: string;
  /** Google Maps Map ID for styling */
  readonly PUBLIC_GOOGLE_MAPS_MAP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    supabase: import("@/db/supabase.client").SupabaseClient;
  }
}
