import type { SupabaseClient as SupabaseClientGeneric } from "@supabase/supabase-js";

/**
 * Type alias for Supabase client instance.
 * Uses generic Database type (can be extended with generated types from Supabase CLI).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseClient = SupabaseClientGeneric<any, "public", any>;
