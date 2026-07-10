// A verdict from a critic who doesn't give scores (ACG's "Buy", a fund's
// "New buy"). Never rendered inside the circular badge — the circle means a
// number from one person.
const STYLES: Record<string, string> = {
  rave: "bg-green-600 text-white",
  positive: "bg-green-100 text-green-800",
  mixed: "bg-amber-100 text-amber-800",
  negative: "bg-red-100 text-red-800",
  new_buy: "bg-green-600 text-white",
  added: "bg-green-100 text-green-800",
  holds: "bg-stone-100 text-stone-700",
  trimmed: "bg-amber-100 text-amber-800",
  exited: "bg-red-100 text-red-800",
  called_out: "bg-stone-100 text-stone-700",
};

const LABELS: Record<string, string> = {
  new_buy: "New buy",
  added: "Added",
  holds: "Holds",
  trimmed: "Trimmed",
  exited: "Exited",
  called_out: "Called out",
};

export function StanceChip({ stance, size = "md" }: { stance: string; size?: "sm" | "md" }) {
  const label = LABELS[stance] ?? stance.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const pad = size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-semibold ${pad} ${
        STYLES[stance] ?? "bg-stone-100 text-stone-700"
      }`}
    >
      {label}
    </span>
  );
}
