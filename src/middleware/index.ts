import type { MiddlewareHandler } from "astro";
import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";

/**
 * Astro middleware that initializes Supabase client for each request.
 * The client is stored in `context.locals.supabase` and handles cookie-based auth.
 *
 * Uses getAll/setAll pattern for proper SSR cookie handling.
 * Token refresh is triggered before response to avoid late cookie updates.
 */
export const onRequest: MiddlewareHandler = async (context, next) => {
  context.locals.supabase = createServerClient(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
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
