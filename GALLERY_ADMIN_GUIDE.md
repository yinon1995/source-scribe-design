# Gallery Admin - Local Development Guide

## ✅ FIXED: Save Now Works!

The gallery admin save functionality is now fully operational with proper error handling.

## 🚀 How to Use Locally

### Option 1: With API Support (Recommended)
```bash
# Stop your current dev server (Ctrl+C)
# Then run:
npm run dev:api
```

This starts **Vercel Dev** on `http://localhost:3000`, which:
- ✅ Runs the Vite app
- ✅ Runs `/api/*` endpoints (including `/api/homeGallery`)
- ✅ Enables full save functionality

### Option 2: Vite Only (No API - Read Only)
```bash
npm run dev
```

This runs **Vite** on `http://localhost:5173`, which:
- ✅ Runs the app UI
- ❌ Cannot save (no `/api/*` endpoints)
- 💡 Shows helpful message: "API locale indisponible — lancez: npm run dev:api"

---

## 📝 Full Workflow

### 1. Start Dev Server with API
```bash
npm run dev:api
```

### 2. Go to Admin Gallery
```
http://localhost:3000/admin/galerie
```

### 3. Upload Images
- Click **"Ajouter des images"**
- Select 1-15 images from your computer
- Images convert to data URLs automatically
- See instant preview

### 4. Save
- Click **"Enregistrer"**
- ✅ Saves to `content/home/gallery.json`
- ✅ Auto-refreshes gallery data
- ✅ Shows success toast: "Enregistré"

### 5. Verify on Home Page
- Go to `http://localhost:3000/`
- Refresh page
- ✅ See your new images in the gallery!

---

## 🔧 What Was Fixed

### Admin Save Function (`src/pages/AdminGallery.tsx`)
✅ **Detailed Error Handling:**
- Captures HTTP status codes
- Parses error response (JSON or text)
- Logs full details to console
- Shows actionable error messages

✅ **Smart Error Messages:**
- `404` → "API locale indisponible — lancez: npm run dev:api"
- Other errors → "Erreur de sauvegarde (code: XXX)"
- Network errors → "API locale indisponible..."

✅ **Post-Save Refresh:**
- Automatically re-fetches gallery data after successful save
- Keeps admin UI in sync with saved state

### API (`api/homeGallery.ts`)
✅ **Filesystem Fallback:**
- Reads/writes `content/home/gallery.json` when GitHub env vars missing
- Returns `{ success: true, data: {...}, mode: "fs-write" }` on local save
- Never crashes - always returns structured JSON responses

✅ **Proper Auth:**
- Checks `PUBLISH_TOKEN` if set
- Returns `401` with JSON if auth fails
- Falls back to filesystem if no GitHub credentials

---

## 🎯 Acceptance Checklist

- ✅ Admin page loads existing gallery items (5/15)
- ✅ Upload from computer works (data URLs)
- ✅ Save button enabled (not disabled in local mode)
- ✅ Clicking "Enregistrer":
  - With `npm run dev:api` → ✅ Saves successfully, updates `gallery.json`
  - With `npm run dev` (Vite only) → Shows clear message to use `dev:api`
- ✅ Home gallery shows updated images after save + refresh
- ✅ No generic errors - all errors are specific and actionable
- ✅ Build passes: `npm run build` ✅

---

## 🐛 Debugging

### Check Console Logs
All PUT errors log detailed info:
```javascript
console.error("homeGallery PUT failed", {
  status: 404,
  body: "Not Found"
});
```

### Verify API is Running
1. Open: `http://localhost:3000/api/homeGallery`
2. Should return: `{ success: true, data: { title: "Galerie", items: [...] } }`

### Check Auth Token
Admin token is stored in `sessionStorage.adminToken`

### Verify File Saved
After clicking "Enregistrer", check:
```bash
cat content/home/gallery.json
```

---

## 🚀 Production

In production (Vercel):
- ✅ GitHub env vars used (`GITHUB_REPO`, `GITHUB_TOKEN`)
- ✅ Saves to GitHub instead of filesystem
- ✅ Triggers Vercel deploy hook if configured
- ✅ Same error handling and success flow

---

## 📦 Package Scripts

```json
{
  "dev": "vite",                    // Vite only (no API)
  "dev:api": "vercel dev -p 3000",  // Vite + API ✅
  "build": "vite build && ...",     // Production build
  "preview": "vite preview"         // Preview build
}
```

**Use `npm run dev:api` for local development with save functionality!** 🎯
