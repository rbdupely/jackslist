import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryBySlug, getItemBySlug, getRelatedItems } from "@/lib/data";
import { itemCuisine } from "@/lib/types";
import { ItemMap } from "@/components/ItemMap";
import { TakeCard } from "@/components/TakeCard";
import { ItemCard } from "@/components/ItemCard";
import { ItemPhoto } from "@/components/ItemPhoto";
import { CriticVerdicts } from "@/components/CriticVerdicts";
import { AdminEnrichButton } from "@/components/AdminEnrichButton";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { citySlug } from "@/lib/util";

type Params = Promise<{ category: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category, slug } = await params;
  const data = await getItemBySlug(category, slug);
  if (!data) return { title: "Not found" };
  return {
    title: data.item.name,
    description:
      data.item.metadata?.blurb ??
      `What the critics say about ${data.item.name}, on OnlyCritics.`,
  };
}

export default async function ItemPage({ params }: { params: Params }) {
  const { category, slug } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) notFound();

  const data = await getItemBySlug(category, slug);
  if (!data) notFound();

  const { item, takes } = data;
  const isFood = cat.slug === "food";
  const isStocks = cat.slug === "stocks";

  const related = isFood ? await getRelatedItems(item, 6) : [];
  const meta = [item.subtype, isFood ? itemCuisine(item) : item.creator]
    .filter(Boolean)
    .join(" · ");

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const isAdmin = isAdminEmail(user?.email);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <nav className="mb-5 text-sm text-ink-soft">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        {" / "}
        <Link href={`/${cat.slug}`} className="hover:text-ink">
          {cat.name}
        </Link>
        {isFood && item.city && (
          <>
            {" / "}
            <Link href={`/city/${citySlug(item.city)}`} className="hover:text-ink">
              {item.city}
            </Link>
          </>
        )}
      </nav>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            {item.name}
          </h1>
          {(meta || item.price_tier) && (
            <p className="mt-2 text-ink-soft">
              {meta}
              {item.price_tier ? ` · ${item.price_tier}` : ""}
            </p>
          )}
          {isFood && item.city && (
            <p className="text-sm text-ink-soft">
              {item.neighborhood ? `${item.neighborhood}, ` : ""}
              {item.city}
              {item.country ? `, ${item.country}` : ""}
            </p>
          )}
          {isStocks && item.external_ids?.cusip && (
            <p className="text-sm text-ink-soft">CUSIP {item.external_ids.cusip}</p>
          )}

          {/* Who said what — the heart of the product. */}
          <div className="mt-6">
            <CriticVerdicts item={item} takes={takes} />
          </div>

          {item.metadata?.blurb && (
            <p className="mt-6 font-display text-2xl leading-snug text-ink">
              {item.metadata.blurb}
            </p>
          )}
        </div>

        {!isStocks && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-card border border-line">
            <ItemPhoto item={item} sizes="(max-width: 768px) 100vw, 40vw" />
          </div>
        )}
      </div>

      {isStocks && (
        <p className="mt-6 rounded-card border border-line bg-paper px-4 py-3 text-sm text-ink-soft">
          <span className="font-semibold text-ink">Not investment advice.</span> These are
          positions and statements that public figures have publicly disclosed or made — sourced
          from their SEC filings. Nothing here is a recommendation to buy or sell any security.
        </p>
      )}

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold text-ink">
            {isStocks ? "The disclosures" : "The takes"}
            <span className="ml-2 text-base font-normal text-ink-soft">
              {takes.length} from {item.critic_count}{" "}
              {item.critic_count === 1 ? "critic" : "critics"}
            </span>
          </h2>
          <div className="space-y-4">
            {takes.map((t) => (
              <TakeCard key={t.id} take={t} />
            ))}
          </div>
        </section>

        {isFood && (
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <h2 className="mb-4 font-display text-2xl font-semibold text-ink">Find it</h2>
            <ItemMap item={item} />
            {isAdmin && <AdminEnrichButton slug={item.slug} />}
          </aside>
        )}
      </div>

      {related.length > 0 && item.city && (
        <section className="mt-14">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-display text-2xl font-semibold text-ink">More in {item.city}</h2>
            <Link
              href={`/city/${citySlug(item.city)}`}
              className="text-sm font-medium text-flame hover:underline"
            >
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((v) => (
              <ItemCard key={v.id} item={v} categorySlug={cat.slug} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
