import type { MiddlewareHandler } from "astro";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Astro middleware that initializes Supabase client for each request.
 * The client is stored in `context.locals.supabase` and handles cookie-based auth.
 */
export const onRequest: MiddlewareHandler = async (context, next) => {
  context.locals.supabase = createServerClient(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    cookies: {
      get(key: string) {
        return context.cookies.get(key)?.value;
      },
      set(key: string, value: string, options: CookieOptions) {
        context.cookies.set(key, value, options);
      },
      remove(key: string, options: CookieOptions) {
        context.cookies.delete(key, options);
      },
    },
  });

  return next();
};
