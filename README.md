# À la Brestoise — Vite + React + TypeScript (JSON CMS + Admin Suite)

This repository powers **À la Brestoise**: a luxury editorial site with a full **admin back-office** (articles, homepage gallery, inbox leads, testimonials, À propos).  
The project is deployed on **Vercel** and uses **Vercel Serverless Functions (`/api/*`)** to commit content updates directly into this GitHub repo.

---

## 0) The #1 rule (do NOT lose hours again)

This repo must match the **Vercel project** that serves the real production site:

- GitHub repo: `yinon1995/source-scribe-design`
- Production domain: `https://a-la-brestoise.vercel.app`

If admin changes “work” but the public site doesn’t update, you are almost always on the wrong Vercel project/domain or looking at a stale deployment.

---

## 1) Tech Stack

### Frontend
- Vite + React + TypeScript
- Tailwind CSS
- shadcn/ui components
- `react-router-dom` SPA routing
- `lucide-react` icons

### Backend (serverless)
- Vercel Serverless Functions under `/api`
- GitHub Contents API (read/write JSON and assets by committing to the repo)

---

## 2) Running locally

From Windows PowerShell:

```powershell
cd "C:\Users\User\Desktop\Bloom\source-scribe-design"
npm install
npm run dev
```

Vite will print the local URL (often `http://localhost:5173`).

### Local env
Some admin flows require `.env.local` (not committed). It should mirror Vercel env vars:
- `GITHUB_REPO`
- `GITHUB_TOKEN`
- `PUBLISH_BRANCH`
- `PUBLISH_TOKEN`
- (optional) `VERCEL_DEPLOY_HOOK_URL`

---

## 3) High-level architecture (source of truth)

### Articles (primary)
- **JSON articles** live in:
  - `content/articles/*.json`
  - `content/articles/index.json` (the listing/index file)

### Legacy articles (optional, read-only fallback)
- `content/posts/*.md`

### Other content
- Homepage gallery JSON: `content/home/gallery.json` (**required if homepage imports it**)
- About/À propos config: typically under `content/about/*` (repo-specific)
- Public assets:
  - `public/images/*`
  - `public/signature/*`
  - etc.

### Content loaders
- `src/lib/content.ts` is the main hub that loads:
  - JSON articles (and maybe legacy markdown)
  - builds listing metadata
  - provides `getPostBySlug()` for article pages

---

## 4) Admin area overview (“Espace rédaction”)

Admin is a SPA section protected by a token (see `PUBLISH_TOKEN` below).  
Core pages:

### `/admin` — Dashboard
Cards must include (at minimum):
- **Créer un nouvel article**
- **Modifier les articles existants**
- **Voir les demandes** (Inbox)
- **Gérer les avis** (Testimonials)
- **Mettre à jour À propos**
- **Éditer la galerie** (Homepage gallery editor) ✅ IMPORTANT: must exist and be wired to the real gallery

If the gallery card disappears, it means the route/card was removed or not linked in `AdminDashboard.tsx`.

### Token & guard
- Token is stored client-side (see `src/lib/adminSession.ts`)
- Guard UI is handled by `src/components/AdminGuard.tsx`

---

## 5) Articles system (public + admin)

### Public pages
- `/articles` — listing page
- `/articles/:slug` — detail page

The listing and detail pages must be driven by the content loaders (usually `src/lib/content.ts`), which read `content/articles/*`.

### Admin: list / edit / delete
- `/admin/articles` — list already published articles
  - edit → opens the article in the new editor, preserving layout state
  - delete → must remove:
    - `content/articles/<slug>.json`
    - and update `content/articles/index.json`
  - after deploy, the article must disappear from:
    - `/articles`
    - `/articles/:slug`
    - `/admin/articles`

---

## 6) New Magazine Editor (Builder + Preview)

The new editor lives under:

- `src/magazine_editor/*`

Key files (typical):
- `src/magazine_editor/MagazineEditor.tsx` — orchestrator (Builder/Preview switch, publish hook)
- `src/magazine_editor/components/AdminBuilder.tsx` — Builder UI (blocks, toolbar, settings)
- `src/magazine_editor/preview/PreviewLayoutEditor.tsx` — Preview engine
- `src/magazine_editor/components/MagazineArticleView.tsx` — reusable renderer for published articles (WYSIWYG)
- `src/magazine_editor/lib/*` — fonts, layout store, block factory
- `src/magazine_editor/types.ts` — types for blocks/settings/layout

### Editor requirements that must remain true
- The Builder produces blocks (text, headings, images, etc.)
- Preview shows the magazine-style layout (same fonts, rhythm, spacing)
- The published article page must look **exactly** like Preview for articles created with this editor

---

## 7) WYSIWYG contract (Preview == Published)

This is the critical “do not break” promise.

### How it works
When publishing:
1) The editor converts blocks/settings into a persistable state
2) That state is embedded into the article body as a hidden HTML comment:

```html
<!-- MAGAZINE_EDITOR_STATE: { ...json... } -->
```

On `/articles/:slug`:
- If that comment exists → parse it and render using `MagazineArticleView`
- If it does not exist → fallback to the legacy renderer (`ArticleContent`) to keep old posts stable

### Why this exists
Without saving layout state, editing an article later would lose the exact block structure and the published look would drift away from preview.

---

## 8) Article metadata (Editor UI + JSON storage)

From the new editor, we support:

### Category (required)
Exactly three options:
- `Beauté & cosmétique`
- `Commerces & lieux`
- `Événementiel`

This must be selectable inside the Builder UI and displayed elegantly in Preview and on the published page.

### Featured / Recommandé (star)
- A toggle in Builder UI: “Recommandé”
- Stored in the JSON article object (commonly `featured: boolean` or equivalent)
- Used by the homepage logic (see next section)

### Date + Reading time
- Builder UI must allow selecting:
  - a date (ISO stored)
  - reading time (minutes)
- Preview and published page must display them with the same editorial styling.

---

## 9) Homepage integration (Accueil)

Rules:
- All published articles appear in `/articles`
- Only **Featured/Recommandé** articles appear in the homepage featured section (Accueil)

So:
- Publishing a non-featured article should not inject it into the homepage featured area.
- Publishing a featured article should make it appear on homepage after deploy.

The homepage implementation is generally in:
- `src/pages/Index.tsx`

---

## 10) Publishing UI (two buttons must behave identically)

In the new editor page, there are **two publish buttons** (top-right and in-page).

Both must:
1) trigger the exact same `handlePublish` path
2) show a confirmation modal before publishing:

**Title:** `Publier l’article ?`  
**Body:** `Cette action publiera l’article sur le site (intégration à venir).`  
Buttons: Cancel / Confirm

Only Confirm should call `/api/publish`.

---

## 11) Publish / Delete API (`/api/publish`)

### Publish
- Endpoint: `POST /api/publish`
- Must be admin-protected
- Writes to GitHub:
  - `content/articles/<slug>.json`
  - `content/articles/index.json`

### Delete
- Endpoint: `DELETE /api/publish?slug=<slug>`
- Must be admin-protected
- Removes article and index entry (commit to repo)

### Auth
Admin-protected operations must verify:

`Authorization: Bearer <PUBLISH_TOKEN>`

---

## 12) Homepage Gallery (must be real + editable from Admin)

### Important: the gallery editor must edit the real public gallery
If you upload/remove/reorder images in admin, it must actually affect the homepage gallery after deploy.

### Data source
The homepage gallery should use a JSON source of truth:

- `content/home/gallery.json`

Example shape (one of many valid shapes):
```json
[
  { "src": "/images/gallery/1.jpg", "alt": "…", "href": "/articles/..." },
  { "src": "/images/gallery/2.jpg", "alt": "…" }
]
```

### Public UI
Common gallery components (repo-specific, but often):
- `src/components/HomePhotoStripGallery.tsx`
- `src/components/AutoGalleryMarquee.tsx`
- `src/components/ImageLightbox.tsx`

If Vercel build fails with:
- `Could not resolve "../../content/home/gallery.json"`
it means `content/home/gallery.json` doesn’t exist or the import path is wrong. The fix is:
- ensure the file exists in the repo at `content/home/gallery.json`
- ensure the import path in the component matches the actual location

### Admin UI
Gallery editor page should exist (example naming):
- `src/pages/AdminGallery.tsx`
- Route: `/admin/galerie` (or similar)
- Linked as a card on the dashboard

### Gallery API
A dedicated serverless function should commit gallery changes:
- `api/homeGallery.ts` (or equivalent)

Responsibilities:
- Validate admin token
- Write `content/home/gallery.json`
- If admin uploads new files:
  - store them in `public/images/gallery/*` (committed)
  - update the JSON to point to those paths
- Commit changes to GitHub, optionally trigger deploy hook

---

## 13) Inbox Leads (Demandes reçues)

Goal: All forms (newsletter/contact/services/etc.) create **leads** stored in a Git-tracked JSON file (not emails).

- API: `api/inbox.ts`
- Admin page: `/admin/demandes`

Do not revert to “open Gmail compose” behavior.

---

## 14) Testimonials moderation (Avis)

Flow:
1) Visitor submits testimonial
2) Stored as `pending`
3) Admin reviews in `/admin/avis`
4) Admin publishes → shows publicly

- API: `api/testimonials.ts`
- Admin page: `/admin/avis`
- Public page: `/avis`

Testimonials may include avatar + optional photos (often stored as data URLs).

---

## 15) À propos shared content

Single source of truth must be a JSON config committed in repo, edited via admin.

- API: `api/about.ts`
- Admin page: `/admin/a-propos`
- Rendered in:
  - `/a-propos`
  - and the relevant block on `/services` (repo-specific)

Do not hardcode the À propos text inside React pages again.

---

## 16) Environment variables (Vercel)

Set in Vercel Project → Settings → Environment Variables:

### Core GitHub publishing
- `GITHUB_REPO`  
  Example: `yinon1995/source-scribe-design`

- `GITHUB_TOKEN`  
  GitHub PAT with **Contents read/write** for this repo

- `PUBLISH_BRANCH`  
  Usually `main`

### Admin security
- `PUBLISH_TOKEN`  
  Shared secret used:
  - as admin login credential (client)
  - as API auth token (serverless)

### Optional
- `VERCEL_DEPLOY_HOOK_URL`  
  If set, APIs can trigger deployment immediately after committing.

---

## 17) Build / Deploy

### Scripts
`package.json` typically has:
- `npm run dev` — local dev
- `npm run build` — production build (may also generate sitemap)
- `npm run preview` — preview built site locally

### Typical Vercel build failures (what they mean)
- Missing file imports (`Could not load ... ENOENT`)  
  → file wasn’t committed (common when new components/assets were created locally)

- Missing `content/home/gallery.json`  
  → gallery JSON wasn’t committed or path mismatch

---

## 18) Git workflow (recommended)

From:
`C:\Users\User\Desktop\Bloom\source-scribe-design`

```powershell
git status
git add .
git commit -m "Describe the change"
git pull --rebase origin main
git push origin main
```

If push is rejected:
```powershell
git pull --rebase origin main
git push origin main
```

(You may see CRLF/LF warnings on Windows; that’s normal unless it causes actual diff noise.)

---

## 19) Non-negotiables (“future AI must not break”)

1) Production domain/project alignment (`a-la-brestoise.vercel.app`)
2) `/api/publish` contract and `PUBLISH_TOKEN` auth
3) Articles stored under `content/articles/` + `index.json`
4) WYSIWYG:
   - preview == published for magazine-editor articles
   - state persistence via `MAGAZINE_EDITOR_STATE` comment
   - fallback renderer for legacy content
5) Homepage “Featured/Recommandé only” rule
6) Gallery editor must edit the **real** homepage gallery source of truth
7) Admin tools: inbox, testimonials, À propos must remain functional

---

## 20) Where to look when something “disappears” (like the Gallery card)

If the gallery editor is missing from the dashboard:
- Check `src/pages/AdminDashboard.tsx` for the card/link
- Check `src/App.tsx` route table for the `/admin/galerie` route
- Check that `src/pages/AdminGallery.tsx` exists and exports properly
- Check that any gallery API (`api/homeGallery.ts`) is deployed and env vars exist

---

End.
