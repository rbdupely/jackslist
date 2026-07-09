import type { Metadata } from "next";
import Link from "next/link";
import { getRequests } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { AdminRequestControls } from "@/components/AdminRequestControls";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false },
};

export default async function AdminPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-3xl font-semibold text-ink">Admin only</h1>
        <p className="mt-2 text-ink-soft">
          {user ? "Your account isn't on the admin list." : "Sign in with an admin account."}
        </p>
        {!user && (
          <Link
            href="/login?next=/admin"
            className="mt-5 inline-block rounded-full bg-flame px-5 py-2.5 font-semibold text-white hover:bg-flame-dark"
          >
            Sign in
          </Link>
        )}
      </div>
    );
  }

  const requests = await getRequests();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-ink">Request queue</h1>
      <p className="mt-2 text-ink-soft">
        Move requests through Requested → Planned → Filmed, and link the venue once a video is out.
      </p>

      <div className="mt-8 space-y-3">
        {requests.map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-3 rounded-card border border-line bg-paper p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-display text-lg font-semibold text-ink">
                {[r.cuisine, r.category].filter(Boolean).join(" ") || r.query_text}
                {r.city ? <span className="text-ink-soft"> · {r.city}</span> : null}
              </p>
              <p className="text-xs text-ink-soft">
                {r.upvotes} upvotes · searched {r.search_count}× · key {r.normalized_key}
              </p>
            </div>
            <AdminRequestControls request={r} />
          </div>
        ))}
        {requests.length === 0 && (
          <p className="text-ink-soft">No requests yet.</p>
        )}
      </div>
    </div>
  );
}
