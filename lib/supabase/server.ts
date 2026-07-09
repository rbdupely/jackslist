// Server-side Supabase client (Server Components, Server Actions, Route
// Handlers). Reads/writes the auth session via cookies. In Next 16 `cookies()`
// is async, so this factory is async.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In a Server Component (read-only cookie store) this throws; that's
          // fine because the session is refreshed by proxy.ts. Swallow it.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* called from a Server Component; ignore */
          }
        },
      },
    },
  );
}
