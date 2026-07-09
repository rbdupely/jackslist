"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthButton() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setEmail(data.user?.email ?? null);
        setReady(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
      setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.refresh();
  }

  if (!ready) {
    return <div className="h-8 w-16 animate-pulse rounded-full bg-line" aria-hidden />;
  }

  if (email) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="hidden max-w-[10rem] truncate text-ink-soft sm:inline" title={email}>
          {email}
        </span>
        <button
          onClick={signOut}
          className="rounded-full border border-line px-3 py-1.5 font-medium text-ink transition hover:border-ink/30"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-ink transition hover:border-ink/30"
    >
      Sign in
    </Link>
  );
}
