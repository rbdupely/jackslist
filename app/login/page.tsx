"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/requests";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirect },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-ink">Sign in</h1>
      <p className="mt-2 text-ink-soft">
        We&apos;ll email you a magic link — no password. Sign in to upvote where Jack goes next.
      </p>

      {status === "sent" ? (
        <div className="mt-8 rounded-card border border-line bg-paper p-6 text-center">
          <div className="text-3xl">📬</div>
          <p className="mt-3 font-display text-xl text-ink">Check your email</p>
          <p className="mt-1 text-sm text-ink-soft">
            We sent a magic link to <span className="font-medium text-ink">{email}</span>.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-full border border-line bg-paper px-5 py-3 outline-none focus:border-flame"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-full bg-flame py-3 font-semibold text-white transition hover:bg-flame-dark disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
          {status === "error" && <p className="text-sm text-red-600">{message}</p>}
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
