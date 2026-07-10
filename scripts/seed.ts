// DEPRECATED as of migration 0001 (OnlyCritics).
//
// This script seeded the old `venues` + `mentions` tables from
// data/recommendations.csv. Those tables are now read-only legacy: the app
// reads `items` + `takes`, and Jack's 303/363 rows were copied across by
// supabase/migrations/0001_onlycritics.sql.
//
// Re-running the old seed would write rows the app no longer reads, silently
// desyncing the catalog. The generalized replacement — one CSV per critic,
// mapped into items + takes — is scripts/seed-critic.ts.
//
// The original implementation (including the RFC-4180 CSV parser) is preserved
// in git history at commit 609a2a0.

console.error(
  [
    "scripts/seed.ts is deprecated after migration 0001.",
    "",
    "venues/mentions are legacy tables; the app now reads items/takes.",
    "Use scripts/seed-critic.ts to load a critic's CSV into items + takes.",
  ].join("\n"),
);
process.exit(1);
