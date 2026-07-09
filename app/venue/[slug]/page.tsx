import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVenueBySlug, getRelatedVenues } from "@/lib/data";
import { ScoreBadge } from "@/components/ScoreBadge";
import { VenueMap } from "@/components/VenueMap";
import { MentionCard } from "@/components/MentionCard";
import { VenueCard } from "@/components/VenueCard";
import { VenuePhoto } from "@/components/VenuePhoto";
import { AdminEnrichButton } from "@/components/AdminEnrichButton";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { citySlug } from "@/lib/util";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getVenueBySlug(slug);
  if (!data) return { title: "Not found" };
  const { venue } = data;
  return {
    title: venue.name,
    description:
      venue.jack_blurb ??
      `${venue.name} — Jack's pick in ${venue.city ?? "town"}. Score ${venue.jack_score}/10.`,
  };
}

export default async function VenuePage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getVenueBySlug(slug);
  if (!data) notFound();

  const { venue, mentions } = data;
  const related = await getRelatedVenues(venue, 6);
  const meta = [venue.category, venue.cuisine_type].filter(Boolean).join(" · ");

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const isAdmin = isAdminEmail(user?.email);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-5 text-sm text-ink-soft">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        {venue.city && (
          <>
            {" / "}
            <Link href={`/city/${citySlug(venue.city)}`} className="hover:text-ink">
              {venue.city}
            </Link>
          </>
        )}
      </nav>

      {/* Hero */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="flex items-start gap-4">
            <ScoreBadge score={venue.jack_score} size="xl" />
            <div>
              <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
                {venue.name}
              </h1>
              <p className="mt-2 text-ink-soft">
                {meta}
                {venue.price_tier ? ` · ${venue.price_tier}` : ""}
              </p>
              {venue.city && (
                <p className="text-sm text-ink-soft">
                  {venue.neighborhood ? `${venue.neighborhood}, ` : ""}
                  {venue.city}
                  {venue.country ? `, ${venue.country}` : ""}
                </p>
              )}
            </div>
          </div>

          {venue.jack_blurb && (
            <p className="mt-6 font-display text-2xl leading-snug text-ink">
              {venue.jack_blurb}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {venue.mention_count > 1 && (
              <span className="rounded-full bg-flame px-3 py-1 font-semibold text-white">
                Featured {venue.mention_count}×
              </span>
            )}
          </div>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-card border border-line">
          <VenuePhoto venue={venue} sizes="(max-width: 768px) 100vw, 40vw" />
        </div>
      </div>

      {/* Body */}
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr]">
        {/* Jack's take */}
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold text-ink">
            Jack&apos;s take
            <span className="ml-2 text-base font-normal text-ink-soft">
              {mentions.length} {mentions.length === 1 ? "mention" : "mentions"}
            </span>
          </h2>
          <div className="space-y-4">
            {mentions.map((m) => (
              <MentionCard key={m.id} mention={m} />
            ))}
          </div>
        </section>

        {/* Map / details */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <h2 className="mb-4 font-display text-2xl font-semibold text-ink">Find it</h2>
          <VenueMap venue={venue} />
          {isAdmin && <AdminEnrichButton slug={venue.slug} />}
        </aside>
      </div>

      {/* More in city */}
      {related.length > 0 && venue.city && (
        <section className="mt-14">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-display text-2xl font-semibold text-ink">
              More in {venue.city}
            </h2>
            <Link
              href={`/city/${citySlug(venue.city)}`}
              className="text-sm font-medium text-flame hover:underline"
            >
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((v) => (
              <VenueCard key={v.id} venue={v} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
