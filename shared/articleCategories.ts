export const CATEGORY_OPTIONS = ["Beauté & cosmétique", "Commerces & lieux", "Événementiel"] as const;

export type NormalizedCategory = (typeof CATEGORY_OPTIONS)[number];
type LegacyCategory = "Beauté" | "Commerces & places" | "Commerces & lieux" | "Expérience";
export type JsonArticleCategory = NormalizedCategory | LegacyCategory;

export const DEFAULT_CATEGORY: NormalizedCategory = CATEGORY_OPTIONS[0];

export function normalizeCategory(input?: JsonArticleCategory | string | null): NormalizedCategory {
  const value = typeof input === "string" ? input.trim() : "";
  if ((CATEGORY_OPTIONS as readonly string[]).includes(value)) {
    return value as NormalizedCategory;
  }
  switch (value) {
    case "Beauté":
      return "Beauté & cosmétique";
    case "Commerces & lieux":
    case "Commerces & places":
      return "Commerces & lieux";
    case "Expérience":
      return "Événementiel";
    default:
      return DEFAULT_CATEGORY;
  }
}


