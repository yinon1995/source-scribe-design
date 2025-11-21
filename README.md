 `README.md`:

````markdown
# À la Brestoise — JSON CMS + Admin “Writing Space”

This repo contains the **À la Brestoise** site, built with **Vite + React + TypeScript + Tailwind + shadcn/ui**.

Editorial content (articles) now lives primarily as **JSON files** under `content/articles/`.  
There is also legacy support for **Markdown files** under `content/posts/`, but the **admin writing space** reads/writes JSON articles and commits them to GitHub via Vercel serverless functions. When the repo updates, Vercel redeploys and the updated content appears on the public pages.

This README is meant to be a **brain dump** so a future developer or AI can safely continue from here **without breaking the admin, inbox, testimonials, images, À propos config, or publish flow**.

---

## ⚠️ CRITICAL PITFALL — WRONG VERCEL PROJECT / DOMAIN

This mistake previously cost hours of debugging.

**Symptoms when it’s wrong:**

- `/admin/articles` shows some articles, but GitHub has a different set of JSON files.
- Publishing/deleting in `/admin` “works”, but the **public site** doesn’t change.
- Two URLs behave differently (admin vs public, or GitHub vs Vercel).

**Cause (historical):**

- There were **multiple Vercel deployments / projects / domains**:
  - One connected to this repo: `yinon1995/source-scribe-design`.
  - Others were **old/legacy projects** or forks.
- The browser sometimes pointed to a **legacy domain** or a **different Vercel project**, so:
  - `/admin` was reading/writing JSON files in one project/repo.
  - GitHub and the “main” site were looking at another project/repo.

**Current rule:**

1. Use the Vercel project whose **Production domain** is:

   - **Production:** `https://a-la-brestoise.vercel.app`

2. If you see old domains like:

   - `https://source-scribe-design-xxxxx-*.vercel.app`
   - `https://source-scribe-design-git-main-*.vercel.app`

   treat them as **legacy** unless you have confirmed in the Vercel dashboard that they belong to this exact project and repo.

If anything looks “impossible” (admin and GitHub do not match, or publish seems to work but the public site doesn’t change), **first check the URL bar** and confirm you are on the project that is actually connected to this repo and to `a-la-brestoise.vercel.app`.

---

## 1. Tech stack & architecture

### Frontend

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Routing via `react-router-dom` (SPA)
- Icons: `lucide-react`

### Content

- **JSON articles** under `content/articles/*.json` (main source of truth).
- **Legacy Markdown** posts under `content/posts/*.md` (optional, read-only).
- JSON/TS content for supporting pieces (testimonials, home sections, **À propos**, etc.).
- All of this is loaded via helpers like `src/lib/content.ts`, `src/lib/about.ts`, etc. into:

  - `posts: Post[]` — full content.
  - `postsIndex: PostFrontmatter[]` — for listings & SEO.
  - `aboutContent` — structured “À propos” content.

### Backend / API (Vercel serverless)

Serverless functions in `/api` handle:

- `api/publish.ts`
  - Creates/updates JSON articles in `content/articles/` and `content/articles/index.json` via the GitHub Contents API.
- `api/inbox.ts`
  - Collects **leads** from:
    - Newsletter forms
    - Contact forms
    - Services / quote interest
    - Subject suggestions
    - (Previously) testimonial requests
  - Stores them in a Git-tracked JSON file and exposes them to the **admin inbox UI**.
- `api/testimonials.ts`
  - Manages **customer testimonials/reviews** for “Ils m’ont fait confiance”:
    - Accepts new testimonial submissions from the public form.
    - Saves avatar + up to a few event photos as image data URLs.
    - Lets admin publish/reject/delete reviews.
    - Updates the data used by the public testimonials carousel (one testimonial per slide with a small photo gallery).
- `api/about.ts`
  - Manages the structured **À propos** content used by `/a-propos` and the “Services & Partnerships” page.
  - Reads/writes `content/about/a-propos.json` via the GitHub Contents API.
  - Powers the **Admin À propos** editor.

All these APIs share a **GitHub config helper** (same pattern as `api/publish.ts`) and require the same core env vars (`GITHUB_REPO`, `GITHUB_TOKEN`, `PUBLISH_BRANCH`, plus `PUBLISH_TOKEN` for admin-authenticated operations).

### Deployment

- Vercel project linked to `yinon1995/source-scribe-design`.
- Main domain:

  - **Production:** `https://a-la-brestoise.vercel.app`

- Vercel also creates preview URLs (e.g. `*-git-main-*.vercel.app`) for branches.  
  These are fine **only if they belong to this project**.

Always confirm in the Vercel dashboard which project is connected to this repo, and use that project’s domains.

---

## 2. Running locally

```bash
npm install
npm run dev
````

Then open `http://localhost:5173` (or the port shown in the terminal).

For local testing of **admin features** (articles, inbox, testimonials, À propos), you’ll need a `.env.local` file with at least:

* `GITHUB_REPO`
* `GITHUB_TOKEN`
* `PUBLISH_BRANCH`
* `PUBLISH_TOKEN`

matching the Vercel environment.

---

## 3. Environment variables (Vercel)

In Vercel → Project (linked to **yinon1995/source-scribe-design**) → **Settings → Environment Variables**.

### 3.1. GitHub / content publishing (articles, inbox, testimonials, À propos)

Used by `api/publish.ts`, `api/inbox.ts`, `api/testimonials.ts`, and `api/about.ts`:

* `GITHUB_REPO`
  Full `owner/repo` string. Example:
  `yinon1995/source-scribe-design`

* `GITHUB_TOKEN`
  GitHub Personal Access Token with **contents read/write** permissions for this repo.

* `PUBLISH_BRANCH`
  Target branch to write to (usually `main`).
  If not set, the code defaults to `main`.

> Older docs/code may mention `GITHUB_OWNER` or `GITHUB_BRANCH`.
> The current implementation uses **only** `GITHUB_REPO` (as `owner/repo`) plus `PUBLISH_BRANCH`.

### 3.2. Admin security / publish token

* `PUBLISH_TOKEN`
  Secret token used as:

  * The **admin password** in the writing space (admin UI).
  * The **server-side auth token** for `api/publish.ts`, `api/inbox.ts`, `api/testimonials.ts`, and `api/about.ts`
    (`Authorization: Bearer <PUBLISH_TOKEN>`).

This is the **single source of truth** for admin access.

### 3.3. Optional deploy hook

* `VERCEL_DEPLOY_HOOK_URL` (optional)
  Vercel “Deploy Hook” URL for this project.

If set, APIs like `api/publish.ts` and `api/about.ts` can call it after writing files so Vercel redeploys immediately.
If not set, Vercel will still deploy when the branch is updated via GitHub.

### 3.4. Email / external providers

Right now the site does **not** send emails via Resend or other providers.
All contact flows (newsletter, services, contact, subject suggestion, etc.) are implemented as **inbox leads** via `api/inbox.ts`.

If you ever introduce real emailing again, you’ll likely need env vars such as:

* `RESEND_API_KEY`
* `RESEND_FROM`
* Any other provider-specific config.

Make sure you **do not break inbox leads** when adding email sending.

---

## 4. Content model & indexing (articles)

### 4.1. JSON articles (`content/articles/*.json`)

Each article is a `JsonArticle` (defined in `src/lib/content.ts`, exact type may evolve).
Conceptually:

```ts
type ArticleBodyFontKey =
  | "josefin-sans"
  | "raleway"
  | "montserrat"
  | "merriweather"
  | "libre-baskerville"
  | "alice";

type JsonArticle = {
  title: string;
  slug: string;
  category: "Beauté & cosmétique" | "Commerces & lieux" | "Événementiel";
  tags: string[];
  cover: string;          // image URL or data URL (cover image)
  excerpt: string;        // short French summary
  body: string;           // markdown body (supports inline images via data URLs)
  author: string;
  date: string;           // ISO date
  readingMinutes?: number;
  sources?: string[];
  bodyFont?: ArticleBodyFontKey; // optional font key for article body
};
```

Notes:

* Legacy JSON files may still have old labels (`"Beauté"`, `"Commerces & places"`, `"Expérience"`).
  The runtime normalizes them so the public site and admin UI only surface the new labels.
* The **cover image** is set via the admin UI, usually as a data URL or uploaded image.
* The **`bodyFont`** is optional; if not set, the site falls back to the default body font.

#### 4.1.1. Inline article images (Insert image dialog)

The admin article editor has an **“Insérer une image”** dialog:

* Fields:

  * File input (drag & drop)
  * Alternative text
  * Alignment (left / right / full width)

* Behaviour:

  * The selected image is converted to a `data:image/...;base64,...` URL client-side.
  * The editor inserts a Markdown snippet into `body`, e.g.:

    ```md
    ![Alt text](data:image/jpeg;base64,....)
    ```

    plus optional layout hints/caption in the surrounding markup.

* Rendering:

  * `src/components/ArticleContent.tsx` parses the Markdown and **does not strip** `data:` URLs.
  * There are Tailwind utility classes for alignment:

    * Left/right image with text wrapping.
    * Full-width image (edge-to-edge inside the article column).

**Important for future changes:**

* Do **not** introduce regexes or sanitizer rules that blindly strip `data:image/...` URLs — they are essential for inline images.
* Avoid very large original files. On the client and in admin, recommend images roughly ≤ 1–2 MB before base64; huge images will bloat `body` and can make requests heavy for Vercel.

#### 4.1.2. Per-article body font

We added per-article font choice for the body text:

* Allowed fonts (front-end):

  * **Josefin Sans**
  * **Raleway**
  * **Montserrat**
  * **Merriweather**
  * **Libre Baskerville**
  * **Alice**

* Technical wiring:

  * `shared/articleBodyFonts.ts` defines the mapping between `ArticleBodyFontKey` and:

    * The human name shown in the admin UI.
    * The CSS class applied to the article body.

  * `index.html` or `src/index.css` includes the relevant Google Fonts imports.

  * `src/index.css` defines CSS classes like:

    ```css
    .article-font-josefin-sans { font-family: "Josefin Sans", system-ui, sans-serif; }
    .article-font-raleway { font-family: "Raleway", system-ui, sans-serif; }
    .article-font-montserrat { font-family: "Montserrat", system-ui, sans-serif; }
    .article-font-merriweather { font-family: "Merriweather", Georgia, serif; }
    .article-font-libre-baskerville { font-family: "Libre Baskerville", Georgia, serif; }
    .article-font-alice { font-family: "Alice", Georgia, serif; }
    ```

  * `src/pages/AdminNew.tsx` exposes a select/dropdown that allows choosing the body font for each article, storing the key in `bodyFont`.

  * `src/components/ArticleContent.tsx` wraps the article body in a container that applies the corresponding `article-font-…` class if `bodyFont` is set.

**If you change fonts or remove one:**

* Update `shared/articleBodyFonts.ts`.
* Update the font imports in `index.html` / `src/index.css`.
* Keep the keys stable where possible; if you rename keys, consider migration for existing JSON files.

### 4.2. Legacy Markdown posts (`content/posts/*.md`)

Older articles may be `.md` files with frontmatter:

```yaml
---
title: "Article title"
slug: "article-slug"
date: "2025-11-04"
summary: "Short French summary (≤ 160 chars)."
tags: ["beaute", "soin", "peau"]
category: "Beauté"
heroImage: "/images/2025/11/hero.jpg"
readingMinutes: 7
sources:
  - "Source 1"
  - "Source 2"
---
```

The body is plain Markdown (French).

These are **read-only** for the current admin: the admin UI does **not** edit Markdown files.

### 4.3. `src/lib/content.ts`

Responsibilities:

* Load Markdown posts:

  ```ts
  import.meta.glob("/content/posts/*.md", {
    query: "?raw",
    import: "default",
  });
  ```

  Parse frontmatter + body into `Post` objects.

* Load JSON articles:

  ```ts
  import.meta.glob("/content/articles/*.json", { eager: true });
  ```

  Map them into the same `PostFrontmatter` / `Post` shape used by the rest of the site (including `bodyFont`).

Exports:

* `posts: Post[]` — full content.
* `postsIndex: PostFrontmatter[]` — frontmatter only, sorted by date (newest first).
* `getPostBySlug(slug: string)` — finds either a Markdown or JSON article.

The **public site** (`/articles`, `/articles/:slug`) reads from these helpers.

### 4.4. `src/lib/articlesIndex.ts`

Admin-specific helper that:

* Reads all JSON articles (excluding `index.json`).
* Normalizes them.
* Sorts by date.
* Exposes a typed list for `/admin/articles`.

---

## 5. Public frontend

### 5.1. Main public routes

Defined in `src/App.tsx` / `src/pages`:

* `/` — Home
* `/articles` — article listing
* `/articles/:slug` — article detail
* `/thematiques`
* `/a-propos` — **About page, powered by the same À propos config as Services**
* `/services` — Services & Partnerships (also uses À propos config for the bio block)
* `/contact`
* `/avis` — testimonials / “Ils m’ont fait confiance”

### 5.2. Article listing — `ArticleCard`

The article list page (`src/pages/Articles.tsx`) uses `postsIndex` and renders `ArticleCard`:

* File: `src/components/ArticleCard.tsx`

* Props (simplified):

  ```ts
  interface ArticleCardProps {
    title: string;
    excerpt: string;
    image?: string;   // cover or hero
    category: string;
    readTime: string; // preformatted (e.g. "5 min")
    slug: string;     // used for /articles/:slug
    tags?: string[];
    featured?: boolean;
  }
  ```

* The card is wrapped in:

  ```tsx
  <Link to={`/articles/${slug}`} className="group">
    …
  </Link>
  ```

If you change the article route structure, you **must** keep `ArticleCard` in sync with the router and `getPostBySlug`.

---

## 6. Admin “Espace rédaction” (articles + inbox + avis + À propos)

The admin area is a client-side SPA, protected by a guard that checks a token via `src/lib/adminSession.ts`.

### 6.1. Admin routes (high level)

All admin routes are wrapped by `AdminGuard` in `src/App.tsx`:

* `/admin` — **Dashboard**

  Cards for (names may be in French in the UI):

  * “Créer un nouvel article”
  * “Modifier les articles existants”
  * “Voir les demandes” (inbox)
  * “Gérer les avis” (testimonials)
  * **“Mettre à jour À propos”** (opens the Admin À propos config screen)

* `/admin/nouvel-article` (alias `/admin/new`) — **new/edit article**

  * Form fields:

    * Title
    * Slug
    * Category
    * Tags
    * Cover image (drag & drop / file upload)
    * Excerpt (summary)
    * Body (Markdown, with inline images via data URLs)
    * Sources
    * Author
    * Date
    * Reading time
    * Body font (select from: Josefin Sans, Raleway, Montserrat, Merriweather, Libre Baskerville, Alice)

  * Admin token is read from `adminSession` and sent as:

    * `Authorization: Bearer <PUBLISH_TOKEN>` to `api/publish.ts`.

  * “Publier”:

    * Calls `POST /api/publish` with a JSON payload.
    * Expects a JSON response (`success: true` or `success: false` with `error`).
    * Shows a toast based on the server response.

  * Inline images:

    * The **“Insérer une image”** dialog (see 4.1.1) injects `data:` URLs into the body.
    * `api/publish.ts` accepts long strings and stores them **as-is** (no image rewriting).

  * Drafts:

    * New article drafts are stored in `localStorage` (e.g. `draft:article:new`).
    * Edit mode can have its own draft behaviour.

* `/admin/articles` — **existing articles list**

  * Uses the admin articles index.
  * Shows `Title | Slug | Date | Status | Actions`.
  * Actions:

    * “Modifier” → `/admin/nouvel-article?slug=<slug>`
    * “Supprimer” → `DELETE /api/publish?slug=<slug>` (with confirmation).

* `/admin/demandes` — **Inbox (leads)**

  * Lists contact/service/newsletter/subject-suggestion leads.
  * See section 8.

* `/admin/avis` — **Testimonials moderation**

  * Lists reviews, shows “Avis en attente (N)”, and allows publish / reject / delete.
  * See section 9.

* `/admin/a-propos` — **Admin À propos config**

  * New screen to edit the copy used in `/a-propos` and the bio block on `/services`.
  * See section 15.

### 6.2. Admin session & guard

* `src/lib/adminSession.ts`:

  * `getAdminToken()`, `setAdminToken(value)`, `clearAdminToken()`.

* `src/components/AdminGuard.tsx`:

  * If token is missing → shows login screen (“Accès espace rédaction”).
  * If token is present → renders admin routes.

Admin sub-pages include a consistent **“← Back to dashboard”** button to return to `/admin`.

---

## 7. Publishing & deleting articles (JSON)

### 7.1. Publishing (POST `/api/publish`)

Flow (summary):

1. Admin logs in with `PUBLISH_TOKEN`.

2. Fills the article form (including cover + body + optional `bodyFont`).

3. Clicks **Publier**.

4. Frontend sends:

   ```http
   POST /api/publish
   Authorization: Bearer <PUBLISH_TOKEN>
   Content-Type: application/json
   ```

   Payload matches the `Article` shape in `api/publish.ts`.

5. `api/publish.ts`:

   * Checks env vars via a GitHub config helper.

   * Validates fields (title, slug, excerpt, category, body, etc.).

   * Ensures `article.body` is non-empty and allows long values (for inline images).

   * Normalizes the slug (lowercase, URL-safe).

   * Writes/updates:

     * `content/articles/<slug>.json`
     * `content/articles/index.json`

   * Commits to `GITHUB_REPO` on `PUBLISH_BRANCH`.

   * Optionally calls `VERCEL_DEPLOY_HOOK_URL`.

6. Response contract (simplified):

   ```ts
   type ApiResponseShape = {
     success: boolean;
     error?: string;
     details?: { message?: string };
     missingEnv?: string[];
     [key: string]: unknown;
   };
   ```

   * On success → `success: true`, plus final slug, URL, etc.
   * On error → `success: false`, a human-readable `error`, and appropriate HTTP status.

### 7.2. Deleting (DELETE `/api/publish?slug=...`)

Flow:

1. Admin opens `/admin/articles`.

2. Clicks **Supprimer** on an article, confirms.

3. Frontend sends:

   ```http
   DELETE /api/publish?slug=<slug>
   Authorization: Bearer <PUBLISH_TOKEN>
   ```

4. `api/publish.ts`:

   * Verifies token and env.
   * Removes the entry from `content/articles/index.json`.
   * Deletes `content/articles/<slug>.json`.
   * Commits changes and optionally triggers the deploy hook.

After the next deploy:

* Article disappears from `/articles` and `/articles/:slug`.
* It no longer appears in `/admin/articles`.

---

## 8. Inbox / “Demandes reçues” (leads)

All forms that previously opened Gmail now feed a **central inbox**.

### 8.1. API: `api/inbox.ts`

* Uses the same GitHub config pattern as `api/publish.ts`.

* Validates the incoming payload using a `normalizeLeadPayload` function.

* Lead shape (conceptual):

  ```ts
  type LeadCategory =
    | "newsletter"
    | "services"
    | "quote"
    | "testimonial"
    | "contact"
    | "subject-suggestion";

  type Lead = {
    id: string;
    createdAt: string;
    category: LeadCategory;
    source: string;             // e.g. "home-newsletter", "footer-newsletter", "services-page"
    name?: string;
    email?: string;
    company?: string;
    role?: string;
    city?: string;
    message?: string;
    meta?: Record<string, unknown>;
  };
  ```

* The API reads and writes leads to a Git-tracked JSON file, via helper functions like `readLeads` / `writeLeads`.

Endpoints (simplified):

* `POST /api/inbox` — create a new lead.
* `GET /api/inbox` — list leads (protected by `PUBLISH_TOKEN`).
* `DELETE /api/inbox/:id` — delete a lead (admin only).

### 8.2. Client + mapping

A small client helper (`createLead`) is used by:

* `src/pages/Index.tsx` (home) — newsletter form.
* `src/components/Footer.tsx` — footer newsletter form.
* `src/pages/Services.tsx` — interest/quote dialogs.
* `src/pages/Contact.tsx` — full contact form.
* Subject suggestion UI.

`src/lib/leadFormatting.ts` contains helpers to display leads nicely in the admin inbox.

### 8.3. Admin inbox UI — `/admin/demandes`

* File: `src/pages/AdminInbox.tsx`.
* Route: `/admin/demandes` (linked from `/admin` as “Voir les demandes”).

Features:

* Lists leads with:

  * Category label (Contact, Services, Newsletter, etc.).
  * Basic info: name, email, source, date.

* Detail view:

  * You can open a lead in a panel/modal to see the full message.

* Filters:

  * By category and by time period.

* Delete:

  * A **red “Supprimer”** action that deletes the lead via `DELETE /api/inbox`.

---

## 9. Testimonials / “Ils m’ont fait confiance”

Testimonials are a full system: public section + review form + admin moderation + avatars + optional event photos.

### 9.1. Shared types & storage

* `shared/testimonials.ts`: types and helpers, e.g.:

  ```ts
  type TestimonialStatus = "pending" | "published" | "rejected";

  type Testimonial = {
    id: string;
    createdAt: string;
    status: TestimonialStatus;
    name: string;
    company?: string | null;
    city?: string | null;
    role?: string | null;
    rating: number;             // 1–5
    message: string;
    email?: string | null;
    clientType?: string | null;
    source?: string | null;
    avatar?: string | null;     // image data URL or URL
    avatarUrl?: string | null;  // optional external URL
    photos?: string[] | null;   // optional array of image data URLs/URLs
    sourceLeadId?: string | null;
  };
  ```

* Data is stored in a Git-tracked JSON file managed through `api/testimonials.ts`.

> **Important**: avatar + photos are usually stored as **data URLs**, so the JSON file can be large. We intentionally allow this but keep image sizes and counts reasonable (e.g. up to ~5 photos per testimonial).

### 9.2. API: `api/testimonials.ts`

* Same GitHub config helper as `api/publish.ts` and `api/inbox.ts`.

* We now use a **permissive normalizer** for testimonials:

  ```ts
  type NormalizeTestimonialResult = {
    ok: boolean;
    value?: TestimonialCreateInput;
    error?: string;
  };
  ```

  * Only missing `name` / `message` will produce `ok: false`.
  * Avatar and photos are accepted as strings/arrays if present; they do **not** cause validation failures.

* Endpoints (conceptual):

  * `POST /api/testimonials` — public “Leave a review” submissions.

    * Creates a **pending** testimonial (`status: "pending"`).

  * `GET /api/testimonials` — list testimonials.

    * In admin mode: returns all statuses.
    * In public mode: returns only `status: "published"`.

  * `PATCH /api/testimonials/:id` — update status (publish / reject).

  * `DELETE /api/testimonials/:id` — delete testimonial.

The `result.error` pattern is always read safely (we do **not** access `.error` on success unions anymore; that was a previous TypeScript error which is now fixed).

### 9.3. Public components

#### 9.3.1. `ReviewForm.tsx` (leave a review)

* Shown on the `/avis` page to let visitors **leave a review**.

* Fields:

  * Name (required)
  * Email (optional)
  * Company
  * Role / position
  * City
  * Rating (1–5 stars)
  * Avatar upload (file drag & drop, with face-crop UI)
  * Event photos upload (0–5 additional images)
  * Message (required)

* Behaviour:

  * When the form submits, the frontend calls a dedicated helper (e.g. `submitTestimonial`), which POSTs directly to `/api/testimonials`.

  * Payload includes:

    ```ts
    {
      name,
      source,
      email,
      clientType,
      role,
      city,
      rating,
      message,
      avatar: avatarDataUrl || undefined,
      photos: eventPhotos.length ? eventPhotos : undefined
    }
    ```

  * On success:

    * The review does **not** go live immediately; it becomes a `pending` testimonial.
    * The UI shows a success toast.

  * On failure:

    * A destructive toast is shown with the error message.
    * The error is logged to `console.error` for debugging.

#### 9.3.2. `TestimonialsSection.tsx` (public carousel)

* Used on:

  * Home page (`/`) near the bottom.
  * Services page (`/services`).

* Behaviour after the image/gallery refactor:

  * Fetches only **published** testimonials (`status: "published"`).
  * Displays **one testimonial per slide** (not a grid).
  * Has left/right arrows to navigate between testimonials.
  * Auto-advances every few seconds for a “slider” feeling.
  * For each testimonial, shows:

    * Rating (stars)
    * Message
    * Name
    * Company / city / role if present
    * Avatar in a **round photo** (using the cropped avatar stored as data URL).
    * A small **horizontal gallery** (carousel) of event photos if `photos` is non-empty:

      * 1–5 images.
      * Nice, modern layout (not an ugly grid).
      * Clicking arrows cycles through photos.
      * If there are no photos, the gallery area is simply not rendered.

### 9.4. Admin testimonials — `/admin/avis`

* File: `src/pages/AdminTestimonials.tsx`.
* Route: `/admin/avis` (linked from `/admin` as “Gérer les avis”).

Features:

* At the top: a **“Avis en attente (N)”** count for pending reviews.

* List of testimonials with:

  * Status badges (Pending, Published, Rejected).
  * Name, rating, createdAt date.

* Detail modal/panel per testimonial:

  * Shows full message, contact info, avatar, and the photo gallery (if any).
  * Allows clicking through the photos exactly as the visitor would see them.

* Actions per testimonial:

  * **Publier** — sets `status` to `"published"` (then appears in the public carousel).
  * **Rejeter** — sets `status` to `"rejected"`.
  * **Supprimer** — fully deletes the testimonial (including images) from the JSON file.

Back-end calls:

* Status changes use `PATCH /api/testimonials/:id` with `Authorization: Bearer <PUBLISH_TOKEN>`.
* Delete uses `DELETE /api/testimonials/:id` with the same token.

**Important**: the public flow is now:

1. Visitor submits review (+ avatar + optional photos) on `/avis`.
2. A **pending** testimonial is created.
3. Admin goes to `/admin/avis`, reviews content + images.
4. Admin clicks **Publier** → testimonial appears in the public carousel.

---

## 10. Deployments & domains (reminder)

1. In Vercel, open the project connected to `yinon1995/source-scribe-design`.

2. On the **Domains** tab, you should see:

   * **Production:** `a-la-brestoise.vercel.app`

3. If you publish content in `/admin` but do **not** see changes on `https://a-la-brestoise.vercel.app`:

   * Check that your latest commit is on GitHub `main`.
   * Check that Vercel has a recent deployment for `main`.
   * Ensure you are not accidentally visiting a legacy domain (see pitfall section).

If Git quota or “automatic deployments unavailable” errors appear on Vercel, the site will still read from GitHub’s latest deployed commit, but admin actions will only be visible locally until you trigger a new deployment.

---

## 11. NPM scripts

From `package.json`:

```json
{
  "dev": "vite",
  "build": "vite build && node scripts/generate-sitemap.mjs",
  "preview": "vite preview"
}
```

* `npm run dev` — dev server (used for local admin + content work).
* `npm run build` — production build **plus sitemap generation**.
* `npm run preview` — serve the built bundle locally.

`npm run build` writes `public/sitemap.xml`.
`robots.txt` points to that sitemap:

```txt
User-agent: *
Allow: /
Sitemap: https://a-la-brestoise.vercel.app/sitemap.xml
```

---

## 12. Sitemap generation

Handled by `scripts/generate-sitemap.mjs` and `public/sitemap.xml` base.

In `scripts/generate-sitemap.mjs`:

```ts
const SITE = "https://a-la-brestoise.vercel.app";
```

The script:

* Reads posts from `content/posts/` and/or `content/articles/`.

* Builds URLs for:

  * `/`
  * `/articles`
  * `/articles/<slug>`

* Writes the final XML to `public/sitemap.xml`.

If you change the domain or routes, update `SITE` and URL generation logic accordingly.

---

## 13. SEO, Search Console & Analytics

### 13.1. `index.html` `<head>` — basics

* `<title>` and `<meta name="description">`.
* Canonical:

  ```html
  <link rel="canonical" href="https://a-la-brestoise.vercel.app/" />
  ```

Change these if branding or domain changes.

### 13.2. Google Search Console

Ownership is verified with an HTML meta tag in `index.html`:

```html
<!-- Google Search Console verification -->
<meta
  name="google-site-verification"
  content="fW_c2TgXONX8n-fI0UjWUo5kKFXr2UbMIYveKSuvh14"
/>
```

This must stay in `<head>` to keep verification.

Search Console uses sitemap:

```text
https://a-la-brestoise.vercel.app/sitemap.xml
```

### 13.3. Google Analytics 4 (GA4)

GA4 is **hard-coded** in `index.html` (not via GTM):

* Measurement ID: `G-J9R45GD7L3`.

Snippet:

```html
<!-- Google Analytics 4 (property G-J9R45GD7L3) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-J9R45GD7L3"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag("js", new Date());
  gtag("config", "G-J9R45GD7L3");
</script>
```

If you change GA4, update both `G-J9R45GD7L3` strings.

### 13.4. Google Tag Manager (GTM)

GTM container is installed, but GA4 is **not** wired through it yet.

* Container ID: `GTM-P5PX3JQT`.

Head:

```html
<!-- Google Tag Manager -->
<script>
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-P5PX3JQT');
</script>
<!-- End Google Tag Manager -->
```

Immediately after `<body>`:

```html
<!-- Google Tag Manager (noscript) -->
<noscript>
  <iframe
    src="https://www.googletagmanager.com/ns.html?id=GTM-P5PX3JQT"
    height="0"
    width="0"
    style="display:none;visibility:hidden"
  ></iframe>
</noscript>
<!-- End Google Tag Manager (noscript) -->
```

If you move GA4 into GTM:

1. Create a GA4 tag in GTM and publish it.
2. **Remove** the hard-coded GA4 snippet from `index.html` to avoid double-counting.

---

## 14. 🔒 Things future AI MUST NOT break

* **Vercel / domain wiring**

  * Always use the project whose production domain is `https://a-la-brestoise.vercel.app`.

* **Admin publish contract (`api/publish.ts`)**

  * Keep the JSON response shape.
  * Keep `GITHUB_REPO`, `GITHUB_TOKEN`, `PUBLISH_BRANCH`, `PUBLISH_TOKEN` semantics.
  * Keep support for long `article.body` strings (inline images as data URLs).

* **Inline article images**

  * Do **not** strip or block `data:image/...;base64,...` URLs in article bodies.
  * Do not enforce tiny size limits that would make normal inline images fail.

* **Per-article fonts**

  * Keep `bodyFont` as a simple key mapped via `shared/articleBodyFonts.ts`.
  * Keep the CSS + font imports in sync with the keys.
  * If you change or remove fonts, update the mapping instead of silently breaking existing articles.

* **Inbox (`api/inbox.ts` + `/admin/demandes`)**

  * All contact flows (newsletter, services, contact, subject suggestions) must keep creating leads.
  * Do **not** revert back to opening Gmail compose instead of hitting the inbox API.

* **Testimonials (`api/testimonials.ts` + `/admin/avis` + public carousel)**

  * Keep the moderation statuses (`pending` → `published` → `rejected`) and mapping to public display.
  * Keep the flow: public form → pending in `/admin/avis` (“Avis en attente”) → admin approves → appears as “Ils m’ont fait confiance”.
  * Keep avatar + event photos support:

    * Avatar as a round image next to the review.
    * Up to a few event photos in a gallery, not a cluttered grid.

* **À propos config (`api/about.ts` + `/admin/a-propos` + `/a-propos` + `/services`)**

  * Do **not** hard-code the bio text again inside `About.tsx` or `Services.tsx`.
    The source of truth is **`content/about/a-propos.json`**.
  * Keep the structured shape (bio block, values block, approach block) and the **Admin À propos** editor workflow:

    * Admin edits the text in `/admin/a-propos`.
    * `api/about.ts` writes `content/about/a-propos.json` via GitHub.
    * `/a-propos` and `/services` both render from this config.

* **ArticleCard routing**

  * If you change URLs, update `ArticleCard` and the router together.

With this README, a future dev or AI should understand:

* How the JSON-based CMS works.
* How the admin space publishes articles, collects leads, manages reviews, handles images, and manages the shared À propos content.
* How not to repeat the Vercel/domain confusion.
* How SEO, Search Console, GA4, GTM, and the sitemap are currently wired.

````


