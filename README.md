# Naiadex — Web (`naiadex-web`)

The frontend for **Naiadex**, a citizen-science companion for urban streams built for the
IEEE OneAquaHealth Global Hackathon 2026. It's a single-page app that talks to the
Naiadex API.

## What it does

- **Identify** — snap a stream organism, AI names it, you confirm or correct it, and the
  community can suggest alternatives and comment. Filterable dex with Grid and Map views.
- **Assess** — a lightweight guided flow (site → photos → a few human-only answers →
  submit) that hands off to the backend's async AI assessment. You watch findings fill in
  under **My submissions**, then review and finalize.
- **Explore** — browse finalized assessments shared by everyone, filtered by rubric
  criteria (channel, banks, water, vegetation, pressures), overall health, and location.
- **About** and **Feedback**.

Everything is structured around a **feature registry** — each feature is one entry, and
the shell (header, tabs) renders from it. Adding a feature is one registry line.

## Stack

- **Vite + React + TypeScript**, vanilla CSS Modules (no Tailwind)
- **Mapbox GL** — site picker, observation/assessment maps, location picker, geocoding
- **react-markdown** — renders the AI synthesis

## Project structure

```
src/
  main.tsx, App.tsx          # mount + shell (header, feature tabs, tagline)
  styles/global.css          # design tokens (aqua theme) + resets
  lib/
    api.ts                   # every backend call, typed. Keep exports in sync with imports!
    types.ts                 # TS mirror of backend schemas
    user.ts                  # username (localStorage; no auth — it's a demo label)
    admin.ts                 # admin token storage
    geo.ts                   # haversine distance
    limits.ts                # upload size caps
  hooks/usePolling.ts        # polls while a submission is processing
  components/
    SiteMap.tsx              # reusable Mapbox map (markers, polygons, fly-to) — used everywhere
    LocationPicker.tsx       # draggable pin + GPS + address search + raw lat/lng
    KebabMenu.tsx
  features/
    registry.tsx             # THE extension point — one entry per feature
    identify/                # capture, dex (filters + grid/map), observation detail, community loop
    assess/                  # the site→photos→details→submit flow (+ reducer, localStorage draft)
    submissions/             # list + live-polling detail + review/override + finalize
    explore/                 # feed + rubric-driven sidebar filters + detail (map, photos, synthesis)
    about/  feedback/
```

### Patterns worth knowing

- **Config-driven filters.** Both the identify dex (`filters.ts`) and Explore
  (`exploreFilterConfig.ts`) filter from a declarative config. Explore's rubric filters
  pull their options from the live rubric — add a question key to the config list and it
  becomes a working filter with no UI changes.
- **`SiteMap` is generic and reused** by the site picker, Explore detail, the dex map, and
  the observation detail. It falls back to a graceful placeholder if the Mapbox token is
  missing, so a missing token never crashes a view.
- **Photos are base64 data URIs**, compressed client-side before upload; video is read
  as-is (capped). A combined size cap is enforced before submit.
- **Async assessment** is consumed by polling `GET /submissions/{id}` while `processing`,
  so findings appear group-by-group.

## Running locally

Scaffold-then-layer (this repo is built on a standard Vite `react-ts` scaffold):

```bash
npm install
npm install serve            # runtime static server for Heroku (in dependencies)
npm run dev                  # http://localhost:5173
```

Run the backend (`oah-assist-api`) too, or API calls fail.

### Environment variables

`VITE_*` vars are **inlined at build time**, so they must be set *before* `vite build`.

Create `.env.development` for local dev:

```
VITE_API_BASE=http://localhost:8000
VITE_MAPBOX_TOKEN=pk.your_public_token
```

| Variable | Purpose |
|---|---|
| `VITE_API_BASE` | backend base URL, no trailing slash |
| `VITE_MAPBOX_TOKEN` | Mapbox public token (maps + geocoding). If absent, maps degrade to a placeholder and location falls back to manual entry |

## Deploy (Heroku, dashboard / no CLI)

1. Push this repo to GitHub.
2. Heroku → New → Create app (e.g. `naiadex-web`).
3. **Settings → Config Vars FIRST** — set `VITE_API_BASE` to the live backend URL and
   `VITE_MAPBOX_TOKEN`. These must exist *before* the build, or they won't be baked in.
4. Deploy tab → connect GitHub → Enable Automatic Deploys (`main`) → Deploy.

Heroku builds with `heroku-postbuild` (`vite build`) then serves `dist/` via the
`Procfile`:

```
web: serve -s dist -l $PORT
```

**Deploy order:** backend first → copy its URL → set `VITE_API_BASE` here → then build.

## Gotchas worth knowing

- **`serve` goes in `dependencies`, not devDependencies** — the Node buildpack prunes dev
  deps after the build, but `serve` runs at runtime. `vite`/`typescript` stay in dev.
- **`VITE_*` is build-time** — setting a Config Var after a build doesn't take effect until
  the next deploy.
- **No two files differing only by case** in a folder — `ExploreFilters.tsx` (component)
  vs `exploreFilterConfig.ts` (config) are named distinctly on purpose; a case-only clash
  breaks imports on case-insensitive filesystems and bundlers.
- **`api.ts` exports must match imports** — a component importing a name `api.ts` doesn't
  export makes the whole module fail to load (blank screen). The console names the missing
  export.
- **Login is a demo label, not auth** — a username is stored in localStorage and attributes
  your finds/assessments; there's no password or identity protection.