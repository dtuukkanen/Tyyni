# Tyyni

Mobile-first Next.js calming wellness companion built on the **Somatic Serenity** design system fetched from Google Stitch (`designs/stitch/`).

Includes five interactive sections switchable from the bottom navigation:

- **Today**: 2D cute **Companion World** sanctuary featuring layered environment hills & trees, slowly scrolling storybook clouds, and an animated potted flower companion (_Bloomie_), paired with frosted glass greeting & arrival check-in, an optional adaptive behavioral nudge space (transforming `"Good morning"` into suggestive prompts such as taking a walk, guided meditation, or messaging a friend with a 1-tap quick-action CTA when backend behavioral changes arrive), Low-Energy Mode (a calmer, less colourful world, basic-needs steps, and one-tap supports: a slow-exhale breath, soft brown noise, and telling your circle you're resting), Bloomie speaking in first person and growing a leaf per tended step, a feelings info popover on the arrival check-in, dynamic scroll blur/tint, guilt-free micro-steps, and Gentle Circle check-ins that show each friend's feeling and a note, with per-person warmth.
- **Ground**: Guided Box Breathing & Somatic Rhythm Pacer (shown only for breathing practices), synthesized Web Audio Sound Sanctuary, Nearby Nature walk guide, and step-by-step timed guides for Body Scan, Mat Stretch, Slow Walk, plus 1-Tap SOS Breathing.
- **Wins**: Visual **Sanctuary Jar** illustration that fills with colorful pebbles alongside a live mini Bloomie, 1-tap visual quick-win tiles, custom win input, and a compact recent log.
- **Journal**: One quiet page to write on: a single text box and a Save button, with no prompts, tags or history to re-read. The unsent draft stays on the device, so leaving the tab loses nothing; the backend `journal` suggestion opens this tab.
- **Anchor**: Category-navigable **Anchors** (`All`, `Senses`, `Audio`, `SOS`) with icon-driven 5–4–3–2–1 Sensory Reset tiles, 24–30Hz Purr & Brown Noise, a 5-dot grounding phrase counter with spoken audio, personal tactile anchors with step-by-step guides, and High Distress fast resets.
- **PWA & Offline Ready**: Web App Manifest (`app/manifest.ts`) with custom Bloomie icons (`192x192`, `512x512`, `maskable`, and `180x180` Apple touch icon), home-screen shortcuts (`SOS Calm`, `Ground`, `Anchor`), safe-area standalone framing, and a Service Worker (`public/sw.js`) that caches the Sanctuary app shell and static assets for offline grounding.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app works with sample content when the Python service is not configured (and lets you preview Today behavioral nudges via `?nudge=walk|meditate|friend|sleep` or the Sanctuary Sheet). To connect the FastAPI backend, set `PYTHON_SERVICE_URL` (and optionally `PYTHON_SERVICE_API_KEY` and `PYTHON_SERVICE_USER_ID`). The Next.js server proxies through `/api/prototype`: `GET /api/prototype` resolves the active user (`?userId=...`, `PYTHON_SERVICE_USER_ID`, or the first user from `GET /users`), queries `GET /users/{user_id}/today` (triggering `POST /users/{user_id}/suggestions` when behavioral suggestions are empty), and falls back to `GET /dashboard` or sample content if unavailable; `POST /api/prototype` forwards suggestion feedback (`done`, `helped`) to `POST /users/{user_id}/suggestions/{suggestion_id}/feedback`; `POST /api/journal` forwards `{text}` to `POST /users/{user_id}/journal`.

## Bloomie growth

Bloomie mirrors today's tasks live: the checklist on Today (**Tiny Steps**, or **Just the Basics** in Low-Energy mode) plus any wins logged in the **Sanctuary Jar** (Wins tab), where each logged win counts as one more done task.

- **Thirsty** (nothing done yet): drooping olive stems with brown-tipped leaves, pale buds, dry cracked soil, fallen leaves, a sleepy face and a thought bubble asking for water; on the companion pill Bloomie says "I'm a little thirsty. One tiny step would perk me up." Low-Energy mode never shows Thirsty: Bloomie rests at Perking up ("nothing needs to grow today"), and tending all the basics still brings it to full bloom.
- **Perking up** (some done): a shower waters the soil, the stems spring upright, the leaves turn green, new shoots grow and the pot smiles.
- **Flourishing** (everything done): the buds burst into flowers, vines spill over the rim, petals scatter, the aura turns golden and a butterfly visits.

A mini Bloomie at the top of the Tiny Steps card shows the same state (with how many are done), so the change is visible while you check steps off; the big one in the scene changes too. Checking a step plays the move up with a toast; unchecking one moves Bloomie back down, and adding a new step means it isn't all done anymore. Mood check-ins, waves and suggestions still make Bloomie bounce but don't change its state. The logic lives in `app/components/useBloomieGrowth.ts`, the drawing in `FlowerCompanion` (`app/components/CompanionWorld.tsx`) and the states and motion in the Bloomie growth rules of `app/globals.css`.

To preview a state without changing tasks, open the settings sheet (the profile button, top right) and use **Bloomie Growth**:

- **Live** follows your steps and wins (the default).
- **Thirsty**, **Perking up** or **Flourishing** shows that state; moving up plays the full transition (watering shower, petal burst). The sheet closes and switches to Today first, so the change plays in view.
- **Play all** starts Thirsty and changes state every 4 s up to Flourishing, without toasts; tap it again to restart.

The same previews work as URL parameters for screen recordings: `?growth=0`, `?growth=1` or `?growth=2` pins a state and `?growth=play` plays them all. While a preview is active, your tasks don't move Bloomie. On load the flower jumps straight to its state without animating.

## Lint and format

[Oxlint](https://oxc.rs/docs/guide/usage/linter) and [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) keep the code clean; CI runs both on every pull request.

```bash
npm run lint          # oxlint, fails on warnings
npm run lint:fix      # apply safe fixes
npm run format        # format in place
npm run format:check  # what CI runs
```

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
