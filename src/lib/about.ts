import type { AboutContent } from "../../shared/aboutContent";
import { DEFAULT_ABOUT_CONTENT } from "../../shared/aboutContent";

const ABOUT_MODULES = import.meta.glob("/content/about/a-propos.json", {
  eager: true,
});

function unwrapModuleValue(value: unknown) {
  if (value && typeof value === "object" && "default" in (value as Record<string, unknown>)) {
    return (value as { default: unknown }).default;
  }
  return value;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function sanitizeAboutContent(value: unknown): AboutContent | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const aboutTitle = typeof obj.aboutTitle === "string" ? obj.aboutTitle : "";
  const aboutBody = isStringArray(obj.aboutBody) ? obj.aboutBody : [];
  const valuesTitle = typeof obj.valuesTitle === "string" ? obj.valuesTitle : "";
  const valuesItems = isStringArray(obj.valuesItems) ? obj.valuesItems : [];
  const approachTitle = typeof obj.approachTitle === "string" ? obj.approachTitle : "";
  const approachBody = typeof obj.approachBody === "string" ? obj.approachBody : "";

  if (!aboutTitle || !aboutBody.length || !valuesTitle || !valuesItems.length || !approachTitle || !approachBody) {
    return null;
  }

  return {
    aboutTitle,
    aboutBody,
    valuesTitle,
    valuesItems,
    approachTitle,
    approachBody,
  };
}

const loadedAboutModule = ABOUT_MODULES["/content/about/a-propos.json"];
const loadedContent = loadedAboutModule ? sanitizeAboutContent(unwrapModuleValue(loadedAboutModule)) : null;
const ABOUT_CONTENT: AboutContent = loadedContent ?? DEFAULT_ABOUT_CONTENT;

export function getAboutContent(): AboutContent {
  return ABOUT_CONTENT;
}


