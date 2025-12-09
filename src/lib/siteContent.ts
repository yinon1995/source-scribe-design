export const site = {
  name: "À la Brestoise",
  tagline: "Des articles à la Brestoise : Événements, Lieux et commerces, Bien-être, Échappées Belles",
  url: "https://source-scribe-design.vercel.app",
  hero: {
    title: "Des articles à la Brestoise : Événements, Lieux et commerces, Bien-être, Échappées Belles",
    subtitle:
      "Explorez ce blog éditorial au cœur de Brest.",
    ctaLabel: "Lire les articles",
    ctaHref: "/articles",
  },
  nav: {
    accueil: "Accueil",
    articles: "Articles",
    aPropos: "À propos",
    services: "Services & Partenariats",
    contact: "Contact",
    avis: "Avis",
    thematiques: "Thématiques",
  },
  categories: {
    commercesEtLieux: "Commerces & lieux",
    experience: "Événementiel",
    beaute: "Beauté & cosmétique",
    decouvertes: "Échapées Belles",
  },
  footer: {
    social: {
      linkedin: "https://www.linkedin.com/in/nolwennrobet",
      whatsapp: "https://mail.google.com/mail/?view=cm&fs=1&to=nolwennalabrestoise@gmail.com",
      tiktok: "https://www.tiktok.com/@nollaframboise?_r=1&_t=ZN-917nFjtOgH0",
      instagram: "https://www.instagram.com/nollalabrestoise?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    },
    legal: {
      mentions: "/mentions-legales",
      privacy: "/politique-de-confidentialite",
      terms: "/conditions-dutilisation",
    },
  },
} as const;

const categoryHref = (label: string) => `/articles?category=${encodeURIComponent(label)}`;

export const NAV_CATEGORIES = [
  { href: categoryHref(site.categories.commercesEtLieux), label: site.categories.commercesEtLieux },
  { href: categoryHref(site.categories.experience), label: site.categories.experience },
  { href: categoryHref(site.categories.beaute), label: site.categories.beaute },
  { href: categoryHref(site.categories.decouvertes), label: site.categories.decouvertes },
] as const;

export const NAV_LINKS = [
  { href: "/", label: site.nav.accueil },
  { href: "/articles", label: site.nav.articles },
  { href: "/a-propos", label: site.nav.aPropos },
  { href: "/services", label: site.nav.services },
  { href: "/avis", label: site.nav.avis },
  { href: "/contact", label: site.nav.contact },
] as const;

export const HIDDEN_CATEGORY_LABELS = [
  "Sciences et décryptage",
] as const;
