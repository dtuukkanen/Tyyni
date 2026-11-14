# Suggestions

[`backend/app/inference/suggestions.py`](../../backend/app/inference/suggestions.py) turns [anomalies](anomalies.md) into a few small practices and stores them in `suggestions`; the user's answers go to `suggestion_feedback`.

## Practices

The practices (`CATALOG`) match the ones in the app. Each anomaly kind lists its practices best first (`FOR_KIND`):

| Anomaly | Practices, best first |
|---|---|
| `stress` | box breathing, double inhale sigh, slow walk, body scan, calm sounds |
| `short_sleep` | screen-free wind-down, earlier night, short rest, body scan |
| `long_sleep` | morning daylight, regular wake-up, slow walk, reach out to a friend |
| `sleep_shift` | screen-free wind-down, morning daylight, regular wake-up, phone-free hour<br/>led by a late wake-up: morning daylight, regular wake-up, slow walk |
| `low_activity` | slow walk, nearby nature, stretch |
| `screen_time` | phone-free hour, nearby nature, screen-free wind-down, grounding |
| `low_mood` | nearby nature, reach out to a friend, writing it down, grounding, calm sounds |

Critical anomalies can also get a support practice ahead of these; see below.

## How a day is chosen

A day gets **at most 3 suggestions**, answering the anomalies of that day and the day before (heart rate and steps are judged once a day is over).

1. **Merge.** A kind that fired on both days counts once, as today's anomaly.
2. **Critical first.**
   - A very low mood (`very_low`) gets *talk to someone today*, with the MIELI crisis line and 112, ahead of everything else and every day while it lasts.
   - Another critical low mood, or a critical anomaly with several signals at once (`multiple_signals`), gets *reach out to a friend* first.
   - A critical anomaly that is only `sustained` or `extreme` gets no support practice, so a long stress week doesn't nudge the user to message someone every day.
3. **Take turns.** Two anomalies get one practice each before either gets a second. An anomaly that already has suggestions gets no more.
4. **Avoid repeats.** A practice suggested in the 2 days before waits until the others are used up.

Making suggestions again on the same day only adds ones for new anomalies, so the list the user already saw stays put. A suggestion keeps its `reason` (the anomaly's summary) even after re-detection removes its anomaly.

## Feedback

Feedback reorders the practices per user: each is ranked by the share of times it helped, smoothed towards one half, where skipping it counts as half a "didn't help". Three "helped" lift a practice about three places; three "didn't help" drop it as far.

## Running it

```bash
docker compose run --rm migrate python -m app.inference.suggestions --user <id> --day 2026-11-14
```

From Python, `suggestions.choose(anomalies, history, day)` is pure (anomalies and earlier suggestions with their feedback in, new suggestions out), and `suggestions.suggest(session, user_id, day)` detects, stores and returns the day's suggestions. Over the API: `POST /users/{id}/suggestions`.

Over 5 seeds of the 21-day scenarios with every simulator, a stable user gets no suggestions; `stress_period` gets them on about 7 days, led by box breathing and the double inhale sigh; `oversleep` on about 8, led by morning daylight and a regular wake-up.
