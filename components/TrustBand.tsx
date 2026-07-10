// The thesis, stated once and confidently: trust-as-a-service. A deliberately
// dark, data-forward band on the warm page — human faces elsewhere, receipts here.

const PILLARS = [
  {
    k: "01",
    t: "Named humans, not crowds",
    d: "You follow a person with a track record — Buffett, Portnoy, Oprah — never an anonymous star-average.",
  },
  {
    k: "02",
    t: "Every take has a receipt",
    d: "Each score links straight to its source: the SEC filing, the video, the published list. Verify anything.",
  },
  {
    k: "03",
    t: "No algorithm decides",
    d: "We don't rank, weight, or blend opinions into mush. You choose who to trust — we just keep the receipts.",
  },
];

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="tnum font-display text-3xl font-extrabold text-white sm:text-4xl">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.15em] text-white/45">{label}</div>
    </div>
  );
}

export function TrustBand({
  stats,
}: {
  stats: { critics: number; takes: number; items: number };
}) {
  return (
    <section className="bg-ink text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="overline text-flame">Trust as a service</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-extrabold leading-tight sm:text-[2.75rem]">
          Every verdict here comes with a receipt.
        </h2>
        <p className="mt-4 max-w-xl text-white/60">
          The internet buried taste under anonymous averages and gamed algorithms. We did the
          opposite — real experts, named, every opinion traceable to the source it came from.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.k}>
              <div className="tnum text-sm font-bold text-flame">{p.k}</div>
              <h3 className="mt-2 font-display text-lg font-bold text-white">{p.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{p.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-x-12 gap-y-6 border-t border-white/10 pt-8">
          <Stat value={stats.critics.toLocaleString()} label="critics you can name" />
          <Stat value={stats.takes.toLocaleString()} label="sourced takes" />
          <Stat value={stats.items.toLocaleString()} label="things rated" />
          <Stat value="0" label="algorithms" />
        </div>
      </div>
    </section>
  );
}
