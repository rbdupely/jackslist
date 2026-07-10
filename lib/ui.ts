// Per-category visual identity. Class strings are static so Tailwind's JIT
// keeps them. Keyed by category slug.

export type CatUI = {
  label: string;
  text: string;
  bg: string;
  tint: string; // faint background wash
  border: string;
  dot: string;
  chip: string; // solid pill (text on color)
};

const MAP: Record<string, CatUI> = {
  food: {
    label: "Food",
    text: "text-food",
    bg: "bg-food",
    tint: "bg-food/10",
    border: "border-food/30",
    dot: "bg-food",
    chip: "bg-food text-white",
  },
  stocks: {
    label: "Stocks",
    text: "text-stocks",
    bg: "bg-stocks",
    tint: "bg-stocks/10",
    border: "border-stocks/30",
    dot: "bg-stocks",
    chip: "bg-stocks text-white",
  },
  books: {
    label: "Books",
    text: "text-books",
    bg: "bg-books",
    tint: "bg-books/10",
    border: "border-books/30",
    dot: "bg-books",
    chip: "bg-books text-white",
  },
  gaming: {
    label: "Gaming",
    text: "text-gaming",
    bg: "bg-gaming",
    tint: "bg-gaming/10",
    border: "border-gaming/30",
    dot: "bg-gaming",
    chip: "bg-gaming text-white",
  },
  movies: {
    label: "Movies",
    text: "text-movies",
    bg: "bg-movies",
    tint: "bg-movies/10",
    border: "border-movies/30",
    dot: "bg-movies",
    chip: "bg-movies text-white",
  },
};

const FALLBACK: CatUI = {
  label: "",
  text: "text-ink",
  bg: "bg-ink",
  tint: "bg-ink/5",
  border: "border-line",
  dot: "bg-ink",
  chip: "bg-ink text-cream",
};

export function catUI(slug: string): CatUI {
  return MAP[slug] ?? FALLBACK;
}
