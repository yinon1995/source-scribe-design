Nice, everything is in a good place now.
Here’s a **clean, updated README** you can paste over your current `README.md` (it includes Search Console, GA4, GTM, and the new domain + sitemap setup).

````markdown
# À la Brestoise — JSON CMS + Admin “Writing Space”

This repo contains the **À la Brestoise** site, built with **Vite + React + TypeScript + Tailwind + shadcn/ui**.

Editorial content (articles) now lives primarily as **JSON files** under `content/articles/`.  
There is also legacy support for **Markdown files** under `content/posts/`, but the **admin writing space** reads/writes JSON articles and commits them to GitHub via a Vercel serverless function. A new deployment is then triggered so the updated article appears on the public pages.

This README is meant to be a “brain dump” so a future developer or AI can safely continue from here.

---

## ⚠️ CRITICAL PITFALL — WRONG VERCEL PROJECT / DOMAIN

This mistake previously cost hours of debugging, so it’s called out **up front**.

**Symptoms when it’s wrong:**

- `/admin/articles` shows some articles, but GitHub only has a different set of JSON files.
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

   treat them as **legacy** unless you have confirmed in the Vercel dashboard that they belong to this exact project.

If anything looks “impossible” (admin and GitHub do not match, or publish seems to work but the public site doesn’t change), **first check the URL bar** and confirm you are on the project that is actually connected to this repo and to `a-la-brestoise.vercel.app`.

---

## 1. Tech stack & architecture

### Frontend

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Routing via `react-router-dom` (SPA)

### Content

- **JSON articles** under `content/articles/*.json` (main source of truth)
- **Legacy Markdown** posts under `content/posts/*.md` (optional)
- Some extra JSON/TS content (testimonials, home sections, etc.)
- All of this is loaded via `src/lib/content.ts` into:

  - `posts` (full content objects)
  - `postsIndex` (frontmatter/index for listings & SEO)

### Backend / API (Vercel serverless)

- Functions under `/api`:

  - `publish.ts` — creates/updates **JSON articles** and commits to GitHub
  - `subscribe.ts` — newsletter subscriptions
  - `contact.ts`, `testimonial.ts`, etc. — forms / emails (for future **live** mode)

- These functions use environment variables (GitHub, Resend, etc.) set in Vercel.

### Deployment

- Vercel project linked to the GitHub repo `yinon1995/source-scribe-design`.
- Main domain:

  - **Production:** `https://a-la-brestoise.vercel.app`

- Vercel also exposes auto-generated preview URLs for branches (e.g. `*-git-main-*.vercel.app`).  
  These are fine to use as long as they belong to the **same** project.

Always confirm in the Vercel dashboard which project is connected to this repo, and use that project’s domains.

---

## 2. Running locally

```bash
npm install
npm run dev
````

Then open `http://localhost:5173` (or the port shown in the terminal).

For local testing of admin features, you’ll need a `.env.local` (or Vercel env) with the GitHub variables described below.

---

## 3. Environment variables (Vercel)

In Vercel → Project (linked to **yinon1995/source-scribe-design**) → **Settings → Environment Variables**.

### 3.1. GitHub / content publishing

Used by `api/publish.ts` to commit changes into the repo via the GitHub Contents API:

* `GITHUB_REPO`
  Full `owner/repo` string.
  Example: `yinon1995/source-scribe-design`

* `GITHUB_TOKEN`
  GitHub Personal Access Token with **contents read/write** permissions for the repo.

* `PUBLISH_BRANCH`
  Target branch to write to (usually `main`).
  If not set, the code defaults to `main`.

> Note: older docs/code may mention `GITHUB_OWNER` and `GITHUB_BRANCH`.
> The current implementation uses **only** `GITHUB_REPO` (as `owner/repo`) plus `PUBLISH_BRANCH`.

### 3.2. Admin security / publish token

* `PUBLISH_TOKEN`
  Secret token used as:

  * The **admin password** in the writing space (admin UI).
  * The **server-side auth token** in `api/publish.ts`
    (`Authorization: Bearer <PUBLISH_TOKEN>`).

Treat `PUBLISH_TOKEN` as the **single source of truth** for publishing access.

### 3.3. Optional deploy hook

* `VERCEL_DEPLOY_HOOK_URL` (optional)
  A Vercel “Deploy Hook” URL.
  If set, `publish.ts` can call it after writing the article so Vercel redeploys immediately.
  If not set, deployments still happen when the branch is updated.

### 3.4. Email / contact integrations (future live mode)

For true **server-side emailing** (newsletter/contact forms), you’ll typically use:

* `RESEND_API_KEY` — API key for Resend (email provider).
* `RESEND_FROM` — From-address (must match a verified domain at Resend).
* Possibly other contact-related vars (e.g. `CONTACT_TO_EMAIL`) — check `api/contact.ts`, `api/subscribe.ts`, etc.

These are mostly relevant once you have a **real custom domain** configured and want the site to send emails directly.

### 3.5. Contact behavior: Gmail compose (current) vs live sending (future)

Contact behavior is controlled via two config files:

* `src/config/contact.ts`
* `src/config/contactFallback.ts`

**Current setup (placeholder mode):**

* `src/config/contact.ts` defines:

  ```ts
  export const CONTACT_EMAIL = "…@…"; // main recipient

  export type GmailComposeOptions = {
    subject?: string;
    body?: string;
  };

  export function getGmailComposeUrl(options?: GmailComposeOptions): string { … }

  export function openGmailCompose(options?: GmailComposeOptions) { … }
  ```

* All **contact CTAs** (“Écrire un e-mail”, contact buttons, services CTAs, etc.) import and call `openGmailCompose(...)`.
  Result: clicking those buttons opens **Gmail compose in a new tab**, with:

  * `To` = `CONTACT_EMAIL`
  * Optional `subject` and `body` pre-filled depending on context

* `src/config/contactFallback.ts` defines a mode:

  ```ts
  export type ContactMode = "placeholder" | "live";

  export const CONTACT_MODE: ContactMode = "placeholder";
  ```

  In **placeholder** mode, the site does **not** try to send emails via API.
  It only opens Gmail (and WhatsApp where relevant) so users can contact manually.

**Later, when you have a proper domain and want real emailing again:**

1. Configure email provider env vars (Resend, etc.).

2. Switch `CONTACT_MODE` in `src/config/contactFallback.ts` from:

   ```ts
   export const CONTACT_MODE: ContactMode = "placeholder";
   ```

   to:

   ```ts
   export const CONTACT_MODE: ContactMode = "live";
   ```

3. In **live** mode, components like `Contact.tsx`, `Services.tsx`, etc. can:

   * Call the relevant API routes (`/api/contact`, `/api/subscribe`, …) instead of only opening Gmail.
   * Keep the Gmail fallback if you still want it as a backup.

Right now the site is in **no-custom-domain / placeholder** mode with **Gmail compose** everywhere.
Once there is a real domain+email setup, you only need to:

* Set the email env vars.
* Flip `CONTACT_MODE` to `"live"`.
* Ensure contact APIs (`api/contact.ts`, etc.) are wired to those env vars.

---

## 4. Content model & indexing

### 4.1. JSON articles (`content/articles/*.json`)

Each article is a JSON file (type `JsonArticle` in `src/lib/content.ts`):

```ts
type JsonArticle = {
  title: string;
  slug: string;
  category: "Commerces & lieux" | "Expérience" | "Beauté";
  tags: string[];
  cover: string;      // image URL
  excerpt: string;    // short French summary
  body: string;       // markdown body
  author: string;
  date: string;       // ISO date
  readingMinutes?: number;
  sources?: string[];
};
```

These are created/updated by the admin UI via `api/publish.ts`.
The function also maintains `content/articles/index.json` (an array of summary objects) for fast listing.

### 4.2. Legacy Markdown posts (`content/posts/*.md`)

Older articles can still live as `.md` files with YAML frontmatter:

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

Article body in **Markdown** (French).
```

These are primarily for backward compatibility. The admin UI does **not** edit Markdown files.

### 4.3. `src/lib/content.ts`

This module:

* Loads Markdown posts:

  ```ts
  import.meta.glob("/content/posts/*.md", {
    query: "?raw",
    import: "default",
  });
  ```

  and parses frontmatter + body into `Post` objects.

* Loads JSON articles:

  ```ts
  import.meta.glob("/content/articles/*.json", { eager: true });
  ```

  and maps JSON articles into the same `PostFrontmatter` shape.

Exports:

* `posts: Post[]` — full content.
* `postsIndex: PostFrontmatter[]` — frontmatter only, sorted by date (newest first).
* `getPostBySlug(slug)` — finds either a Markdown or JSON article by slug.

The **public site** (`/articles`, `/articles/:slug`) reads from these helpers.

### 4.4. `src/lib/articlesIndex.ts`

Admin-specific helper that reads all JSON articles and exposes a typed list for `/admin/articles`.
It builds the list by globbing `content/articles/*.json` (excluding `index.json`), normalizing the data and sorting by date.

---

## 5. Public frontend

### 5.1. Main public routes

From `src/App.tsx` / `src/pages`:

* `/` — Home
* `/articles` — all articles
* `/articles/:slug` — article detail
* `/thematiques`, `/a-propos`, `/services`, `/contact`, etc. — other marketing pages

### 5.2. Article list page (`src/pages/Articles.tsx`)

* Imports `postsIndex`.

* Maps each item to a card:

  * Image (`heroImage` or fallback)
  * Category (from `category`)
  * Reading time (`readingMinutes` → `"x min"`)
  * Title, excerpt, tags, etc.

* Handles filters: category buttons, search bar, etc.

---

## 6. Admin “writing space”

The admin area is a client-side SPA section, protected by a guard that checks a token stored via `src/lib/adminSession.ts`.

### 6.1. Admin routes

All admin routes are wrapped by `AdminGuard` in `src/App.tsx`:

* `/admin` — entry point to the writing space.

  * If no token is stored:

    * Shows a **password screen**:

      * Title: “Accès espace rédaction”
      * Field: “Mot de passe administrateur”
      * On submit: stores the token via `setAdminToken()`; if valid, grants access.

  * If a token is present:

    * Shows the **Dashboard** with cards:

      * “Créer un nouvel article”
      * “Modifier les articles existants”

* `/admin/nouvel-article` (alias `/admin/new`) — **new/edit article**:

  * Form fields for:

    * Title, slug, category, tags, cover image URL, summary (excerpt), body (Markdown), sources, author, date, reading time, etc.

  * Admin password/token is read from `adminSession` and sent as `Authorization: Bearer <PUBLISH_TOKEN>` to `api/publish.ts`.

  * On **Publier**:

    * Calls `POST /api/publish` with JSON body.

  * **Edit mode**:

    * When opened as `/admin/nouvel-article?slug=<slug>`:

      * Uses `getPostBySlug(slug)` or the JSON index to prefill fields.
      * Keeps the same `slug` so URLs don’t break.
      * Publishing updates the same JSON file and index entry (no duplicate articles).

  * Drafts can be autosaved to `localStorage` so they survive refresh.

* `/admin/articles` — **existing articles list**:

  * Uses `getAllArticlesForAdmin()` (from `src/lib/articlesIndex.ts`) to list all JSON articles.

  * Table columns typically:

    * `Title | Slug | Publication date | Status | Actions`

  * Actions:

    * **Modifier**: navigates to `/admin/nouvel-article?slug=<slug>`.
    * **Supprimer**: opens a confirm dialog and calls `DELETE /api/publish?slug=<slug>`.

### 6.2. `AdminGuard` + admin session helper

* `src/lib/adminSession.ts`:

  * `getAdminToken()` – reads the stored token.
  * `setAdminToken(value)` – stores the token.
  * `clearAdminToken()` – removes the token.

* `src/components/AdminGuard.tsx`:

  * On mount, calls `getAdminToken()`.
  * If no token → renders full-page admin login.
  * If token exists → renders admin children (dashboard, editor, list…).

---

## 7. Publishing & deleting flow (JSON articles)

### 7.1. Publishing an article

1. Admin opens `/admin`.

2. Enters `PUBLISH_TOKEN`.

3. Clicks **Créer un nouvel article**.

4. Fills the form and presses **Publier**.

5. Frontend calls:

   ```http
   POST /api/publish
   Authorization: Bearer <PUBLISH_TOKEN>
   Content-Type: application/json
   ```

   with a JSON payload matching the `Article` type in `api/publish.ts`.

6. `api/publish.ts`:

   * Verifies the token against `PUBLISH_TOKEN`.

   * Normalizes the slug (lowercase, no spaces or accents).

   * Writes/updates:

     * `content/articles/<slug>.json` — full article.
     * `content/articles/index.json` — list of article metadata.

   * Commits changes to `GITHUB_REPO` on branch `PUBLISH_BRANCH` via the GitHub Contents API.

   * Optionally calls `VERCEL_DEPLOY_HOOK_URL` to trigger deploy.

7. After the new deployment finishes:

   * `/articles` shows the article.
   * `/articles/<slug>` is available.
   * `/admin/articles` lists it.

### 7.2. Deleting an article

1. Admin goes to `/admin/articles`.

2. Clicks **Supprimer** and confirms.

3. Frontend calls:

   ```http
   DELETE /api/publish?slug=<slug>
   Authorization: Bearer <PUBLISH_TOKEN>
   ```

4. `api/publish.ts`:

   * Verifies the token.
   * Removes the article entry from `content/articles/index.json`.
   * Deletes `content/articles/<slug>.json` via the GitHub Contents API.
   * Commits the changes and optionally triggers a deploy hook.

5. After deployment, the article disappears from:

   * `/admin/articles`
   * `/articles` and `/articles/<slug>`.

---

## 8. Deployments & domains (detailed reminder)

1. Go to Vercel and open the project that is connected to
   `yinon1995/source-scribe-design`.

2. In that project’s **Domains** tab you’ll see at least:

   * **Production:** `a-la-brestoise.vercel.app`

   (Plus auto-generated preview domains for branches.)

3. If you ever see a completely different domain such as:

   * `source-scribe-design-xxxxx-*.vercel.app`

   that is almost certainly a **different project or an old setup**. Do **not** use it.

4. If you just published an article in `/admin` but:

   * It does not appear in `/articles`, **and/or**
   * The JSON files in GitHub don’t match what you see in `/admin/articles`,

   then you are almost certainly on the **wrong domain/project**.

   → Check the URL and switch back to the project connected to this repo.

---

## 9. NPM scripts

From `package.json`:

```json
{
  "dev": "vite",
  "build": "vite build && node scripts/generate-sitemap.mjs",
  "preview": "vite preview"
}
```

* `npm run build` also generates `public/sitemap.xml`.
* `robots.txt` points to the sitemap:

  ```txt
  User-agent: *
  Allow: /
  Sitemap: https://a-la-brestoise.vercel.app/sitemap.xml
  ```

---

## 10. Sitemap generation

Sitemap generation is handled by `scripts/generate-sitemap.mjs` and a base XML file in `public/sitemap.xml`.

* In `scripts/generate-sitemap.mjs`:

  ```ts
  const SITE = "https://a-la-brestoise.vercel.app";
  ```

* The script:

  * Reads Markdown posts from `content/posts/` (if any),

  * Builds URLs:

    * Home: `/`
    * Articles index: `/articles`
    * Individual posts: `/articles/<slug>`

  * Writes the final XML to `public/sitemap.xml`.

**Important:**
Whenever you change the domain or route structure, update `SITE` and/or the URLs generated in this script.

---

## 11. SEO, Search Console & Analytics

### 11.1. `index.html` `<head>` — SEO basics

`index.html` contains:

* Page `<title>` and `<meta name="description">`.
* Canonical link:

  ```html
  <link rel="canonical" href="https://a-la-brestoise.vercel.app/" />
  ```

Update these if the brand tagline or canonical domain changes.

### 11.2. Google Search Console

Ownership is verified via the **HTML tag** method.

In `index.html`:

```html
<!-- Google Search Console verification -->
<meta
  name="google-site-verification"
  content="fW_c2TgXONX8n-fI0UjWUo5kKFXr2UbMIYveKSuvh14"
/>
```

* This tag must remain in `<head>` to keep ownership verified.
* If Google ever gives you a new `content` value (new property / new domain), replace it accordingly.

The sitemap URL submitted in Search Console is:

```text
https://a-la-brestoise.vercel.app/sitemap.xml
```

### 11.3. Google Analytics 4 (GA4)

GA4 is currently **hard-coded directly in `index.html`**, **not** via Google Tag Manager.

Measurement ID in use:

* **GA4 Measurement ID:** `G-J9R45GD7L3`

Snippet in `index.html`:

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

If you change GA4 properties later, update both `G-J9R45GD7L3` occurrences.

This setup is already working: when someone visits the site, you should see them in the **Realtime** report of GA4.

### 11.4. Google Tag Manager (GTM)

A Google Tag Manager container is installed, but GA4 is **still hard-coded**, not managed by GTM yet.

Container ID:

* **GTM ID:** `GTM-P5PX3JQT`

In `index.html`:

**Head (as high as possible):**

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

**Immediately after `<body>`:**

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

**Important:**

* Right now, GA4 is **not** set up as a tag inside GTM.
  Only the container is loaded (ready for future tags: FB pixel, Hotjar, etc.).

* If in the future you want GA4 managed by GTM:

  1. Create a **GA4 Configuration tag** in GTM and publish.
  2. **Remove** the hard-coded GA4 snippet from `index.html`.
     Otherwise each visit will be double-counted.

---

With this README, you should be able to:

* Understand how the current JSON-based CMS works.
* Safely ask Cursor / another AI to continue from the exact state we’re in now.
* Avoid the Vercel/domain confusion that previously caused hours of debugging.
* Know how contact works today (Gmail compose placeholder) and how to switch to live emailing.
* Understand the current SEO/analytics setup:

  * Search Console verification via HTML tag,
  * GA4 tracking with `G-J9R45GD7L3`,
  * Google Tag Manager container `GTM-P5PX3JQT` installed but not yet used for GA4,
  * Sitemap & robots.txt correctly pointing to `https://a-la-brestoise.vercel.app/`.

````

Next tiny step, if you want: after you paste this into `README.md`, do:

```bash
git add README.md
git commit -m "Update README with domain, GA4, GTM and sitemap setup"
git push origin main
````

and we’re fully synced.
