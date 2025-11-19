export const ARTICLE_BODY_FONT_VALUES = [
  "josefin-sans",
  "raleway",
  "montserrat",
  "merriweather",
  "libre-baskerville",
  "alice",
] as const;

export type ArticleBodyFont = (typeof ARTICLE_BODY_FONT_VALUES)[number];

export function isArticleBodyFont(value: unknown): value is ArticleBodyFont {
  return typeof value === "string" && ARTICLE_BODY_FONT_VALUES.includes(value as ArticleBodyFont);
}


