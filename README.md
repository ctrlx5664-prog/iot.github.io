## ctrlx (exportable Replit project)

This repo contains:
- **Frontend**: React + Vite (`client/`)
- **Backend API**: Express (`server/`)
- **DB**: Postgres (Neon) via Drizzle, enabled when `DATABASE_URL` is set

### Run locally

You need **Node.js 20+** (so you have `npm` available).

Install:

- `npm install`

Start dev (Vite + Node server):

- `npm run dev`

### Database (Neon)

1. Create a Neon Postgres database.
2. Copy the **connection string** (this is *not* the Neon console login URL).
3. Set `DATABASE_URL` in your environment (see `env.example`).
4. Push schema:

- `npm run db:push`

If `DATABASE_URL` is not set, the app will fall back to in-memory storage.

### Deploy backend to Netlify (API only)

This repo includes:
- `netlify.toml` (backend-only: functions + `/api/*` redirect)
- `netlify/functions/api.ts` (wraps the Express API as a Netlify Function)

Netlify settings:
- **Build command**: (already set in `netlify.toml`)
- **Publish directory**: `public`
- **Functions directory**: `netlify/functions`

Required environment variables on Netlify:
- `DATABASE_URL` (Neon connection string)
- `CORS_ORIGIN` (your frontend URL, e.g. `https://your-frontend.com`)

Notes:
- WebSockets are **disabled by default in production** because Netlify Functions do not support long-lived WS connections.

### Frontend hosted elsewhere

Set this environment variable in your frontend build:
- `VITE_API_BASE_URL=https://<your-netlify-backend>.netlify.app`

Then the frontend will call:
- `https://<your-netlify-backend>.netlify.app/api/...`

### Frontend on GitHub Pages

This repo includes `.github/workflows/deploy-pages.yml` which builds the Vite app and deploys `dist/public` to GitHub Pages.

1. In GitHub: **Settings → Pages** → set **Source** to **GitHub Actions**
2. In GitHub: **Settings → Secrets and variables → Actions → Variables**
   - Add `VITE_API_BASE_URL` = `https://<your-netlify-backend>.netlify.app`
3. Push to `main` and the workflow will deploy.

Notes:
- GitHub Pages serves under `/<repo>/`, so the build uses `VITE_BASE="/<repo>/"`.
- GitHub Pages has no SPA rewrites, so the build uses hash routing (`VITE_ROUTER_MODE=hash`), meaning URLs look like `.../#/companies`.


