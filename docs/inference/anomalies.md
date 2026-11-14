# Anomaly detection

[`backend/app/inference/anomalies.py`](../../backend/app/inference/anomalies.py) compares each day's metrics with the user's own normal and stores what stands out in `anomalies`. The [suggestions](suggestions.md) are built on top of them.

## Rules

| Kind | Fires on |
|---|---|
| `stress` | HRV ≥ 25 % lower, or heart rate ≥ 6 bpm higher |
| `short_sleep` / `long_sleep` | Time in bed ≥ 90 min shorter / longer |
| `sleep_shift` | Bedtime or wake time ≥ 1.5 h later |
| `low_activity` | Steps ≥ 40 % fewer |
| `screen_time` | Screen time ≥ 40 % more |
| `low_mood` | Mood check-ins have dropped; it has its [own rule](#low-mood) |

A rule fires when the metric is at least **2.5 spreads** from the baseline *and* moves by at least the change in the table, so a very steady user isn't flagged for trivia. `low_activity` and `screen_time` are relative because an absolute amount is noise for one user and a big change for another.

## Baseline

- The baseline for a day is the **median of the 14 days before it**; its spread is the median absolute deviation.
- Days on which an anomaly fired are left out, so a stress week neither becomes the new normal nor hides itself by widening the spread.
- A metric is judged once it has 7 normal days with data. A lasting change becomes the new normal after about two weeks.
- Gradual drifts (`withdrawal`, `late_sleep_shift`) are caught only partly, since the baseline moves with them.

## Escalation

An anomaly is `attention`, or `critical` when it is:

- `extreme`: a metric is at least 4 spreads out and moves by twice the minimum change,
- `sustained`: the same kind fired 3 days in a row,
- `multiple_signals`: 3 or more kinds fired on the same day.

## What is stored

One row per day and kind. `metric` / `value` / `baseline` hold the most deviating metric. `explanation` holds a `summary` ("HRV 31 ms vs usual 47 ms (-34 %); heart rate 76 bpm vs usual 64 bpm (+12 bpm)"), every `signal` that fired with its `z`, and `escalation`.

## When it runs

Detection is explicit: run it after writing data. A rerun updates anomalies in place (they keep their id) and removes ones that no longer fire. Heart rate and steps are judged only once a day is over (a half day always looks inactive), so today only gets sleep and mood anomalies.

```bash
docker compose run --rm migrate python -m app.inference.anomalies --user <id> --days 21
```

From Python, `anomalies.find(daily_rows, start, end, today=...)` is pure (rows of `repository.daily_metrics` in, anomaly rows out), and `anomalies.detect(session, user_id, start, end)` reads, stores and returns them. Over the API: `POST /users/{id}/anomalies/detect`.

## Low mood

The 1-tap mood is one score from 1 to 5 a day, too coarse for a median and its absolute deviation: a user who always taps 4 would get a critical anomaly from a single 2, and one who wobbles between 3 and 5 would never be flagged. So `low_mood` compares two means on each day with a check-in:

- **recent mood**: the mean of the last 3 check-ins within 4 days;
- **usual mood**: the mean and standard deviation (at least 0.5) of the normal check-ins in the 14 days before those 4, so the first low days of a dip don't drag it down before it fires. It needs 7 such check-ins.

It fires on any of:

| Trigger | Condition |
|---|---|
| Dip | Today's check-in and the recent mood are both ≥ 1 point below usual, and the recent mood is ≥ 1.5 deviations below it. One bad check-in among good ones is not a dip |
| Sharp drop | Today's check-in alone is ≥ 2 points and ≥ 3 deviations below usual (a bad day for a steady user, not for a wobbly one) |
| Very low | The last 3 check-ins average 1.5 or less. Needs no usual mood and never becomes the new normal, so a new user or a slow decline (`crisis`) is still caught |

It is `critical` when it is very low (`very_low`) or the recent mood is ≥ 2 points below usual (`extreme`), besides `sustained` and `multiple_signals`. The signal stores today's check-in as `value`, the usual mood as `baseline` (`null` without one) and the recent mood as `recent`; its summary reads "mood 2.0/5 vs usual 3.9/5 (-1.9), last 3 check-ins 2.3/5".

## How often it fires

Measured on the 21-day [simulator](../simulators/README.md) scenarios:

| Kind | Stable users | Scenarios it should catch |
|---|---|---|
| `low_mood` (200 seeds) | about 1 run in 8, critical about 1 in 100 (`stable_low` more often, since its user does have runs of 1s) | ~¾ of `stress_period`, ~9 in 10 `crisis` |
| `screen_time` (100 seeds) | 0–9 % of runs, never critical | 93 % of `stress_period`, 91 % of `withdrawal`, every `sudden_drop` |
