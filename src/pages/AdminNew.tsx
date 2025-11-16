import { useEffect, useMemo, useRef, useState } from "react";
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
import { getPostBySlug } from "@/lib/content";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { getAdminToken, setAdminToken } from "@/lib/adminSession";

type Article = {
  title: string;
  slug: string;
  category: "Commerces & lieux" | "Expérience" | "Beauté";
  tags: string[];
  cover: string;
  excerpt: string;
  body: string;
  author: string;
  date: string; // ISO
  readingMinutes: number;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
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

const DRAFT_KEY = "draft:new-article";

const AdminNew = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editSlug = searchParams.get("slug");
  const isEditing = !!editSlug;
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [category, setCategory] = useState<Article["category"]>("Beauté");
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
  const [coverFileUrl, setCoverFileUrl] = useState<string | null>(null);
  const saveDraftTimerRef = useRef<number | null>(null);
  // Multiple local images for preview only
  const [localAssets, setLocalAssets] = useState<{ id: number; file: File; url: string; alt?: string }[]>([]);
  const nextLocalIdRef = useRef<number>(1);
  const manualReadingOverrideRef = useRef(false);
  const [readingMinutes, setReadingMinutes] = useState<number>(() => estimateMinutes(`${excerpt}\n\n${body}`));
  const [sourcesText, setSourcesText] = useState("");
  const refCounter = useRef(1);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imgAlt, setImgAlt] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const [imgAlign, setImgAlign] = useState<"left" | "right" | "full">("full");
  const [imgFile, setImgFile] = useState<File | null>(null);
  // Map of image src -> blob url for immediate preview
  const [previewImageMap, setPreviewImageMap] = useState<Record<string, string>>({});

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

  useEffect(() => {
    return () => {
      if (coverFileUrl) URL.revokeObjectURL(coverFileUrl);
    };
  }, [coverFileUrl]);

  // load draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const isWrapped = parsed && typeof parsed === "object" && parsed.article;
        const isExpired = parsed && typeof parsed.ts === "number" && (Date.now() - parsed.ts) > 7 * 24 * 60 * 60 * 1000;
        const d: Article = isWrapped ? parsed.article as Article : parsed as Article;
        if (!isExpired && d) {
          setTitle(d.title || "");
          setSlug(d.slug || "");
          setCategory((d.category as Article["category"]) || "Beauté");
          setTagsInput((d.tags || []).join(", "));
          setCover(d.cover || "");
          setExcerpt(d.excerpt || "");
          setBody(d.body || "");
          setAuthor(d.author || "À la Brestoise");
          setDate(d.date || new Date().toISOString());
          if (typeof d.readingMinutes === "number" && d.readingMinutes > 0) setReadingMinutes(d.readingMinutes);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // If editing, load existing content and prefill the form
  useEffect(() => {
    if (!isEditing || !editSlug) return;
    const existing = getPostBySlug(editSlug);
    if (!existing) return;
    setTitle(existing.title || "");
    setSlug(existing.slug || "");
    setCategory(((existing as any).category as Article["category"]) || "Beauté");
    setTagsInput(((existing.tags || []) as string[]).join(", "));
    setCover(existing.heroImage || "");
    setExcerpt(existing.summary || "");
    setBody(existing.body || "");
    setAuthor("À la Brestoise");
    try {
      const d = existing.date ? new Date(existing.date) : new Date();
      setDate(d.toISOString());
    } catch {
      setDate(new Date().toISOString());
    }
    if (typeof existing.readingMinutes === "number" && existing.readingMinutes > 0) {
      setReadingMinutes(existing.readingMinutes);
    }
    if (Array.isArray(existing.sources)) {
      setSourcesText(existing.sources.join("\n"));
    }
  }, [isEditing, editSlug]);

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

  const article: Article = useMemo(() => ({
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
  }), [title, slug, category, tags, cover, excerpt, body, author, date, readingMinutes]);

  const sources = useMemo(() => sourcesText.split('\n').map((s) => s.trim()).filter(Boolean), [sourcesText]);

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setServerError({});
    const sanitizedSlug = slugify(slug || title);
    const nextErrors: { title?: string; category?: string; slug?: string; body?: string; date?: string; cover?: string; password?: string; readingMinutes?: string } = {} as any;
    if (!article.title.trim()) nextErrors.title = "Le titre est obligatoire.";
    const allowed = new Set(["Commerces & lieux", "Expérience", "Beauté"]);
    if (!article.category || !allowed.has(article.category)) nextErrors.category = "La thématique est obligatoire.";
    if (!sanitizedSlug) nextErrors.slug = "Le slug ne peut contenir que des lettres, chiffres et tirets.";
    if (!article.body || article.body.trim().length < 50) nextErrors.body = "Le contenu est trop court.";
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
    const safeArticle = { ...article, slug: sanitizedSlug || article.slug };
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
    try {
      const reqPayload = { ...safeArticle, sources };
      setLastRequest(reqPayload);
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(reqPayload),
      });
      const json = await res.json().catch(() => ({}));
      setLastResponse({ status: res.status, body: json });
      if (res.status === 401) {
        setServerError({ message: "Accès refusé — mot de passe administrateur invalide." });
        localStorage.setItem(DRAFT_KEY, JSON.stringify(article));
        if (import.meta.env.DEV) console.error(json);
      } else if (res.status === 422) {
        const fieldErrors = json?.errors || {};
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
        setServerError({ message: json?.error || "Champs invalides." });
        localStorage.setItem(DRAFT_KEY, JSON.stringify(article));
        if (import.meta.env.DEV) console.error(json);
      } else if (res.status >= 500) {
        const detailsMsg = json?.details?.message ? String(json.details.message) : undefined;
        setServerError({ message: "Erreur serveur — veuillez réessayer.", details: detailsMsg });
        localStorage.setItem(DRAFT_KEY, JSON.stringify(article));
        if (import.meta.env.DEV) console.error(json);
      } else if (json?.ok) {
        localStorage.removeItem(DRAFT_KEY);
        setPublishInfo({ url: json.url, commit: json.commit, files: json.files, deploy: json.deploy, deployTriggered: Boolean(json.deployTriggered) });
        const commitMsg = json?.commit?.url ? ` (commit ${json.commit.sha.slice(0,7)})` : "";
        toast.success(`Article publié — la mise à jour du site public peut prendre 1 à 3 minutes.${commitMsg}`);
        // Auto-redirect after ~75s so the new content is available post-deploy
        window.setTimeout(() => navigate("/articles"), 75000);
        return;
      } else {
        // Graceful failure path (e.g., missing env)
        const missingEnv = Array.isArray(json?.missingEnv) ? json.missingEnv : undefined;
        setServerError({ message: json?.error || "Publication impossible. Brouillon conservé localement.", missingEnv });
        localStorage.setItem(DRAFT_KEY, JSON.stringify(article));
        if (import.meta.env.DEV) console.error(json);
      }
    } catch (err: any) {
      setServerError({ message: "Erreur réseau — réessayez." });
      localStorage.setItem(DRAFT_KEY, JSON.stringify(article));
      if (import.meta.env.DEV) console.error(err);
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

  function insertAtCaret(snippet: string) {
    const ta = bodyRef.current;
    if (!ta) return;
    pushBodySnapshot();
    const a = ta.selectionStart ?? 0;
    const b = ta.selectionEnd ?? a;
    const next = body.slice(0, a) + snippet + body.slice(b);
    setBody(next);
    requestAnimationFrame(() => {
      if (!bodyRef.current) return;
      const pos = a + snippet.length;
      bodyRef.current.focus();
      bodyRef.current.setSelectionRange(pos, pos);
    });
  }

  async function doUploadImage(slugArg: string, file: File): Promise<string> {
    const content = await file.arrayBuffer().then((buf) => Buffer.from(buf).toString("base64"));
    const payload = { slug: slugArg, fileName: file.name, content };
    const res = await fetch("/api/upload-image", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminPassword}` },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) throw new Error(json?.error || `Upload failed (${res.status})`);
    return String(json.path);
  }

  function openImageDialog() {
    setImgAlt("");
    setImgUrl("");
    setImgFile(null);
    setImgAlign("full");
    setImageDialogOpen(true);
  }

  async function confirmInsertImage() {
    try {
      let path = imgUrl.trim();
      let tempBlobUrl: string | undefined;
      if (!path && imgFile) {
        // immediate local preview
        tempBlobUrl = URL.createObjectURL(imgFile);
        // upload in background, but await to insert canonical path
        path = await doUploadImage(slug || slugify(title) || "article", imgFile);
        // map canonical path to blob for local preview
        setPreviewImageMap((m) => ({ ...m, [path!]: tempBlobUrl! }));
      }
      if (!path) {
        toast.error("Fournissez une URL ou un fichier.");
        return;
      }
      const cls = imgAlign === "left" ? "img-left" : imgAlign === "right" ? "img-right" : "img-full";
      const alt = imgAlt || "";
      const snippet = `<figure class="${cls}"><img src="${path}" alt="${alt}" /><figcaption>${alt}</figcaption></figure>`;
      insertAtCaret(snippet);
      setImageDialogOpen(false);
    } catch (e: any) {
      toast.error(String(e?.message || e));
    }
  }

  function insertRefMark() {
    const n = refCounter.current++;
    insertAtCaret(`[^${n}]`);
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
    localStorage.setItem(DRAFT_KEY, JSON.stringify(article));
    toast.success("Brouillon enregistré localement");
  }

  function persistDraft(a: Article) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ article: a, ts: Date.now() }));
    } catch {
      // ignore
    }
  }

  function scheduleDraftSave(a: Article) {
    if (saveDraftTimerRef.current) window.clearTimeout(saveDraftTimerRef.current);
    saveDraftTimerRef.current = window.setTimeout(() => persistDraft(a), 800);
  }

  // Auto-save draft on field changes (debounced)
  useEffect(() => {
    scheduleDraftSave(article);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, slug, category, tagsInput, cover, excerpt, body, author, date, readingMinutes, sourcesText]);

  return (
    <div className="min-h-screen bg-background">
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="mb-4 text-sm text-muted-foreground hover:underline"
          >
            ← Retour au tableau de bord
          </button>
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
                          <SelectItem value="Commerces & lieux">Commerces & lieux</SelectItem>
                          <SelectItem value="Expérience">Expérience</SelectItem>
                          <SelectItem value="Beauté">Beauté</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.category && <p className="text-sm text-red-600 mt-1">{errors.category}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
                    <Input id="tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="beaute, soin, peau" />
                    <div className="flex flex-wrap gap-2 pt-1">
                      {tags.map((t) => (<Badge key={t} variant="secondary">{t}</Badge>))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cover">Image de couverture (URL)</Label>
                    <Input id="cover" value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://…" />
                    {errors.cover && <p className="text-sm text-red-600 mt-1">{errors.cover}</p>}
                    {cover && (
                      <div className="mt-2 rounded-lg overflow-hidden border bg-muted/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cover} alt="Aperçu" className="w-full h-40 object-cover" />
                      </div>
                    )}
                    <div className="pt-2">
                      <Label htmlFor="coverFile">ou Fichier local (aperçu uniquement)</Label>
                      <Input id="coverFile" type="file" accept="image/*" onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) { setCoverFileUrl(null); return; }
                        const url = URL.createObjectURL(f);
                        setCoverFileUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
                      }} />
                      <p className="text-sm text-muted-foreground mt-1">Aperçu local uniquement. Pour publier, fournissez une URL d’image accessible.</p>
                    </div>
                    {/* Multiple local images for preview only */}
                    <div className="pt-4">
                      <Label htmlFor="localAssets">Images locales (aperçu uniquement)</Label>
                      <Input
                        id="localAssets"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length === 0) return;
                          const items = files.map((file) => {
                            const id = nextLocalIdRef.current++;
                            const url = URL.createObjectURL(file);
                            return { id, file, url };
                          });
                          setLocalAssets((prev) => [...prev, ...items]);
                          e.currentTarget.value = "";
                        }}
                      />
                      {localAssets.length > 0 && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {localAssets.map((a) => (
                            <div key={a.id} className="border rounded p-2 flex flex-col gap-2 items-stretch">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={a.url} alt={a.alt || "image locale"} className="w-full h-20 object-cover rounded" />
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  const ta = bodyRef.current;
                                  if (!ta) return;
                                  pushBodySnapshot();
                                  const start = ta.selectionStart ?? 0;
                                  const end = ta.selectionEnd ?? start;
                                  const token = `![${a.alt || ""}](local:${a.id})`;
                                  const next = body.slice(0, start) + token + body.slice(end);
                                  setBody(next);
                                  requestAnimationFrame(() => {
                                    ta.focus();
                                    ta.setSelectionRange(start + token.length, start + token.length);
                                  });
                                }}
                              >
                                Insérer
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Utilisez le bouton « Insérer » pour référencer l’image dans le corps avec <code>local:&lt;id&gt;</code>.</p>
                    </div>
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
                          <Input id="imgAlt" value={imgAlt} onChange={(e) => setImgAlt(e.target.value)} placeholder="Description de l’image" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="imgUrl">URL de l’image</Label>
                          <Input id="imgUrl" value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="https://…" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="imgFile">ou Téléverser un fichier</Label>
                          <Input id="imgFile" type="file" accept="image/*" onChange={(e) => setImgFile(e.target.files?.[0] || null)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Alignement</Label>
                          <div className="flex gap-2">
                            <Button type="button" variant={imgAlign === "left" ? "default" : "secondary"} size="sm" onClick={() => setImgAlign("left")}>Gauche</Button>
                            <Button type="button" variant={imgAlign === "right" ? "default" : "secondary"} size="sm" onClick={() => setImgAlign("right")}>Droite</Button>
                            <Button type="button" variant={imgAlign === "full" ? "default" : "secondary"} size="sm" onClick={() => setImgAlign("full")}>Pleine largeur</Button>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => setImageDialogOpen(false)}>Annuler</Button>
                        <Button type="button" onClick={confirmInsertImage}>Insérer</Button>
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

                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">Mot de passe administrateur</Label>
                    <Input id="adminPassword" type="password" value={adminPassword} onChange={(e) => { setAdminPassword(e.target.value); setAdminToken(e.target.value); }} placeholder="••••••••" />
                  </div>

                  <div className="flex gap-3 pt-2">
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
                    {(coverFileUrl || cover) && (
                      <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-muted mb-6">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverFileUrl || cover} alt="Couverture" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <ArticleContent
                      body={body || ""}
                      sources={sources}
                      localMap={useMemo(() => {
                        const m: Record<string, string> = { ...previewImageMap };
                        for (const a of localAssets) m[`local:${a.id}`] = a.url;
                        return m;
                      }, [localAssets, previewImageMap])}
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


