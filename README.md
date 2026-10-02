# oah-assist-web

Vite + React + TypeScript frontend for OAH Assist (Phase 0 skeleton).

This is a **delta pack**: scaffold a fresh Vite app first, then drop these
files in. That avoids version-pinning guesswork and matches Vite's defaults.

## Setup (scaffold, then apply this pack)

```bash
# 1. Scaffold in place (run inside this folder, or scaffold then copy files in)
npm create vite@latest oah-assist-web -- --template react-ts
cd oah-assist-web
npm install

# 2. Add serve to DEPENDENCIES (runtime, so it survives Heroku's prune)
npm install serve

# 3. Copy the files from this pack over the scaffold:
#    Procfile, .env.development, .env.example,
#    src/lib/api.ts, src/App.tsx, src/styles/global.css
```

Then edit `package.json` and add two scripts (keep the ones Vite generated):

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "heroku-postbuild": "npm run build",
  "start": "serve -s dist -l $PORT"
}
```

Why this split matters on Heroku: the Node buildpack runs `heroku-postbuild`
(which builds `dist/`) and THEN prunes devDependencies. `serve` runs at
runtime via `start`, so it must be in **dependencies**. `vite`/`typescript`
run before the prune, so they can stay in **devDependencies**.

## Run locally

```bash
npm run dev        # http://localhost:5173, calls backend at localhost:8000
```

Start the backend (`oah-assist-api`) too, or the health card shows a CORS/
connection error — which is the round-trip working as designed.

## Deploy to Heroku (dashboard, no CLI)

1. Push this folder to its own GitHub repo.
2. Heroku dashboard -> New -> Create new app (e.g. `oah-assist-web`).
3. **Settings -> Config Vars FIRST**, add:
   - `VITE_API_BASE = https://oah-assist-api.herokuapp.com`
     (the live backend URL; no trailing slash)
   Set this BEFORE the first build — Vite inlines it at build time.
4. Deploy tab -> GitHub -> connect repo -> Enable Automatic Deploys (main).
5. Deploy Branch. Heroku runs `heroku-postbuild` to build, then `start`
   to serve `dist/` via `serve`.
6. Open the app; the health card should say "Connected".

## Deploy order (important)

Backend first -> copy its URL -> set `VITE_API_BASE` here -> then build/deploy
frontend. If you set the var after a build, redeploy so it takes effect.
