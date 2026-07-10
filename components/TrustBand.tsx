// The thesis, stated once and confidently: trust-as-a-service. A deliberately
// dark, data-forward band on the warm page — human faces elsewhere, receipts here.

const PILLARS = [
  {
    k: "01",
    t: "Critics have names",
    d: "Buffett. Portnoy. Oprah. You follow a person with a track record you can look up — and drop them the second they lose you.",
  },
  {
    k: "02",
    t: "Everything links back",
    d: "Every score points to where it came from: the filing, the video, the list. None of it is our opinion.",
  },
  {
    k: "03",
    t: "Nothing gets blended",
    d: "No ranking model. No weighting. No mystery math. When two critics disagree, you see both and call it.",
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
        <p className="overline text-flame">No crowds. No algorithms.</p>
        <h2 className="mt-3 max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-[2.75rem]">
          Every verdict comes with a receipt.
        </h2>

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
          <Stat value={stats.critics.toLocaleString()} label="critics" />
          <Stat value={stats.takes.toLocaleString()} label="takes, all sourced" />
          <Stat value={stats.items.toLocaleString()} label="things rated" />
        </div>
      </div>
    </section>
  );
}
