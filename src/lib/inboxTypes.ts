export type LeadCategory =
  | "newsletter"
  | "services"
  | "quote"
  | "testimonial"
  | "contact"
  | "suggestion";

export type Lead = {
  id: string;
  category: LeadCategory;
  source: string;
  email?: string;
  name?: string;
  message?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

export type LeadCreateInput = {
  category: LeadCategory;
  source: string;
  email?: string;
  name?: string;
  message?: string;
  meta?: Record<string, unknown>;
};

export const LEAD_CATEGORY_LABELS: Record<LeadCategory, string> = {
  newsletter: "Newsletter / nouveaux articles",
  services: "Services / partenariats",
  quote: "Services / partenariats / devis",
  testimonial: "Recommandations / témoignages",
  contact: "Contact général",
  suggestion: "Suggestion de sujet",
};

export const ALL_LEAD_CATEGORIES: LeadCategory[] = [
  "newsletter",
  "services",
  "quote",
  "testimonial",
  "contact",
  "suggestion",
];

export const LEAD_CATEGORY_FILTERS = [
  { value: "all" as const, label: "Tous" },
  ...ALL_LEAD_CATEGORIES.map((category) => ({
    value: category,
    label: LEAD_CATEGORY_LABELS[category],
  })),
];


