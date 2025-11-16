
# À la Brestoise — Markdown CMS + Admin “Writing Space”

This repo contains the **À la Brestoise** site, built with **Vite + React + TypeScript + Tailwind + shadcn/ui**.

Editorial content (articles) is stored as **Markdown files** under `content/posts/`.
An **admin writing space** lets you create or edit articles. A Vercel serverless function commits those changes directly to GitHub, and Vercel redeploys the site so the new article appears on the public pages.

This README is meant to be a “brain dump” so a future developer or AI can safely continue from here.

---

## 1. Tech stack & architecture

**Frontend**

* Vite + React + TypeScript
* Tailwind CSS + shadcn/ui
* Routing via `react-router-dom` (SPA)

**Content**

* Markdown files under `content/posts/*.md`
* Some extra JSON/TS content (testimonials, etc.)
* All of this is loaded via `src/lib/content.ts` into:

  * `posts` (full content)
  * `postsIndex` (frontmatter/index)

**Backend / API (Vercel serverless)**

* Functions under `/api`:

  * `publish.ts` — creates/updates Markdown posts and commits to GitHub
  * `subscribe.ts` — newsletter subscriptions
  * `contact.ts`, `testimonial.ts`, etc. — forms / emails
* These functions use environment variables (GitHub, Resend, etc.) set in Vercel.

**Deployment**

* Canonical Vercel project: **`source-scribe-design`**
* Canonical production domain:
  `https://source-scribe-design.vercel.app`
* Other URLs like
  `https://source-scribe-design-xxxx-nollas-projects.vercel.app`
  are **older deployments**. They can show different content and should be treated as **legacy / ignore**.

---

## 2. Running locally

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` (or the port shown in the terminal).

---

## 3. Environment variables (Vercel)

In Vercel → Project **source-scribe-design** → **Settings → Environment Variables**, you should have:

### 3.1. GitHub / content publishing

Used by `api/publish.ts` to commit changes into the repo:

* `GITHUB_TOKEN`
  GitHub Personal Access Token with repo permissions.
* `GITHUB_OWNER`
  GitHub username or org (e.g. `nolwennrobet-lab`).
* `GITHUB_REPO`
  Repo name (e.g. `source-scribe-design`).
* `GITHUB_BRANCH`
  Target branch (usually `main`).

### 3.2. Admin security / publish token

* `PUBLISH_TOKEN`
  Secret token used as:

  * The **admin password** in the writing space (admin UI).
  * The **server-side auth token** in `api/publish.ts` (header `Authorization: Bearer <PUBLISH_TOKEN>`).

> Earlier docs/code sometimes mention `ADMIN_PASSWORD`.
> From now on treat **`PUBLISH_TOKEN` as the single source of truth** for publishing access.

### 3.3. Optional deploy hook

* `VERCEL_DEPLOY_HOOK_URL` (optional)
  A Vercel “Deploy Hook” URL. If set, `publish.ts` calls it after writing the Markdown file so Vercel redeploys immediately.

### 3.4. Email (newsletter / contact)

Depending on the current code:

* `RESEND_API_KEY` — API key for Resend (email provider).
* `RESEND_FROM` — From-address (must match a verified domain at Resend).
* Potentially other contact-related vars (e.g. `CONTACT_TO_EMAIL`) — check the API files under `/api`.

---

## 4. Content model & indexing

### 4.1. Markdown posts

Each article is a `.md` file in `content/posts/` with YAML frontmatter:

```yaml
---
title: "Article title"
slug: "article-slug"
date: "2025-11-04"            # ISO date string
summary: "Short French summary (≤ 160 chars)."
tags: ["beaute", "soin", "peau"]
category: "Beauté"            # optional
heroImage: "/images/2025/11/hero.jpg"
readingMinutes: 7             # optional
sources:
  - "Source 1"
  - "Source 2"
---

Article body in **Markdown** (French).
```

### 4.2. `src/lib/content.ts`

* Loads all posts from `content/posts/*.md`.

* Builds:

  * `posts`: full objects (frontmatter + body).
  * `postsIndex`: frontmatter-only objects for listing / SEO.

* Exposes `getPostBySlug(slug)` to fetch a single article.

**Important:**
`postsIndex` is **static**. It’s built at **build time**.
When `api/publish` creates/edits a Markdown file, a new **Vercel deploy** is required before the article shows up on:

* `/articles`
* `/articles/:slug`
* `/admin/articles` (admin list, which uses the same index).

---

## 5. Public frontend

### 5.1. Main public routes

Based on `src/App.tsx` / `src/pages`:

* `/` — Home
* `/articles` — all articles
* `/articles/:slug` — article detail
* `/thematiques`, `/a-propos`, `/services`, `/contact`, etc. — other marketing pages

### 5.2. Article list page (`src/pages/Articles.tsx`)

* Imports `postsIndex` (or a helper like `getAllArticlesForAdmin` from `src/lib/articlesIndex.ts`).

* Maps each item to a card with:

  * Image (`heroImage` or `/placeholder.svg`)
  * Category (derived from `category` or first tag)
  * Reading time (`readingMinutes` → `"x min"`)
  * Title, summary, tags, etc.

* Handles filters: category buttons, search bar.

---

## 6. Admin “writing space”

The admin area is frontend-only but protected by a **guard** that checks for `PUBLISH_TOKEN` in `sessionStorage`.

### 6.1. Admin routes

All these routes are wrapped by `AdminGuard` in `src/App.tsx`:

* `/admin`
  Entry point to the writing space.

  * If no token in `sessionStorage`, shows a **password screen**:

    * Title: “Accès espace rédaction” (or similar).
    * Field: “Mot de passe administrateur”.
    * Submit → stores token in `sessionStorage` (key like `admin-publish-token`).
  * Once a token is present, shows the **Dashboard** with two cards:

    * “Créer un nouvel article”
    * “Modifier les articles existants”

* `/admin/nouvel-article` (and alias `/admin/new`)
  **New article / edit article page**:

  * Form fields:

    * Title, slug, category, tags, cover image URL or local preview, summary, body (Markdown), sources, reading time, etc.
    * Admin password field prefilled from `sessionStorage`.
  * On **Publish**:

    * Sends `POST /api/publish` with all fields.
    * Adds `Authorization: Bearer <PUBLISH_TOKEN>`.
  * On success:

    * Shows a success toast / dialogue and navigates back (target might still be adjusted).
  * **Edit mode**:

    * When opened as `/admin/nouvel-article?slug=<slug>`, the component:

      * uses `getPostBySlug(slug)` to prefill everything,
      * disables editing of the slug,
      * still posts to `/api/publish` to update the same file.

* `/admin/articles`
  **Existing articles list**:

  * Uses `postsIndex` (or `getAllArticlesForAdmin`) to build the list.

  * Table columns:

    `Title | Slug | Publication date | Status | Actions`

  * For each row:

    * Click row or **Modifier** → go to `/admin/nouvel-article?slug=<slug>` (edit mode).
    * Buttons:

      * **Republish** — currently a stub (toast “coming soon”).
      * **Delete** — currently a stub (confirm + toast “coming soon”).

### 6.2. `AdminGuard` + session helper

* `src/lib/adminSession.ts` (or similar):

  * `getAdminToken()` – reads token from `sessionStorage` (SSR-safe).
  * `setAdminToken(value)` – stores token.
  * `clearAdminToken()` – removes token.
* `src/components/AdminGuard.tsx`:

  * On first render, checks `getAdminToken()`.
  * If no token → renders full-page admin login.
  * If token exists → renders its children (dashboard, editor, list…).
* `src/App.tsx`:

  * Wraps admin routes like:

    ```tsx
    <Route
      path="/admin"
      element={
        <AdminGuard>
          <AdminDashboard />
        </AdminGuard>
      }
    />
    ```

---

## 7. Full publishing flow

1. Admin goes to
   `https://source-scribe-design.vercel.app/admin`.

2. Enters `PUBLISH_TOKEN`.

3. Clicks **Créer un nouvel article**.

4. Fills the form, presses **Publier**.

5. Frontend calls:

   ```http
   POST /api/publish
   Authorization: Bearer <PUBLISH_TOKEN>
   Content-Type: application/json
   ```

6. `api/publish.ts`:

   * Verifies the token (`PUBLISH_TOKEN`).
   * Writes/updates `content/posts/<slug>.md` in the GitHub repo (via GitHub API).
   * Optionally saves an image under `public/images/YYYY/MM/`.
   * Optionally calls `VERCEL_DEPLOY_HOOK_URL` to trigger redeploy.

7. After the new deployment finishes:

   * `/articles` shows the article (because `postsIndex` now includes it).
   * `/articles/<slug>` is available.
   * `/admin/articles` lists it too (same source of truth).

---

## 8. Deployments & domains (important!)

There was confusion earlier because multiple Vercel deployments and URLs exist.

**Canonical project:**

* Project: `source-scribe-design`
* Domain: `https://source-scribe-design.vercel.app`
* This is where you should always test:

  * `/`
  * `/articles`
  * `/admin`

**Legacy / extra URLs:**

* URLs like
  `https://source-scribe-design-xxxxx-nollas-projects.vercel.app`
* These may point to old states of the repo, old branches, or other configs.
* They **must not** be used for day-to-day work.

If after publishing you get redirected to an old URL:

* Check `VERCEL_DEPLOY_HOOK_URL`: it must point to the **current** project.
* Check your browser bookmarks: always use the canonical domain.
* In Vercel, you can remove unnecessary domains or redirect them to the canonical one.

---

## 9. Known issues & debugging tips

### 9.1. Admin list shows “Aucun article publié pour le moment.”

Symptoms: `/admin/articles` table shows the empty-state row.

Checklist:

1. Check `postsIndex` in the browser console:

   * Temporarily add:

     ```ts
     console.log("[AdminArticles] postsIndex length & slugs", {
       length: postsIndex.length,
       slugs: postsIndex.map(p => p.slug),
     });
     ```

   * If `length === 0`, the index is empty.

2. Verify that Markdown files exist on the **main branch**:

   * Look at `content/posts/` in GitHub → `main`.

3. Ensure you are looking at the **canonical deployment**:

   * Only trust `https://source-scribe-design.vercel.app`.

4. If the posts exist in the repo but not in the deployed site:

   * Redeploy the project from Vercel or trigger the deploy hook.
   * Remember: the index is rebuilt at **build time**.

### 9.2. 404 on `/admin` after publish or refresh

Most likely you hit an old deployment URL.

* Confirm the URL: it must start with
  `https://source-scribe-design.vercel.app`.
* If you see `source-scribe-design-xxx-nollas-projects…` in the URL bar, it’s not the canonical one.
* Update bookmarks / links to use the canonical domain.

---

## 10. NPM scripts

From `package.json`:

```json
{
  "dev": "vite",
  "build": "vite build && node scripts/generate-sitemap.mjs",
  "preview": "vite preview"
}
```

* `npm run build` also generates `public/sitemap.xml` by scanning `content/posts/`.
* `robots.txt` should point to `https://source-scribe-design.vercel.app/sitemap.xml`.

---

## 11. Notes for future devs / future AI

* **Do not** create another new Vercel project from this repo.
  Always use the existing project `source-scribe-design`.

* When touching admin auth, reuse the existing pattern:

  * `PUBLISH_TOKEN` env var
  * `AdminGuard` + `adminSession` (`sessionStorage`) on the client
  * Authorization header in `api/publish.ts`

* When dealing with articles:

  * Use `src/lib/content.ts` helpers (`postsIndex`, `getPostBySlug`).
  * Remember that content changes = **new deploy**.
  * For lists (`/articles`, `/admin/articles`), use `postsIndex` or `getAllArticlesForAdmin`.

* If you’re not sure where an article lives:

  * Look in `content/posts/` on GitHub.
  * Then add a temporary `console.log` around `postsIndex` in local dev.

With this README, you should be able to:

* Understand how the current system works.
* Safely ask Cursor / another AI to continue from the exact state we’re in now.
* Avoid the confusion with multiple deployments and missing articles.
