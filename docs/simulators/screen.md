# Screen time simulator

[`backend/app/simulators/screen.py`](../../backend/app/simulators/screen.py) writes phone screen time into `screen_samples` (minutes the screen was on, one row per 15 min by default), tagged `simulator:screen:<scenario>`. Screen time comes from the phone, not the wearable, so it has its own table; a rerun of the activity or screen simulator never touches the other's rows.

Each day has a budget (the person's usual screen time, the scenario, a small weekend lift and day-to-day noise) spread over the waking day:

- a check in bed right after waking, a lunch bump, a rise through the evening, and scrolling in bed in the hour before sleep;
- minute by minute the screen is on or off in sessions of about 2 minutes, so use comes in realistic bursts;
- nothing while asleep. The nights are the built-in 23:00–07:00 UTC or the real nights from the [sleep simulator](sleep.md); minutes after midnight before a late bedtime still count as the previous evening.

## Scenarios

| Scenario | What it produces |
|---|---|
| `stable_light` / `stable_average` / `stable_heavy` | Steady ≈ 2 / 3.5 / 5.4 h a day |
| `stress_period` | Same timeline as the HRV scenario: about +60 % while the stress holds (≈ 5.5 h), then recovers |
| `withdrawal` | Same ramp as the activity scenario: rising to about double (≈ 7 h) by the end, the time steps were lost to |
| `sudden_drop` | About +80 % on the HRV / activity `sudden_drop` day, recovering over ~3 days |
| `late_sleep_shift` | The phone stays on as bedtime slips later (up to 3 h): more scrolling in bed, ≈ +25 % in total |
| `oversleep` | Same ramp as the sleep scenario: lying in bed with the phone in the morning, ≈ +25 % in total |

How often these trip the `screen_time` rule is listed under [anomaly detection](../inference/anomalies.md#how-often-it-fires).

## Options

Besides the [shared options](README.md#running-one):

- `--interval` sets the minutes per row (must divide a day); daily totals don't depend on it.
- `--artifacts` drops 1–3 h gaps on about half the days (phone off) and about 3 % of whole days; the remaining rows are unchanged.

```bash
docker compose run --rm migrate python -m app.simulators.screen --new-user demo --scenario withdrawal --days 21 --seed 1
```
