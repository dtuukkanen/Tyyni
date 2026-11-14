# Mood simulator

[`backend/app/simulators/mood.py`](../../backend/app/simulators/mood.py) writes the daily 1-tap check-in into `mood_checkins`, tagged `simulator:mood:<scenario>`, so the inference and learning loop have the user's own ground truth to work with.

- **When:** on about 85 % of days, once in the evening, 0.5–2.5 h before bed and never after midnight UTC, so the check-in counts toward its own day.
- **Score:** a latent mood rounded to 1–5, made of the person's usual level, the scenario's shift, last night's sleep (a poor night lowers it), a small weekend lift, and day-to-day noise that carries over (a bad day tends to follow a bad day).

With `nights=sleep.nights(...)` from Python, the check-ins are timed before the simulated bedtimes and each night's efficiency moves the next day's mood.

## Scenarios

| Scenario | What it produces |
|---|---|
| `stable_good` / `stable_average` / `stable_low` | Steady mood ≈ 4.0 / 3.4 / 2.5 |
| `stress_period` | Same timeline as the HRV scenario: about −1.3 while the stress holds, then recovers |
| `withdrawal` | Same ramp as the activity scenario: mood down about −1.2 by the end, and check-ins drop to about half |
| `sudden_drop` | About −2 on the HRV / activity `sudden_drop` day, recovering over ~3 days |
| `late_sleep_shift` / `oversleep` | Follow the sleep scenarios: up to about −0.5 / −0.8 by the end |
| `crisis` | Same ramp as the journal scenario: mood falls to 1–2 by the end, and check-ins get rarer |

## Options

Besides the [shared options](README.md#running-one):

- `--artifacts` drops 2–4 day streaks (app not opened) and adds the odd double tap (the same score again a minute later); the other check-ins are unchanged.
- Replacing keeps check-ins made in the app (`source = 'app'`).

```bash
docker compose run --rm migrate python -m app.simulators.mood --new-user demo --scenario stress_period --days 21 --seed 1
```
