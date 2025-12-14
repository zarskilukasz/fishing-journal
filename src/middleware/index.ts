import type { MiddlewareHandler } from "astro";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";

/**
 * Gets environment variable from Cloudflare runtime or build-time env.
 * Cloudflare Workers/Pages expose env vars through context.locals.runtime.env at runtime.
 */
function getEnvVar(context: Parameters<MiddlewareHandler>[0], key: string): string {
  // Try Cloudflare runtime env first (for production on Cloudflare Pages)
  const runtimeEnv = (context.locals as { runtime?: { env?: Record<string, string> } }).runtime?.env;
  if (runtimeEnv?.[key]) {
    return runtimeEnv[key];
  }
  // Fall back to build-time env (for local development)
  return (import.meta.env as Record<string, string>)[key] ?? "";
}

/**
 * Astro middleware that initializes Supabase client for each request.
 * The client is stored in `context.locals.supabase` and handles cookie-based auth.
 *
 * Uses getAll/setAll pattern for proper SSR cookie handling.
 * Token refresh is triggered before response to avoid late cookie updates.
 */
export const onRequest: MiddlewareHandler = async (context, next) => {
  const supabaseUrl = getEnvVar(context, "SUPABASE_URL");
  const supabaseKey = getEnvVar(context, "SUPABASE_KEY");

  context.locals.supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(context.request.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            context.cookies.set(name, value, options);
          });
        } catch {
          // Cookie setting may fail if response has already been sent.
          // This can happen during async token refresh after SSR streaming starts.
          // The client-side will handle token refresh in this case.
        }
      },
    },
  });

  // Trigger token refresh before the response is sent.
  // This ensures cookies are set during the middleware phase, not after streaming.
  await context.locals.supabase.auth.getUser();

  return next();
};
