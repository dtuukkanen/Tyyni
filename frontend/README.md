# Tyyni

Mobile-first Next.js calming wellness companion built on the **Somatic Serenity** design system fetched from Google Stitch (`designs/stitch/`).

Includes four interactive sections switchable from the bottom navigation:
- **Today**: Somatic arrival check-in, Low-Energy Mode sanctuary toggle, guilt-free micro-steps, and Gentle Circle check-ins.
- **Ground**: Guided Box Breathing & Somatic Rhythm Pacer, synthesized Web Audio Sound Sanctuary, Nearby Nature sanctuary view, Body Scan, Mat Stretch, Slow Walk, and 1-Tap SOS Breathing.
- **Wins**: Today’s Sanctuary Jar, one-tap micro-victory suggestions, custom quiet win logging, and Recent Gentle Moments.
- **Anchor**: Interactive 5–4–3–2–1 Sensory Reset walkthrough, personal somatic anchors, rhythmic grounding phrase counter with spoken audio, 24–30Hz vibroacoustic brown noise, and Emergency Tether support.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app works with sample content when the Python service is not configured. To connect it, set `PYTHON_SERVICE_URL` to the service's private base URL. The Next.js server calls `GET {PYTHON_SERVICE_URL}/dashboard` through `/api/prototype`, so the service address is never exposed to the browser. The endpoint can return a JSON object with optional `displayName`, `dateLabel`, `mood`, `steps`, and `wins` fields. `steps` is an array of `{ "label": string, "complete": boolean }`; `wins` is an array of strings. Adjust the proxy route or client mapping if the Python service uses another endpoint or response shape.

## Deploy (Vercel)

The app is hosted on Vercel's free Hobby plan, which has no paid overage: if a usage limit is hit, the project is paused instead of billed. The Vercel project `tyyni` is connected to this GitHub repository with **Root Directory** `frontend`: every push to `main` deploys to production (https://tyyni-seven.vercel.app), and other branches and pull requests get preview deployments.

`vercel.json` pins the server route `/api/prototype` to `arn1` (Stockholm), the Vercel region closest to the backend in Google Cloud `europe-north1` (Finland). Until `PYTHON_SERVICE_URL` is set in the project's environment variables, the deployment serves the built-in sample content.

To deploy by hand, run the CLI from the repository root (not `frontend/`), since the project's root directory is applied on top of it:

```bash
vercel login
vercel link --project tyyni  # creates .vercel/ (git-ignored)
vercel deploy                # preview deployment
vercel deploy --prod         # production deployment
```
