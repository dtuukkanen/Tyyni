# Tyyni

Mobile-first Next.js calming wellness companion built on the **Somatic Serenity** design system fetched from Google Stitch (`designs/stitch/`).

Includes four interactive sections switchable from the bottom navigation:
- **Today**: 2D cute **Companion World** sanctuary featuring layered environment hills & trees, slowly scrolling storybook clouds, and an animated potted flower companion (*Bloomie*), paired with frosted glass greeting & arrival check-in, an optional adaptive behavioral nudge space (transforming `"Good morning"` into suggestive prompts such as taking a walk, guided meditation, or messaging a friend with a 1-tap quick-action CTA when backend behavioral changes arrive), Low-Energy Mode toggle, dynamic scroll blur/tint, guilt-free micro-steps, and Gentle Circle check-ins.
- **Ground**: Guided Box Breathing & Somatic Rhythm Pacer, synthesized Web Audio Sound Sanctuary, Nearby Nature sanctuary view, Body Scan, Mat Stretch, Slow Walk, and 1-Tap SOS Breathing.
- **Wins**: Today’s Sanctuary Jar, one-tap micro-victory suggestions, custom quiet win logging, and Recent Gentle Moments.
- **Anchor**: Interactive 5–4–3–2–1 Sensory Reset walkthrough, personal somatic anchors, rhythmic grounding phrase counter with spoken audio, 24–30Hz vibroacoustic brown noise, and Emergency Tether support.
- **PWA & Offline Ready**: Web App Manifest (`app/manifest.ts`) with custom Bloomie icons (`192x192`, `512x512`, `maskable`, and `180x180` Apple touch icon), home-screen shortcuts (`SOS Calm`, `Ground`, `Anchor`), safe-area standalone framing, and a Service Worker (`public/sw.js`) that caches the Sanctuary app shell and static assets for offline grounding.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app works with sample content when the Python service is not configured (and lets you preview Today behavioral nudges via `?nudge=walk|meditate|friend|sleep` or the Sanctuary Sheet). To connect the FastAPI backend, set `PYTHON_SERVICE_URL` (and optionally `PYTHON_SERVICE_API_KEY` and `PYTHON_SERVICE_USER_ID`). The Next.js server proxies through `/api/prototype`: `GET /api/prototype` resolves the active user (`?userId=...`, `PYTHON_SERVICE_USER_ID`, or the first user from `GET /users`), queries `GET /users/{user_id}/today` (triggering `POST /users/{user_id}/suggestions` when behavioral suggestions are empty), and falls back to `GET /dashboard` or sample content if unavailable; `POST /api/prototype` forwards suggestion feedback (`done`, `helped`) to `POST /users/{user_id}/suggestions/{suggestion_id}/feedback`.

## Deploy (Vercel)

The app is hosted on Vercel's free Hobby plan, which has no paid overage: if a usage limit is hit, the project is paused instead of billed. The Vercel project `tyyni` is connected to this GitHub repository with **Root Directory** `frontend`: every push to `main` deploys to production (https://tyyni-seven.vercel.app), and other branches and pull requests get preview deployments.

`vercel.json` pins the server route `/api/prototype` to `fra1` (Frankfurt), next to the Python service (Vercel project `tyyni-api`, also `fra1`) and its Neon database (`aws-eu-central-1`). The route calls `PYTHON_SERVICE_URL` with `PYTHON_SERVICE_API_KEY` in the `X-API-Key` header; until `PYTHON_SERVICE_URL` is set, the deployment serves the built-in sample content.

To deploy by hand, run the CLI from the repository root (not `frontend/`), since the project's root directory is applied on top of it:

```bash
vercel login
vercel link --project tyyni  # creates .vercel/ (git-ignored)
vercel deploy                # preview deployment
vercel deploy --prod         # production deployment
```
