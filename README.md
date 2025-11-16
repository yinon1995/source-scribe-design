Here’s an updated README that includes what we just did with **Gmail compose + placeholder mode** and explains how to switch back to **real email sending** once you have a proper domain.

You can replace your current `README.md` with this:

````markdown
# À la Brestoise — JSON CMS + Admin “Writing Space”

This repo contains the **À la Brestoise** site, built with **Vite + React + TypeScript + Tailwind + shadcn/ui**.

Editorial content (articles) now lives primarily as **JSON files** under `content/articles/`.  
There is also legacy support for **Markdown files** under `content/posts/`, but the **admin writing space** reads/writes JSON articles and commits them to GitHub via a Vercel serverless function. A new deployment is then triggered so the updated article appears on the public pages.

This README is meant to be a “brain dump” so a future developer or AI can safely continue from here.

---

## ⚠️ CRITICAL PITFALL — WRONG VERCEL PROJECT / DOMAIN

This single mistake cost hours of debugging, so it’s called out **up front**.

**Symptoms when it’s wrong:**

- `/admin/articles` shows some articles, but GitHub only has a different set of JSON files.
- Publishing/deleting in `/admin` “works”, but the **public site** doesn’t change.
- Two URLs like these behave differently:

  - `https://source-scribe-design-git-main-yinon-coscas-projects.vercel.app/...`
  - `https://source-scribe-design-can9uvj3x-yinon-coscas-projects.vercel.app/...`

**Cause:**

- There were **multiple Vercel deployments / projects / domains**:
  - Some tied to this repo: `yinon1995/source-scribe-design`.
  - Others were **old/legacy projects** or forks.
- The browser was sometimes on a **legacy domain** or a **different Vercel project**, so:
  - `/admin` was reading/writing JSON files in one project/repo.
  - GitHub and the “main” site were looking at another project/repo.

**Fix / Rule:**

1. In Vercel, find the **single project that is connected to**  
   `yinon1995/source-scribe-design`.
2. Use **only that project’s domains**, for example:

   - Production: `https://source-scribe-design-can9uvj3x-yinon-coscas-projects.vercel.app`
   - Git-connected preview for `main`: `https://source-scribe-design-git-main-yinon-coscas-projects.vercel.app`

3. **Ignore or delete** any old Vercel projects like:

   - `https://source-scribe-design-xxxxx-nollas-projects.vercel.app`

If anything looks “impossible” (admin and GitHub do not match, or publish seems to work but the public site doesn’t change), **first check the URL bar** and confirm you are on the project that is actually connected to this repo.

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
- Default domains look like:

  - `https://source-scribe-design-can9uvj3x-yinon-coscas-projects.vercel.app`
  - `https://source-scribe-design-git-main-yinon-coscas-projects.vercel.app`

- Older URLs such as  
  `https://source-scribe-design-xxxxx-nollas-projects.vercel.app`  
  are **legacy** and should be ignored.

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

These are mostly relevant once you have a **real domain** configured and want the site to send emails directly.

### 3.5. Contact behavior: Gmail compose (current) vs live sending (future)

Contact behavior is controlled via two config files:

* `src/config/contact.ts`
* `src/config/contactFallback.ts`

Current setup (no custom domain yet):

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

Later, when you have a proper domain and want real emailing again:

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

The important point:
Right now the site is in **no-domain / placeholder** mode with **Gmail compose** everywhere.
Once there is a real domain, you only need to:

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

  * `import.meta.glob("/content/posts/*.md", { query: "?raw", import: "default" })`

  and parses frontmatter + body into `Post` objects.

* Loads JSON articles:

  * `import.meta.glob("/content/articles/*.json", { eager: true })`

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

2. In that project’s **Domains** tab you’ll see something like:

   * `source-scribe-design-can9uvj3x-yinon-coscas-projects.vercel.app`
   * `source-scribe-design-git-main-yinon-coscas-projects.vercel.app`

   Both belong to the **same project** and are fine to use.

3. If you ever see a completely different domain such as:

   * `source-scribe-design-xxxxx-nollas-projects.vercel.app`

   that is from another Vercel project and almost certainly points to
   **a different repo / older version**. Do **not** use it.

4. If you just published an article in `/admin` but:

   * It does not appear in `/articles`,
   * **and/or**
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
* `robots.txt` should point to `<your-domain>/sitemap.xml`.

---

## 10. Notes for future devs / future AI

* **Do not** create a new Vercel project from this repo unless you know why.
  Prefer reusing the existing project connected to `yinon1995/source-scribe-design`.

* When touching admin auth, reuse the existing pattern:

  * `PUBLISH_TOKEN` env var
  * `AdminGuard` + `adminSession` for client-side token storage
  * `Authorization: Bearer <PUBLISH_TOKEN>` in admin API calls

* When dealing with articles:

  * Treat `content/articles/*.json` + `content/articles/index.json` as the main source of truth.
  * Use `src/lib/content.ts` helpers (`postsIndex`, `getPostBySlug`).
  * For admin lists, use `src/lib/articlesIndex.ts`.

* If you’re not sure where an article lives:

  * Check `content/articles/` in GitHub.
  * Check `content/articles/index.json`.
  * Add a temporary `console.log` around `postsIndex` or `getAllArticlesForAdmin()` in local dev.

* For contact behavior:

  * Right now the site is in **placeholder / Gmail** mode (no domain).
  * Once a real domain is ready, switch `CONTACT_MODE` to `"live"` and wire the contact APIs to your email provider.

With this README, you should be able to:

* Understand how the current JSON-based CMS works.
* Safely ask Cursor / another AI to continue from the exact state we’re in now.
* **Avoid the Vercel/domain confusion** that previously caused hours of debugging.
* Know how to move from “Gmail-only placeholder contact” to full live emailing once the domain is ready.

```

