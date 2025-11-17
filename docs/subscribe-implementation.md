### Formulaires d’abonnement identifiés

- Accueil (CTA) — `src/pages/Index.tsx`
  - Input email: `#home-subscribe-email`
  - Bouton: “S’abonner”
  - Source passé au helper: `home-cta`
- Footer — `src/components/Footer.tsx`
  - Input email: `#footer-subscribe-email`
  - Bouton: “S’abonner”
  - Source passé au helper: `footer`

### Fichiers modifiés / ajoutés

- Ajout: `src/lib/subscribe.ts` — helper partagé `subscribe(email, source)`
- Modif: `src/pages/Index.tsx` — branchement sur le helper + a11y (label sr-only, aria-invalid)
- Modif: `src/components/Footer.tsx` — branchement sur le helper + a11y (label sr-only, aria-invalid)
- Modif: `api/_github.ts` — helpers GitHub (GET/PUT) factorisés pour réutilisation
- Modif: `api/subscribe.ts` — fonction serverless robuste (CORS, OPTIONS, différents backends, fallback 202, logs)

### Variables d’environnement (Vercel)

- Option 1 (webhook direct) — recommmandé
  - `FORMSPREE_ENDPOINT` ou `SUBSCRIBE_WEBHOOK_URL`
- Option 2 (GitHub)
  - `GITHUB_TOKEN` (scope `repo`)
  - `GITHUB_REPO` (ex: `nolwennrobet-lab/source-scribe-design`)
  - `GITHUB_FILE_PATH` (facultatif, défaut: `data/subscribers.csv`)
- (Développement)
  - `VERCEL_ENV=development` (ou `NODE_ENV!=='production'`) — stub 200

### Comportement côté client

- OK (status 200) → toast “Merci !” et champ vidé.
- 202 / non-2xx / réseau / timeout → ouverture d’un brouillon mail:
  - `mailto:nolwennalabrestoise@gmail.com?subject=Abonnement%20newsletter&body=<email>%0A%0A(source:%20<source>%20|%20path:%20<pathname>)`
  - toast “Erreur serveur — envoi par e-mail proposé.”
- Logs: `console.debug("[subscribe]", …)`

### Comportement côté serveur (api/subscribe.ts)

- CORS minimal (`GET,POST,OPTIONS`, `*`) + handler `OPTIONS`.
- POST JSON `{ email, source, path, ua }`.
- Validation email → 400.
- Dev local (non prod) → 200 stub OK.
- Success paths (première correspondance):
  1. `FORMSPREE_ENDPOINT` ou `SUBSCRIBE_WEBHOOK_URL` → POST JSON, retourne 200 si 2xx, sinon même code d’erreur.
  2. `GITHUB_TOKEN` présent → append ligne CSV (`ISO_DATE,email,source,ip,origin,path,ua`) via API contenus GitHub, retourne 200.
  3. Sinon → 202 `{ fallback: "mailto" }`.
- Erreurs: 500 `{ error: "subscribe_failed", reason }` (logs avec email masqué).

### Étapes de test

1) Dev local sans env → `npm run dev` → soumettre email:
   - Réponse 200 (stub), toast “Merci !”, champ vidé.
2) Simuler échec (offline / proxy 500) → mailto s’ouvre, toast fallback.
3) Déploiement avec `FORMSPREE_ENDPOINT` configuré → 200 attendu, pas de mailto.
4) Déploiement avec `GITHUB_TOKEN` + `GITHUB_REPO` → entrée CSV créée.






