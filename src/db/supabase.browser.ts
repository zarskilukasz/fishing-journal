import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "./supabase.client";

/**
 * Creates a Supabase client for browser-side usage.
 * Uses PUBLIC_ prefixed environment variables that are exposed to the client.
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  return createBrowserClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
}
