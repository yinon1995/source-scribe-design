// Admin editor page (create/edit)
// Draft behavior:
// - When no slug is provided (new article), the form starts clean and auto-saves to `draft:article:new`.
//   That draft is auto-loaded (if fresh) when coming back to the page.
// - When editing an existing article (slug present), we only load the published content.
//   No auto-loading or auto-saving of slug-specific drafts happens; the "Enregistrer le brouillon"
//   button is the only way to persist a draft snapshot locally.
// 2025-11-17 note:
// - Auto-drafts now serialize a full snapshot (including sources) and only run for brand-new articles.
// - Edits persist locally only when the admin explicitly clicks "Enregistrer le brouillon".
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import ArticleContent from "@/components/ArticleContent";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminBackButton } from "@/components/AdminBackButton";
import {
  CATEGORY_OPTIONS,
  DEFAULT_CATEGORY,
  getPostBySlug,
  normalizeCategory,
  type JsonArticle,
  type NormalizedCategory,
} from "@/lib/content";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { getAdminToken, setAdminToken } from "@/lib/adminSession";

type Article = {
  title: string;
  slug: string;
  category: NormalizedCategory;
  tags: string[];
  cover: string;
  excerpt: string;
  body: string;
  author: string;
  date: string; // ISO
  readingMinutes: number;
  heroLayout: "default" | "image-full" | "compact";
  showTitleInHero: boolean;
  footerType: "default" | "practical-info" | "cta";
  footerNote?: string;
  authorSlug?: string;
  authorAvatarUrl?: string;
  authorRole?: string;
  primaryPlaceName?: string;
  practicalInfo?: JsonArticle["practicalInfo"];
  seoTitle?: string;
  seoDescription?: string;
  searchAliases?: string[];
  canonicalUrl?: string;
  schemaType: "Article" | "LocalBusiness" | "Restaurant";
  featured: boolean;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier sélectionné."));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
        return;
      }
      reject(new Error("Format de fichier non pris en charge."));
    };
    reader.readAsDataURL(file);
  });
}

// Estimate reading time helper
function estimateMinutes(text: string, wpm = 200) {
  const words = text
    .replace(/[`*_#>!\[\]\(\)`~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / wpm));
}

const NEW_ARTICLE_DRAFT_KEY = "draft:article:new";
const ARTICLE_DRAFT_PREFIX = "draft:article:";
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type ArticleDraftSnapshot = Partial<Article> & {
  sources?: string[];
  searchAliases?: string[];
  practicalInfo?: JsonArticle["practicalInfo"];
};

const AdminNew = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editSlug = searchParams.get("slug");
  const isEditing = !!editSlug;
  const draftKey = useMemo(
    () => (isEditing && editSlug ? `${ARTICLE_DRAFT_PREFIX}${editSlug}` : NEW_ARTICLE_DRAFT_KEY),
    [isEditing, editSlug],
  );
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [category, setCategory] = useState<Article["category"]>(DEFAULT_CATEGORY);
  const [featured, setFeatured] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [cover, setCover] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("À la Brestoise");
  const [date, setDate] = useState<string>(new Date().toISOString());
  const [submitting, setSubmitting] = useState(false);
  const [adminPassword, setAdminPassword] = useState(() => getAdminToken() || "");
  const [errors, setErrors] = useState<{ title?: string; category?: string; slug?: string; body?: string; date?: string; cover?: string; password?: string; readingMinutes?: string }>({});
  const [serverError, setServerError] = useState<{ message?: string; details?: string; missingEnv?: string[] }>({});
  const [publishInfo, setPublishInfo] = useState<{ url: string; commit?: { sha: string; url?: string }; files?: { article?: string; index?: string }; deploy?: { triggered: boolean; error?: string }; deployTriggered?: boolean } | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [lastRequest, setLastRequest] = useState<any>(null);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const inlineImageInputRef = useRef<HTMLInputElement | null>(null);
  const saveDraftTimerRef = useRef<number | null>(null);
  const manualReadingOverrideRef = useRef(false);
  const [readingMinutes, setReadingMinutes] = useState<number>(() => estimateMinutes(`${excerpt}\n\n${body}`));
  const [sourcesText, setSourcesText] = useState("");
  const [heroLayout, setHeroLayout] = useState<Article["heroLayout"]>("default");
  const [showTitleInHero, setShowTitleInHero] = useState(true);
  const [footerType, setFooterType] = useState<Article["footerType"]>("default");
  const [footerNote, setFooterNote] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  const [authorAvatarUrl, setAuthorAvatarUrl] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [primaryPlaceName, setPrimaryPlaceName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [searchAliasesText, setSearchAliasesText] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [schemaType, setSchemaType] = useState<Article["schemaType"]>("Article");
  const refCounter = useRef(1);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageAlt, setImageAlt] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isImageReading, setIsImageReading] = useState(false);
  const [imageAlignment, setImageAlignment] = useState<"left" | "right" | "full">("full");

  // Centralized helper to apply either a clean slate, a saved draft, or an existing article.
  const applySnapshot = useCallback(
    (snapshot?: ArticleDraftSnapshot, options?: { slugTouched?: boolean }) => {
      const normalizedCategory = snapshot?.category ? normalizeCategory(snapshot.category) : DEFAULT_CATEGORY;
      const tagsList = Array.isArray(snapshot?.tags) ? snapshot?.tags : [];
      const excerptValue = snapshot?.excerpt ?? "";
      const bodyValue = snapshot?.body ?? "";
      const derivedReadingMinutes =
        typeof snapshot?.readingMinutes === "number" && snapshot.readingMinutes > 0
          ? snapshot.readingMinutes
          : estimateMinutes(`${excerptValue}\n\n${bodyValue}`);
      const isoDate = (() => {
        if (snapshot?.date) {
          try {
            return new Date(snapshot.date).toISOString();
          } catch {
            // ignore invalid date
          }
        }
        return new Date().toISOString();
      })();
      const practicalInfo = snapshot?.practicalInfo ?? {};

      setTitle(snapshot?.title ?? "");
      setSlug(snapshot?.slug ?? "");
      setSlugTouched(options?.slugTouched ?? Boolean(snapshot?.slug));
      setCategory(normalizedCategory);
      setFeatured(snapshot?.featured === true);
      setTagsInput(tagsList.join(", "));
      setCover(snapshot?.cover ?? "");
      setExcerpt(excerptValue);
      setBody(bodyValue);
      setAuthor(snapshot?.author ?? "À la Brestoise");
      setDate(isoDate);
      setReadingMinutes(derivedReadingMinutes);
      setHeroLayout(snapshot?.heroLayout ?? "default");
      setShowTitleInHero(snapshot?.showTitleInHero !== false);
      setFooterType(snapshot?.footerType ?? "default");
      setFooterNote(snapshot?.footerNote ?? "");
      setAuthorSlug(snapshot?.authorSlug ?? "");
      setAuthorAvatarUrl(snapshot?.authorAvatarUrl ?? "");
      setAuthorRole(snapshot?.authorRole ?? "");
      setPrimaryPlaceName(snapshot?.primaryPlaceName ?? "");
      setAddress(practicalInfo?.address ?? "");
      setPhone(practicalInfo?.phone ?? "");
      setWebsiteUrl(practicalInfo?.websiteUrl ?? "");
      setGoogleMapsUrl(practicalInfo?.googleMapsUrl ?? "");
      setOpeningHours(practicalInfo?.openingHours ?? "");
      setSeoTitle(snapshot?.seoTitle ?? "");
      setSeoDescription(snapshot?.seoDescription ?? "");
      setCanonicalUrl(snapshot?.canonicalUrl ?? "");
      setSchemaType(snapshot?.schemaType ?? "Article");
      setSourcesText(Array.isArray(snapshot?.sources) ? snapshot.sources.join("\n") : "");
      setSearchAliasesText(Array.isArray(snapshot?.searchAliases) ? snapshot.searchAliases.join("\n") : "");
      setImageDialogOpen(false);
      setImageAlt("");
      setImageDataUrl(null);
      setIsImageReading(false);
      setImageAlignment("full");
      manualReadingOverrideRef.current = false;
    },
    [],
  );

  const snapshotFromPost = useCallback(
    (existing: NonNullable<ReturnType<typeof getPostBySlug>>): ArticleDraftSnapshot => ({
      title: existing.title,
      slug: existing.slug,
      category: (existing as any).category,
      tags: Array.isArray(existing.tags) ? existing.tags : [],
      cover: existing.heroImage || "",
      excerpt: existing.summary || "",
      body: existing.body || "",
      author: existing.author || "À la Brestoise",
      date: existing.date,
      readingMinutes: existing.readingMinutes,
      sources: Array.isArray(existing.sources) ? existing.sources : [],
      heroLayout: (existing.heroLayout ?? "default") as Article["heroLayout"],
      showTitleInHero: existing.showTitleInHero !== false,
      footerType: (existing.footerType ?? "default") as Article["footerType"],
      footerNote: existing.footerNote,
      authorSlug: existing.authorSlug,
      authorAvatarUrl: existing.authorAvatarUrl,
      authorRole: existing.authorRole,
      primaryPlaceName: existing.primaryPlaceName,
      practicalInfo: existing.practicalInfo,
      seoTitle: existing.seoTitle,
      seoDescription: existing.seoDescription,
      searchAliases: Array.isArray(existing.searchAliases) ? existing.searchAliases : [],
      canonicalUrl: existing.canonicalUrl,
      schemaType: (existing.schemaType ?? "Article") as Article["schemaType"],
      featured: existing.featured === true,
    }),
    [],
  );

  // Undo history for body textarea
  type BodySnapshot = { body: string; selStart: number; selEnd: number; scrollTop: number };
  const historyRef = useRef<BodySnapshot[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const debounceTimerRef = useRef<number | null>(null);

  // field refs for scrolling & auto-grow
  const titleRef = useRef<HTMLInputElement | null>(null);
  const slugRef = useRef<HTMLInputElement | null>(null);
  const categoryRef = useRef<HTMLDivElement | null>(null);
  const dateRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.style.height = "auto";
    bodyRef.current.style.height = bodyRef.current.scrollHeight + "px";
  }, [body]);

  // Reset or hydrate when switching modes / slug changes
  useEffect(() => {
    setPublishInfo(null);
    setServerError({});
    setErrors({});

    if (isEditing && editSlug) {
      const existing = getPostBySlug(editSlug);
      if (existing) {
        applySnapshot(snapshotFromPost(existing), { slugTouched: true });
      } else {
        applySnapshot({ slug: editSlug }, { slugTouched: true });
      }
      return;
    }

    applySnapshot(undefined, { slugTouched: false });
  }, [isEditing, editSlug, applySnapshot, snapshotFromPost]);

  // Load draft per context (new vs specific slug) so multiple edits stay isolated
  useEffect(() => {
    if (!draftKey || isEditing) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const snapshot: ArticleDraftSnapshot | undefined =
        parsed && typeof parsed === "object" && "article" in parsed ? parsed.article : parsed;
      const ts = parsed && typeof parsed === "object" && typeof parsed.ts === "number" ? parsed.ts : undefined;
      if (ts && Date.now() - ts > DRAFT_MAX_AGE_MS) {
        localStorage.removeItem(draftKey);
        return;
      }
      if (snapshot) {
        applySnapshot(snapshot, { slugTouched: Boolean(snapshot.slug) });
      }
    } catch {
      // ignore invalid drafts
    }
  }, [draftKey, applySnapshot, isEditing]);

  const persistDraft = useCallback(
    (snapshot: ArticleDraftSnapshot) => {
      if (!draftKey) return;
      try {
        localStorage.setItem(draftKey, JSON.stringify({ article: snapshot, ts: Date.now() }));
      } catch {
        // ignore quota/storage errors
      }
    },
    [draftKey],
  );

  const removeDraft = useCallback(() => {
    if (!draftKey) return;
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
  }, [draftKey]);

  const scheduleDraftSave = useCallback(
    (snapshot: ArticleDraftSnapshot) => {
      if (!draftKey) return;
      if (saveDraftTimerRef.current) window.clearTimeout(saveDraftTimerRef.current);
      saveDraftTimerRef.current = window.setTimeout(() => persistDraft(snapshot), 800);
    },
    [draftKey, persistDraft],
  );

  useEffect(
    () => () => {
      if (saveDraftTimerRef.current) window.clearTimeout(saveDraftTimerRef.current);
    },
    [draftKey],
  );

  // auto-generate slug from title only while creating a new article
  useEffect(() => {
    if (isEditing) return;
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched, isEditing]);

  // Auto-update reading time from excerpt/body unless manually overridden
  useEffect(() => {
    if (!manualReadingOverrideRef.current) {
      setReadingMinutes(estimateMinutes(`${excerpt}\n\n${body}`));
    }
  }, [body, excerpt]);

  // Helpers: history push & undo restore
  function pushBodySnapshot() {
    const ta = bodyRef.current;
    if (!ta) return;
    const snap: BodySnapshot = {
      body,
      selStart: ta.selectionStart ?? body.length,
      selEnd: ta.selectionEnd ?? body.length,
      scrollTop: ta.scrollTop,
    };
    // If we undid some steps and then type, discard forward history
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }
    historyRef.current.push(snap);
    if (historyRef.current.length > 50) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
  }

  function scheduleDebouncedSnapshot() {
    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = window.setTimeout(() => {
      pushBodySnapshot();
    }, 1000);
  }

  function restoreUndo() {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snap = historyRef.current[historyIndexRef.current];
    setBody(snap.body);
    requestAnimationFrame(() => {
      const ta = bodyRef.current;
      if (!ta) return;
      ta.focus();
      ta.scrollTop = snap.scrollTop;
      ta.setSelectionRange(snap.selStart, snap.selEnd);
    });
  }

  const tags = useMemo(() =>
    tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  [tagsInput]);

  const searchAliases = useMemo(
    () =>
      searchAliasesText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [searchAliasesText],
  );

  const article: Article = useMemo(
    () => ({
      title,
      slug,
      category,
      tags,
      cover,
      excerpt,
      body,
      author,
      date,
      readingMinutes,
      heroLayout,
      showTitleInHero,
      footerType,
      footerNote,
      authorSlug,
      authorAvatarUrl,
      authorRole,
      primaryPlaceName,
      practicalInfo: {
        address,
        phone,
        websiteUrl,
        googleMapsUrl,
        openingHours,
      },
      seoTitle,
      seoDescription,
      searchAliases,
      canonicalUrl,
      schemaType,
      featured,
    }),
    [
      title,
      slug,
      category,
      tags,
      cover,
      excerpt,
      body,
      author,
      date,
      readingMinutes,
      heroLayout,
      showTitleInHero,
      footerType,
      footerNote,
      authorSlug,
      authorAvatarUrl,
      authorRole,
      primaryPlaceName,
      address,
      phone,
      websiteUrl,
      googleMapsUrl,
      openingHours,
      seoTitle,
      seoDescription,
      searchAliases,
      canonicalUrl,
      schemaType,
      featured,
    ],
  );

  const sources = useMemo(() => sourcesText.split("\n").map((s) => s.trim()).filter(Boolean), [sourcesText]);
  const draftSnapshot = useMemo<ArticleDraftSnapshot>(() => ({ ...article, sources }), [article, sources]);
  const showPracticalInfoSection = footerType === "practical-info" || category === "Commerces & places";

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setServerError({});
    const sanitizedSlug = slugify(slug || title);
    const nextErrors: { title?: string; category?: string; slug?: string; body?: string; date?: string; cover?: string; password?: string; readingMinutes?: string } = {} as any;
    if (!article.title.trim()) nextErrors.title = "Le titre est obligatoire.";
    const allowed = new Set<NormalizedCategory>(CATEGORY_OPTIONS);
    if (!article.category || !allowed.has(article.category)) nextErrors.category = "La thématique est obligatoire.";
    if (!sanitizedSlug) nextErrors.slug = "Le slug ne peut contenir que des lettres, chiffres et tirets.";
    if (!article.body || !article.body.trim()) nextErrors.body = "Le contenu de l’article est obligatoire.";
    if (!article.readingMinutes || article.readingMinutes < 1) nextErrors.readingMinutes = "Temps de lecture invalide.";
    // Block publish if body still contains preview-only local assets
    if (/\]\(local:[^)]+\)/.test(article.body)) {
      nextErrors.body = "Remplacez les images locales par des URLs publiques avant publication.";
    }
    // Cover URL is optional; if provided, must be a valid URL
    if (article.cover && article.cover.trim().length > 0) {
      try {
        // eslint-disable-next-line no-new
        new URL(article.cover);
      } catch {
        nextErrors.cover = "L’URL d’image n’est pas valide.";
      }
    }
    if (article.date) {
      const d = new Date(article.date);
      if (isNaN(d.getTime())) nextErrors.date = "La date n’est pas valide.";
    }
    setErrors(nextErrors);
    // Normalize slug in UI and request
    setSlug(sanitizedSlug);
    const normalizedSlug = sanitizedSlug || article.slug;
    const safeArticle = { ...article, slug: normalizedSlug };
    const snapshotForPersist: ArticleDraftSnapshot = { ...draftSnapshot, slug: normalizedSlug };
    if (Object.keys(nextErrors).length > 0) {
      const order: (keyof typeof nextErrors)[] = ["title", "category", "slug", "body", "readingMinutes", "date", "password"];
      const first = order.find((k) => nextErrors[k]);
      // scroll to first invalid field
      requestAnimationFrame(() => {
        if (first === "title" && titleRef.current) titleRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        else if (first === "category" && categoryRef.current) categoryRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        else if (first === "slug" && slugRef.current) slugRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        else if (first === "body" && bodyRef.current) bodyRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        else if (first === "date" && dateRef.current) dateRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    const token = getAdminToken();
    if (!token) {
      toast.error("Session administrateur expirée — veuillez vous reconnecter.");
      navigate("/admin");
      return;
    }

    setSubmitting(true);
    const trimmedCover = cover?.trim() || "";
    const trimmedExcerpt = excerpt?.trim() || "";
    const trimmedAuthor = author?.trim() || "";
    const trimmedFooterNote = footerNote?.trim() || "";
    const trimmedAuthorSlug = authorSlug?.trim() || "";
    const trimmedAuthorAvatar = authorAvatarUrl?.trim() || "";
    const trimmedAuthorRole = authorRole?.trim() || "";
    const trimmedPrimaryPlace = primaryPlaceName?.trim() || "";
    const trimmedSeoTitle = seoTitle?.trim() || "";
    const trimmedSeoDescription = seoDescription?.trim() || "";
    const trimmedCanonicalUrl = canonicalUrl?.trim() || "";

    const rawPracticalInfo = {
      address: address?.trim() || "",
      phone: phone?.trim() || "",
      websiteUrl: websiteUrl?.trim() || "",
      googleMapsUrl: googleMapsUrl?.trim() || "",
      openingHours: openingHours?.trim() || "",
    };
    const hasPracticalInfo = Object.values(rawPracticalInfo).some(Boolean);
    const practicalInfoPayload =
      showPracticalInfoSection && hasPracticalInfo
        ? {
            address: rawPracticalInfo.address || undefined,
            phone: rawPracticalInfo.phone || undefined,
            websiteUrl: rawPracticalInfo.websiteUrl || undefined,
            googleMapsUrl: rawPracticalInfo.googleMapsUrl || undefined,
            openingHours: rawPracticalInfo.openingHours || undefined,
          }
        : undefined;

    const searchAliasesPayload = searchAliases.length > 0 ? searchAliases : undefined;

    try {
      const payload: JsonArticle = {
        title: safeArticle.title,
        slug: safeArticle.slug,
        category: safeArticle.category,
        tags: safeArticle.tags,
        cover: trimmedCover || undefined,
        excerpt: trimmedExcerpt || undefined,
        body: safeArticle.body,
        author: trimmedAuthor || undefined,
        date: safeArticle.date,
        readingMinutes: safeArticle.readingMinutes,
        sources: sources.length > 0 ? sources : undefined,
        heroLayout,
        showTitleInHero,
        footerType,
        footerNote: trimmedFooterNote || undefined,
        authorSlug: trimmedAuthorSlug || undefined,
        authorAvatarUrl: trimmedAuthorAvatar || undefined,
        authorRole: trimmedAuthorRole || undefined,
        primaryPlaceName: trimmedPrimaryPlace || undefined,
        practicalInfo: practicalInfoPayload,
        seoTitle: trimmedSeoTitle || undefined,
        seoDescription: trimmedSeoDescription || undefined,
        searchAliases: searchAliasesPayload,
        canonicalUrl: trimmedCanonicalUrl || undefined,
        schemaType,
        featured: safeArticle.featured === true ? true : false,
      };
      const reqPayload = payload;
      setLastRequest(reqPayload);
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(reqPayload),
      });
      const body = await res.json().catch(() => ({}));
      setLastResponse({ status: res.status, body });
      const errorMessage = typeof body?.error === "string" ? body.error : undefined;
      if (res.status === 401) {
        const message401 = errorMessage || "Accès refusé — mot de passe administrateur invalide.";
        setServerError({ message: message401 });
        if (!isEditing) {
          persistDraft(snapshotForPersist);
        }
        toast.error(message401);
        console.error("[admin] Publication non autorisée", res.status, message401, body);
        return;
      }
      if (res.status === 422) {
        const fieldErrors = body?.fieldErrors || body?.errors || {};
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
        const message422 = errorMessage || "Champs invalides.";
        setServerError({ message: message422 });
        if (!isEditing) {
          persistDraft(snapshotForPersist);
        }
        toast.error(message422);
        console.error("[admin] Erreur de validation publication", res.status, message422, body);
        return;
      }
      if (!res.ok || !body?.success) {
        const fallback =
          res.status >= 500 ? "Erreur serveur — veuillez réessayer." : "Publication impossible. Brouillon conservé localement.";
        const message = errorMessage || fallback;
        const detailsMsg = body?.details?.message ? String(body.details.message) : undefined;
        setServerError({
          message,
          details: detailsMsg,
          missingEnv: Array.isArray(body?.missingEnv) ? body.missingEnv : undefined,
        });
        if (!isEditing) {
          persistDraft(snapshotForPersist);
        }
        toast.error(message);
        console.error("[admin] Publication échouée", res.status, message, body);
        return;
      }

      setServerError({});
      removeDraft();
      setPublishInfo({
        url: body.url,
        commit: body.commit,
        files: body.files,
        deploy: body.deploy,
        deployTriggered: Boolean(body.deployTriggered),
      });
      const commitMsg = body?.commit?.url ? ` (commit ${body.commit.sha.slice(0, 7)})` : "";
      toast.success(`Article publié — la mise à jour du site public peut prendre 1 à 3 minutes.${commitMsg}`);
      // Auto-redirect after ~75s so the new content est disponible post-deploy
      window.setTimeout(() => navigate("/articles"), 75000);
      return;
    } catch (err: any) {
      const networkMessage = "Erreur réseau — réessayez.";
      setServerError({ message: networkMessage });
      if (!isEditing) {
        persistDraft(snapshotForPersist);
      }
      toast.error(networkMessage);
      console.error("[admin] Erreur réseau publication", err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleBodyScroll() {
    const ta = bodyRef.current;
    const pv = previewRef.current;
    if (!ta || !pv) return;
    const taMax = Math.max(1, ta.scrollHeight - ta.clientHeight);
    const ratio = ta.scrollTop / taMax;
    const pvMax = Math.max(0, pv.scrollHeight - pv.clientHeight);
    pv.scrollTop = ratio * pvMax;
  }

  // Toolbar transforms
  function transformSelection(mutator: (text: string, start: number, end: number, ta: HTMLTextAreaElement) => { next: string; selStart: number; selEnd: number }) {
    const ta = bodyRef.current;
    if (!ta) return;
    pushBodySnapshot();
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const { next, selStart, selEnd } = mutator(body, start, end, ta);
    setBody(next);
    requestAnimationFrame(() => {
      if (!bodyRef.current) return;
      bodyRef.current.focus();
      bodyRef.current.setSelectionRange(selStart, selEnd);
    });
  }

  function toggleHeading(level: 1 | 2 | 3) {
    transformSelection((text, selStart, selEnd, ta) => {
      const prefix = "#".repeat(level) + " ";
      // Compute full lines covered by selection (or current line if empty)
      const startLineStart = text.lastIndexOf("\n", selStart - 1) + 1;
      const endLineEndIdx = (() => {
        const endIdx = selEnd > selStart ? selEnd : selStart;
        const n = text.indexOf("\n", endIdx);
        return n === -1 ? text.length : n;
      })();
      const block = text.slice(startLineStart, endLineEndIdx);
      const lines = block.split("\n");
      let delta = 0;
      const nextLines = lines.map((line) => {
        const same = line.startsWith(prefix);
        const stripped = line.replace(/^\s*#{1,6}\s+/, "").replace(/^\s+/, "");
        const out = same ? stripped : prefix + stripped;
        delta += out.length - line.length;
        return out;
      });
      const nextBlock = nextLines.join("\n");
      const nextText = text.slice(0, startLineStart) + nextBlock + text.slice(endLineEndIdx);
      const newSelStart = selStart; // Keep caret start
      const newSelEnd = selEnd + delta;
      return { next: nextText, selStart: newSelStart, selEnd: newSelEnd };
    });
  }

  function toggleBulletedList() {
    transformSelection((text, selStart, selEnd) => {
      const startLineStart = text.lastIndexOf("\n", selStart - 1) + 1;
      const endIdx = selEnd > selStart ? selEnd : selStart;
      const endLineEndIdx = (() => {
        const n = text.indexOf("\n", endIdx);
        return n === -1 ? text.length : n;
      })();
      const block = text.slice(startLineStart, endLineEndIdx);
      // Unwrap fenced code if selection is entirely wrapped in a single fence block
      const unfenced = block.replace(/^```[\s\S]*?```$/gm, (m) => m.replace(/```/g, ""));
      const lines = (unfenced || block).split("\n");
      let delta = 0;
      const nextLines = lines.map((line) => {
        if (/^\s*-\s+/.test(line)) {
          const out = line.replace(/^\s*-\s+/, "");
          delta += out.length - line.length;
          return out;
        }
        const trimmed = line.trim();
        const out = trimmed.length ? `- ${line.replace(/^\s*([*+-]\s+)?/, "")}` : line;
        delta += out.length - line.length;
        return out;
      });
      const nextBlock = nextLines.join("\n");
      const nextText = text.slice(0, startLineStart) + nextBlock + text.slice(endLineEndIdx);
      const newSelStart = selStart;
      const newSelEnd = selEnd + delta;
      return { next: nextText, selStart: newSelStart, selEnd: newSelEnd };
    });
  }

  function insertIntoBodyAtCursor(insertText: string) {
    const textarea = bodyRef.current;
    if (!textarea) {
      setBody((prev) => `${prev}${insertText}`);
      scheduleDebouncedSnapshot();
      return;
    }
    pushBodySnapshot();
    const value = textarea.value ?? body ?? "";
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const next = before + insertText + after;
    setBody(next);
    scheduleDebouncedSnapshot();
    requestAnimationFrame(() => {
      const ta = bodyRef.current;
      if (!ta) return;
      ta.focus();
      const cursor = start + insertText.length;
      ta.selectionStart = cursor;
      ta.selectionEnd = cursor;
    });
  }

  function openImageDialog() {
    setImageAlt("");
    setImageDataUrl(null);
    setIsImageReading(false);
    setImageAlignment("full");
    setImageDialogOpen(true);
  }

  function handleInsertImage() {
    if (!imageDataUrl) {
      toast.error("Sélectionnez une image à insérer.");
      return;
    }

    const trimmedAlt = imageAlt.trim();
    const safeAlt = trimmedAlt.replace(/[\[\]]/g, "") || "Image";
    let markdown = `![${safeAlt}](${imageDataUrl})`;
    if (imageAlignment === "left") {
      markdown = `${markdown}{.align-left}`;
    } else if (imageAlignment === "right") {
      markdown = `${markdown}{.align-right}`;
    }

    if (trimmedAlt) {
      markdown = `${markdown}\n\n_${trimmedAlt}_`;
    }

    insertIntoBodyAtCursor(markdown);
    setImageDialogOpen(false);
    setImageAlt("");
    setImageDataUrl(null);
    setIsImageReading(false);
    setImageAlignment("full");
  }

  function insertRefMark() {
    const n = refCounter.current++;
    insertIntoBodyAtCursor(`[^${n}]`);
    if (!new RegExp(`^\\[\\^?${n}\\]`, "m").test(sourcesText)) {
      const extra = window.prompt("Source text (optionnel)", "") || "";
      setSourcesText((prev) => `${prev}${prev ? "\n" : ""}[${n}] ${extra}`);
    }
  }

  function toggleWrap(wrapper: string, emptyInsertMiddle = false) {
    transformSelection((text, selStart, selEnd) => {
      let a = selStart, b = selEnd;
      if (a === b && emptyInsertMiddle) {
        const inserted = wrapper + wrapper;
        const next = text.slice(0, a) + inserted + text.slice(b);
        const mid = a + wrapper.length;
        return { next, selStart: mid, selEnd: mid };
      }
      const selected = text.slice(a, b);
      const startsWith = text.slice(a - wrapper.length, a) === wrapper;
      const endsWith = text.slice(b, b + wrapper.length) === wrapper;
      if (startsWith && endsWith) {
        // unwrap
        const next = text.slice(0, a - wrapper.length) + selected + text.slice(b + wrapper.length);
        return { next, selStart: a - wrapper.length, selEnd: b - wrapper.length };
      }
      const next = text.slice(0, a) + wrapper + selected + wrapper + text.slice(b);
      return { next, selStart: a + wrapper.length, selEnd: b + wrapper.length };
    });
  }

  function toUppercase() {
    transformSelection((text, a, b, ta) => {
      if (a === b) {
        // current word
        const left = text.lastIndexOf(" ", a - 1) + 1;
        const right = (() => { const idx = text.indexOf(" ", a); return idx === -1 ? text.length : idx; })();
        const next = text.slice(0, left) + text.slice(left, right).toUpperCase() + text.slice(right);
        return { next, selStart: a, selEnd: b };
      }
      const next = text.slice(0, a) + text.slice(a, b).toUpperCase() + text.slice(b);
      return { next, selStart: a, selEnd: b };
    });
  }

  function toLowercase() {
    transformSelection((text, a, b) => {
      if (a === b) return { next: text, selStart: a, selEnd: b };
      const next = text.slice(0, a) + text.slice(a, b).toLowerCase() + text.slice(b);
      return { next, selStart: a, selEnd: b };
    });
  }

  function toTitleCase() {
    const stops = new Set(["de", "du", "la", "le", "les", "des", "et", "à", "aux", "au", "pour", "par", "sur", "sous", "dans"]);
    transformSelection((text, a, b) => {
      if (a === b) {
        // current line
        const lineStart = text.lastIndexOf("\n", a - 1) + 1;
        const lineEnd = (() => { const idx = text.indexOf("\n", a); return idx === -1 ? text.length : idx; })();
        const segment = text.slice(lineStart, lineEnd);
        const tc = segment.replace(/\w[\w’']*/g, (w, idx) => {
          const lw = w.toLowerCase();
          if (idx !== 0 && stops.has(lw)) return lw;
          return lw.charAt(0).toUpperCase() + lw.slice(1);
        });
        const next = text.slice(0, lineStart) + tc + text.slice(lineEnd);
        return { next, selStart: a, selEnd: b };
      }
      const segment = text.slice(a, b);
      const tc = segment.replace(/\w[\w’']*/g, (w, pos) => {
        const lw = w.toLowerCase();
        // Treat each substring's first word as beginning
        const isFirst = pos === 0 || /\s/.test(segment[pos - 1]);
        if (!isFirst && stops.has(lw)) return lw;
        return lw.charAt(0).toUpperCase() + lw.slice(1);
      });
      const next = text.slice(0, a) + tc + text.slice(b);
      return { next, selStart: a, selEnd: b };
    });
  }

  function handleSaveDraft() {
    persistDraft(draftSnapshot);
    toast.success("Brouillon enregistré localement");
  }

  // Auto-save draft on field changes (debounced)
  useEffect(() => {
    if (isEditing) return;
    scheduleDraftSave(draftSnapshot);
  }, [draftSnapshot, scheduleDraftSave, isEditing]);

const handleClearAll = useCallback(() => {
  const confirmed = window.confirm("Êtes-vous sûr de vouloir tout effacer ? Cette action supprimera tout le contenu de l’article en cours.");
  if (!confirmed) return;
  applySnapshot(undefined, { slugTouched: false });
  removeDraft();
  setServerError({});
  setPublishInfo(null);
  toast.success("Le formulaire a été réinitialisé.");
}, [applySnapshot, removeDraft]);

  const handleCoverFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Veuillez sélectionner un fichier image.");
        return;
      }
      try {
        const dataUrl = await fileToDataUrl(file);
        setCover(dataUrl);
      } catch (error) {
        console.error(error);
        toast.error("Impossible de convertir cette image.");
      }
    },
    [setCover],
  );

  const handleInlineImageFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error("Veuillez sélectionner un fichier image.");
        return;
      }
      setIsImageReading(true);
      try {
        const dataUrl = await fileToDataUrl(file);
        setImageDataUrl(dataUrl);
      } catch (error) {
        console.error(error);
        toast.error("Impossible de convertir cette image.");
        setImageDataUrl(null);
      } finally {
        setIsImageReading(false);
      }
    },
    [],
  );

  const coverPreview = cover.trim() || null;

  return (
    <div className="min-h-screen bg-background">
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4">
          <AdminBackButton />
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-6">{isEditing ? "Modifier l’article" : "Nouvel article"}</h1>
          <Card>
            <CardHeader>
              <CardTitle>Rédaction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Form */}
                <form onSubmit={handlePublish} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titre</Label>
                    <Input id="title" ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'article" />
                    {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug</Label>
                      <Input
                        id="slug"
                        ref={slugRef}
                        value={slug}
                        onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
                        placeholder="mon-super-article"
                        disabled={isEditing}
                      />
                      {errors.slug && <p className="text-sm text-red-600 mt-1">{errors.slug}</p>}
                    </div>
                    <div className="space-y-2" ref={categoryRef}>
                      <Label>Catégorie</Label>
                      <Select value={category} onValueChange={(v) => setCategory(v as Article["category"]) }>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir…" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.category && <p className="text-sm text-red-600 mt-1">{errors.category}</p>}
                    </div>
                  </div>

                  <div className="rounded-xl border border-dashed p-4 bg-muted/20">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="featured"
                        checked={featured}
                        onCheckedChange={(checked) => setFeatured(checked === true)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="featured" className="font-medium">
                          Mettre en avant sur la page d’accueil
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Les articles mis en avant alimentent la section « Articles récents » de l’accueil.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
                    <Input id="tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="beaute, soin, peau" />
                    <div className="flex flex-wrap gap-2 pt-1">
                      {tags.map((t) => (<Badge key={t} variant="secondary">{t}</Badge>))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="coverUpload">Image de couverture (optionnelle)</Label>
                      <p className="text-xs text-muted-foreground">
                        Téléversez une image depuis votre ordinateur : elle sera directement intégrée à l’article sous forme de data
                        URL et s’affichera telle quelle sur le site public.
                      </p>
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => coverFileInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          coverFileInputRef.current?.click();
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          void handleCoverFile(file);
                        }
                      }}
                      className="rounded-xl border border-dashed border-muted-foreground/30 p-4 text-center cursor-pointer hover:border-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-muted-foreground/60"
                    >
                      <input
                        id="coverUpload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={coverFileInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (file) {
                            void handleCoverFile(file);
                          }
                          e.target.value = "";
                        }}
                      />
                      <p className="text-sm font-medium">Image de couverture</p>
                      <p className="text-xs text-muted-foreground">
                        Glissez-déposez une image ici ou cliquez pour choisir un fichier.
                      </p>
                      {coverPreview && (
                        <div className="mt-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={coverPreview}
                            alt={`Prévisualisation de l'image de couverture pour ${title || "l'article"}`}
                            loading="lazy"
                            className="mx-auto max-h-48 rounded-lg object-cover"
                          />
                        </div>
                      )}
                    </div>
                    {errors.cover && <p className="text-sm text-red-600 mt-1">{errors.cover}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="excerpt">Chapo / Extrait</Label>
                    <Textarea id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} />
                  </div>

                  {/* Reading time */}
                  <div className="space-y-2">
                    <Label>Temps de lecture (min)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={readingMinutes}
                        onChange={(e) => {
                          manualReadingOverrideRef.current = true;
                          const val = Number(e.target.value || 1);
                          setReadingMinutes(Math.max(1, val));
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          manualReadingOverrideRef.current = false;
                          setReadingMinutes(estimateMinutes(`${excerpt}\n\n${body}`));
                        }}
                      >
                        Recalculer
                      </Button>
                      <span className="text-xs text-muted-foreground">Auto: {estimateMinutes(`${excerpt}\n\n${body}`)} min</span>
                    </div>
                    {errors as any && (errors as any).readingMinutes && <p className="text-sm text-red-600 mt-1">{(errors as any).readingMinutes}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="body">Corps (Markdown)</Label>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Button type="button" variant="secondary" size="sm" aria-label="Annuler" title="Annuler (Ctrl+Z)" onClick={() => restoreUndo()}>↺</Button>
                      <Button type="button" variant="secondary" size="sm" aria-label="Titre H1" title="Titre H1 (Alt+1)" onClick={() => toggleHeading(1)}>H1</Button>
                      <Button type="button" variant="secondary" size="sm" aria-label="Titre H2" title="Titre H2 (Alt+2)" onClick={() => toggleHeading(2)}>H2</Button>
                      <Button type="button" variant="secondary" size="sm" aria-label="Titre H3" title="Titre H3 (Alt+3)" onClick={() => toggleHeading(3)}>H3</Button>
                      <Button type="button" variant="secondary" size="sm" aria-label="Liste à puces" title="Liste à puces" onClick={() => toggleBulletedList()}>• List</Button>
                      <Button type="button" variant="secondary" size="sm" aria-label="Gras" title="Gras (Ctrl+B)" onClick={() => toggleWrap("**", true)}>B</Button>
                      <Button type="button" variant="secondary" size="sm" aria-label="Italique" title="Italique (Ctrl+I)" onClick={() => toggleWrap("*", true)}><span className="italic">I</span></Button>
                      <Button type="button" variant="secondary" size="sm" aria-label="Majuscules" title="Majuscules" onClick={toUppercase}>Aa↑</Button>
                      <Button type="button" variant="secondary" size="sm" aria-label="Minuscules" title="Minuscules" onClick={toLowercase}>Aa↓</Button>
                      <Button type="button" variant="secondary" size="sm" aria-label="Casse Titre" title="Casse Titre" onClick={toTitleCase}>Aa Title</Button>
                      <Button type="button" variant="secondary" size="sm" onClick={openImageDialog}>Insérer image</Button>
                      <Button type="button" variant="secondary" size="sm" onClick={insertRefMark}>Ref</Button>
                    </div>
                    <Textarea
                      id="body"
                      ref={bodyRef}
                      value={body}
                      onChange={(e) => { setBody(e.target.value); scheduleDebouncedSnapshot(); }}
                      onBlur={() => pushBodySnapshot()}
                      onScroll={handleBodyScroll}
                      onKeyDown={(e) => {
                        const isMeta = e.ctrlKey || e.metaKey;
                        if (isMeta && (e.key === "z" || e.key === "Z")) { e.preventDefault(); restoreUndo(); }
                        else if (isMeta && (e.key === "b" || e.key === "B")) { e.preventDefault(); toggleWrap("**", true); }
                        else if (isMeta && (e.key === "i" || e.key === "I")) { e.preventDefault(); toggleWrap("*", true); }
                        else if (e.altKey && e.key === "1") { e.preventDefault(); toggleHeading(1); }
                        else if (e.altKey && e.key === "2") { e.preventDefault(); toggleHeading(2); }
                        else if (e.altKey && e.key === "3") { e.preventDefault(); toggleHeading(3); }
                      }}
                      placeholder="# Titre\n\nVotre article en Markdown"
                      rows={12}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Rédigez ici le contenu complet de l’article (titres, paragraphes, listes, etc.) en Markdown.
                    </p>
                    <p className="text-xs text-muted-foreground text-right">{body.length} caractères</p>
                    {errors.body && <p className="text-sm text-red-600 mt-1">{errors.body}</p>}
                  </div>

                  <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Insérer une image</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 pt-2">
                        <div className="space-y-2">
                          <Label htmlFor="imgAlt">Texte alternatif</Label>
                          <Input
                            id="imgAlt"
                            value={imageAlt}
                            onChange={(e) => setImageAlt(e.target.value)}
                            placeholder="Description de l’image"
                          />
                        </div>
                    <div className="space-y-2">
                      <Label>Image</Label>
                      <div
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            inlineImageInputRef.current?.click();
                          }
                        }}
                        onClick={() => inlineImageInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const file = e.dataTransfer.files?.[0] || null;
                          if (file) {
                            void handleInlineImageFile(file);
                          }
                        }}
                        className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/40 px-4 py-6 text-center cursor-pointer hover:border-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-muted-foreground/60"
                      >
                        <input
                          ref={inlineImageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            if (file) {
                              void handleInlineImageFile(file);
                            }
                            e.target.value = "";
                          }}
                        />
                        <p className="text-sm font-medium">Glissez-déposez une image ou cliquez pour choisir un fichier</p>
                        <p className="text-xs text-muted-foreground">
                          L’image sera intégrée directement dans l’article via une data URL.
                        </p>
                        {isImageReading && <p className="mt-2 text-xs text-muted-foreground">Traitement de l’image…</p>}
                        {imageDataUrl && !isImageReading && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageDataUrl} alt={imageAlt || "Aperçu de l’image"} className="mt-4 max-h-40 rounded-lg object-contain" />
                        )}
                      </div>
                    </div>
                        <div className="space-y-2">
                          <Label>Alignement</Label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={imageAlignment === "left" ? "default" : "secondary"}
                              size="sm"
                              onClick={() => setImageAlignment("left")}
                            >
                              Gauche
                            </Button>
                            <Button
                              type="button"
                              variant={imageAlignment === "right" ? "default" : "secondary"}
                              size="sm"
                              onClick={() => setImageAlignment("right")}
                            >
                              Droite
                            </Button>
                            <Button
                              type="button"
                              variant={imageAlignment === "full" ? "default" : "secondary"}
                              size="sm"
                              onClick={() => setImageAlignment("full")}
                            >
                              Pleine largeur
                            </Button>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => setImageDialogOpen(false)}>Annuler</Button>
                        <Button type="button" onClick={handleInsertImage} disabled={!imageDataUrl || isImageReading}>Insérer</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="author">Auteur</Label>
                      <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date de publication</Label>
                      <Input
                        id="date"
                        type="date"
                        ref={dateRef}
                        value={new Date(date).toISOString().slice(0, 10)}
                        onChange={(e) => {
                          const d = e.target.value ? new Date(e.target.value + "T00:00:00Z") : new Date();
                          setDate(d.toISOString());
                        }}
                      />
                      {errors.date && <p className="text-sm text-red-600 mt-1">{errors.date}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sources">Sources (optionnel) — une par ligne</Label>
                    <Textarea id="sources" rows={4} value={sourcesText} onChange={(e) => setSourcesText(e.target.value)} placeholder="[1] Source…\n[2] …" />
                  </div>

  <div className="border-t pt-6 mt-6 space-y-4">
    <div>
      <h2 className="text-lg font-semibold">Auteur & mise en page</h2>
      <p className="text-sm text-muted-foreground">Contrôlez l’en-tête, le bloc auteur et le pied de page.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Type d’en-tête</Label>
        <Select value={heroLayout} onValueChange={(v) => setHeroLayout(v as Article["heroLayout"])}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Standard</SelectItem>
            <SelectItem value="image-full">Grande image</SelectItem>
            <SelectItem value="compact">Compact</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Type de pied de page</Label>
        <Select value={footerType} onValueChange={(v) => setFooterType(v as Article["footerType"])}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Standard</SelectItem>
            <SelectItem value="practical-info">Infos pratiques (lieu / commerce)</SelectItem>
            <SelectItem value="cta">Appel à l’action</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Checkbox id="showTitleInHero" checked={showTitleInHero} onCheckedChange={(checked) => setShowTitleInHero(checked === true)} />
      <Label htmlFor="showTitleInHero" className="text-sm text-muted-foreground cursor-pointer">
        Afficher le titre dans l’en-tête
      </Label>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="authorRole">Rôle de l’auteur</Label>
        <Input id="authorRole" value={authorRole} onChange={(e) => setAuthorRole(e.target.value)} placeholder="Rédactrice, fondatrice…" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="authorAvatarUrl">URL de l’avatar de l’auteur</Label>
        <Input id="authorAvatarUrl" value={authorAvatarUrl} onChange={(e) => setAuthorAvatarUrl(e.target.value)} placeholder="https://…" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="authorSlug">Identifiant auteur (optionnel)</Label>
        <Input id="authorSlug" value={authorSlug} onChange={(e) => setAuthorSlug(e.target.value)} placeholder="nolwenn" />
      </div>
    </div>
    <div className="space-y-2">
      <Label htmlFor="footerNote">Note de bas de page</Label>
      <Textarea id="footerNote" rows={3} value={footerNote} onChange={(e) => setFooterNote(e.target.value)} placeholder="Message court affiché sous l’article" />
    </div>
  </div>

  {showPracticalInfoSection && (
    <div className="border-t pt-6 mt-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Infos pratiques (lieu / commerce)</h2>
        <p className="text-sm text-muted-foreground">Idéal pour les restaurants, boutiques et adresses à visiter.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="primaryPlaceName">Nom du lieu</Label>
        <Input id="primaryPlaceName" value={primaryPlaceName} onChange={(e) => setPrimaryPlaceName(e.target.value)} placeholder="Ex: Pura Vida Club" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="address">Adresse</Label>
          <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12 rue de Siam, Brest" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 2 98 …" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="websiteUrl">Site web</Label>
          <Input id="websiteUrl" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="googleMapsUrl">Lien Google Maps</Label>
          <Input id="googleMapsUrl" value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} placeholder="https://maps.google.com/…" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="openingHours">Horaires</Label>
        <Textarea id="openingHours" rows={3} value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} placeholder="Lun-Ven : 10h-19h…" />
      </div>
    </div>
  )}

  <div className="border-t pt-6 mt-6 space-y-4">
    <div>
      <h2 className="text-lg font-semibold">Référencement (SEO)</h2>
      <p className="text-sm text-muted-foreground">Optimisez l’apparition de l’article sur Google.</p>
    </div>
    <div className="space-y-2">
      <Label htmlFor="seoTitle">Titre SEO (facultatif)</Label>
      <Input id="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Titre affiché dans Google" />
    </div>
    <div className="space-y-2">
      <Label htmlFor="seoDescription">Description SEO (facultatif)</Label>
      <Textarea id="seoDescription" rows={3} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Résumé pour Google (150-160 caractères)." />
    </div>
    <div className="space-y-2">
      <Label htmlFor="searchAliases">Termes de recherche associés (un par ligne)</Label>
      <Textarea id="searchAliases" rows={3} value={searchAliasesText} onChange={(e) => setSearchAliasesText(e.target.value)} placeholder="studio pilates\nbien-être bretagne\n…" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="canonicalUrl">URL canonique (facultatif)</Label>
        <Input id="canonicalUrl" value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="https://votresite.com/articles/…" />
      </div>
      <div className="space-y-2">
        <Label>Type de contenu pour Google</Label>
        <Select value={schemaType} onValueChange={(v) => setSchemaType(v as Article["schemaType"])}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Article">Article</SelectItem>
            <SelectItem value="LocalBusiness">Commerce / Lieu</SelectItem>
            <SelectItem value="Restaurant">Restaurant</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">Mot de passe administrateur</Label>
                    <Input id="adminPassword" type="password" value={adminPassword} onChange={(e) => { setAdminPassword(e.target.value); setAdminToken(e.target.value); }} placeholder="••••••••" />
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={handleClearAll}>Tout effacer</Button>
                    <Button type="button" variant="secondary" onClick={handleSaveDraft}>Enregistrer le brouillon</Button>
                    <Button type="submit" disabled={submitting} aria-busy={submitting}>
                      {submitting && (
                        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px]" />
                      )}
                      {submitting ? "Publication…" : "Publier"}
                    </Button>
                  </div>

                  {publishInfo && (
                    <div className="mt-3 text-sm">
                      <p className="text-foreground">
                        Article publié — la mise à jour du site public peut prendre 1 à 3 minutes.
                        {publishInfo.commit?.sha && (
                          <>
                            {" "}
                            <a href={publishInfo.commit?.url} target="_blank" rel="noreferrer" className="underline">commit {publishInfo.commit.sha.slice(0,7)}</a>
                          </>
                        )}
                      </p>
                      {publishInfo.deploy && (
                        <p className="text-muted-foreground text-xs mt-1">
                          {publishInfo.deploy.triggered
                            ? "Déploiement Vercel déclenché automatiquement."
                            : `Déploiement non confirmé${publishInfo.deploy.error ? ` — ${publishInfo.deploy.error}` : ""}.`}
                        </p>
                      )}
                      <p className="text-muted-foreground text-xs mt-1">
                        {publishInfo.deployTriggered
                          ? "Propagation en cours — comptez 1 à 3 minutes avant d’actualiser le site public."
                          : "Les modifications apparaîtront après le prochain déploiement (1 à 3 minutes)."}{" "}
                        <a className="underline" href={publishInfo.url} target="_blank" rel="noreferrer">Voir l’article</a>
                      </p>
                    </div>
                  )}

                  {serverError.message && (
                    <Alert variant="destructive" className="mt-4" aria-live="polite">
                      <AlertTitle>Erreur</AlertTitle>
                      <AlertDescription>
                        <p>{serverError.message}</p>
                        {serverError.missingEnv && serverError.missingEnv.length > 0 && (
                          <ul className="text-muted-foreground text-xs mt-2 list-disc pl-5">
                            <li>Variables manquantes : {serverError.missingEnv.join(", ")}</li>
                          </ul>
                        )}
                        {serverError.details && <p className="text-muted-foreground text-xs mt-1">{serverError.details}</p>}
                      </AlertDescription>
                    </Alert>
                  )}

                  {import.meta.env.DEV && (
                    <div className="mt-4">
                      <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setDebugOpen((v) => !v)}>
                        {debugOpen ? "Masquer les détails techniques" : "Afficher les détails techniques"}
                      </button>
                      {debugOpen && (
                        <div className="mt-2 rounded-md border bg-muted/30 p-3">
                          <p className="text-xs font-medium mb-1">Dernière requête</p>
                          <pre className="text-xs overflow-auto whitespace-pre-wrap">{JSON.stringify(lastRequest, null, 2)}</pre>
                          <p className="text-xs font-medium mt-3 mb-1">Dernière réponse</p>
                          <pre className="text-xs overflow-auto whitespace-pre-wrap">{JSON.stringify(lastResponse, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </form>

                {/* Right: Live Preview */}
                <div className="border rounded-lg bg-background max-h-[70vh] overflow-auto" ref={previewRef}>
                  <div className="p-4">
                    <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-tight mb-4">{title || "(Sans titre)"}</h1>
                    {date && <p className="text-muted-foreground mb-4">{new Date(date).toLocaleDateString("fr-FR")}</p>}
                    <div className="mt-2 mb-2 flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" /> {readingMinutes} min
                      </div>
                    </div>
                    {tags.length > 0 && (
                      <div className="mt-2 mb-4 flex flex-wrap gap-2">
                        {tags.map((t) => (
                          <span key={t} className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs">{t}</span>
                        ))}
                      </div>
                    )}
                    {excerpt && <p className="mb-4 text-foreground">{excerpt}</p>}
                    {coverPreview && (
                      <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-muted mb-6">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverPreview} alt="Couverture" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <ArticleContent
                      body={body || ""}
                      sources={sources}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default AdminNew;


