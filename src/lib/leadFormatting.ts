import type { Lead } from "./inboxTypes";

const META_KEY_LABELS: Record<string, string> = {
  company: "Entreprise",
  organization: "Organisation",
  organisation: "Organisation",
  clientType: "Type de client",
  role: "Rôle",
  fonction: "Fonction",
  fonction_entreprise: "Fonction",
  city: "Ville",
  budget: "Budget",
  deadline: "Délai",
  phone: "Téléphone",
  projectType: "Type de projet",
  rating: "Note",
  avatar: "Avatar (image)",
  avatarDataUrl: "Avatar (image)",
  avatarUrl: "Photo / avatar",
  photos: "Photos partagées",
  service: "Service",
  services: "Services",
  subject: "Sujet",
};

const MESSAGE_PREVIEW_MAX = 110;

function truncateText(value: string, max = MESSAGE_PREVIEW_MAX) {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}…`;
}

export function formatMetaKey(key: string) {
  if (META_KEY_LABELS[key]) return META_KEY_LABELS[key];
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatLeadMessagePreview(lead: Lead, max = MESSAGE_PREVIEW_MAX): string {
  const trimmedMessage = lead.message?.trim();
  if (trimmedMessage) {
    return truncateText(trimmedMessage, max);
  }
  const metaEntries = lead.meta && typeof lead.meta === "object"
    ? Object.entries(lead.meta)
        .filter(([, val]) => val !== undefined && val !== null && String(val).trim().length > 0)
        .map(([key, val]) => `${formatMetaKey(key)}: ${String(val)}`)
    : [];
  if (metaEntries.length > 0) {
    return truncateText(metaEntries.slice(0, 3).join(" • "), max);
  }
  return "(Aucun message)";
}


