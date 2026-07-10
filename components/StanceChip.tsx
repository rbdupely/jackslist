// A verdict from a critic who doesn't give scores. Never inside the circular
// badge (the circle means a number from one person).
const STYLES: Record<string, string> = {
  rave: "bg-stocks/12 text-stocks",
  positive: "bg-stocks/12 text-stocks",
  selected: "bg-stocks/12 text-stocks",
  mixed: "bg-gold/15 text-[#8a6516]",
  negative: "bg-flame/12 text-flame-dark",
  new_buy: "bg-stocks/12 text-stocks",
  added: "bg-stocks/12 text-stocks",
  holds: "bg-sunk text-muted",
  trimmed: "bg-gold/15 text-[#8a6516]",
  exited: "bg-flame/12 text-flame-dark",
  called_out: "bg-sunk text-muted",
};

const LABELS: Record<string, string> = {
  new_buy: "New buy",
  added: "Added",
  holds: "Holds",
  trimmed: "Trimmed",
  exited: "Exited",
  called_out: "Called out",
  selected: "Picked",
};

export function StanceChip({ stance, size = "md" }: { stance: string; size?: "sm" | "md" }) {
  const label = LABELS[stance] ?? stance.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-chip font-semibold ${pad} ${
        STYLES[stance] ?? "bg-sunk text-muted"
      }`}
    >
      {label}
    </span>
  );
}
