export const site = {
  name: "À la Brestoise",
  tagline: "Des articles à la Brestoise : Événements, Lieux et Bien-être",
  url: "https://source-scribe-design.vercel.app",
  hero: {
    title: "Des articles à la Brestoise : Événements, Lieux et Bien-être",
    subtitle:
      "Explorez des contenus clairs, vivants, rédigés et sourcés.",
    ctaLabel: "Lire les articles",
    ctaHref: "/articles",
  },
  nav: {
    accueil: "Accueil",
    articles: "Articles",
    aPropos: "À propos",
    services: "Services & Partenariats",
    contact: "Contact",
    thematiques: "Thématiques",
  },
  categories: {
    commercesEtLieux: "Commerces & lieux",
    experience: "Expérience",
    beaute: "Beauté",
  },
  footer: {
    social: {
      linkedin: "https://www.linkedin.com/in/nolwennrobet",
      whatsapp: "https://wa.me/33658297220",
      tiktok: "https://www.tiktok.com/@nollaframboise?_r=1&_t=ZN-917nFjtOgH0",
    },
    legal: {
      mentions: "/mentions-legales",
      privacy: "/politique-de-confidentialite",
      terms: "/conditions-dutilisation",
    },
  },
} as const;

export const NAV_CATEGORIES = [
  { href: "/articles?category=Commerces%20%26%20lieux", label: "Commerces & lieux" },
  { href: "/articles?category=Expérience", label: "Expérience" },
  { href: "/articles?category=Beauté", label: "Beauté" },
] as const;

export const HIDDEN_CATEGORY_LABELS = [
  "Sciences et décryptage",
] as const;
