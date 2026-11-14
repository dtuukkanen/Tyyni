# Activity simulator

[`backend/app/simulators/activity.py`](../../backend/app/simulators/activity.py) writes steps into `activity_samples` (one row per 15 min by default), tagged `simulator:activity:<scenario>`.

Steps are simulated minute by minute:

- low-cadence incidental movement spread over the waking day;
- walks at ~110 steps/min: two commutes on weekdays (about 1 h and 10 h after waking), a midday walk on most weekend days, and sometimes an evening exercise walk;
- nothing while asleep. The nights are the built-in 23:00–07:00 UTC or the real nights from the [sleep simulator](sleep.md), and the walks move with each day's wake time.

`active_minutes` counts the minutes with at least 100 steps (brisk walking). Screen time has its [own simulator](screen.md).

## Scenarios

| Scenario | What it produces |
|---|---|
| `stable_active` / `stable_average` / `stable_sedentary` | Steady ≈ 12k / 7k / 3.5k steps a day (≈ 50 / 25 / 10 active minutes) |
| `stress_period` | Same timeline as the HRV scenario: fewer steps and almost no exercise (about −35 %), then recovers |
| `withdrawal` | From the first third, a gradual decline to under half the steps: exercise stops, walks shrink (staying home) |
| `sudden_drop` | One near-bed-rest day (~20 % of the steps, no active minutes) on the HRV `sudden_drop` day, recovering over ~3 days |
| `late_sleep_shift` | The day follows the HRV scenario's later wake times (up to ~2.4 h later), slightly less exercise |
| `oversleep` | Same ramp as the sleep scenario: about −30 % incidental steps and little exercise |

## Options

Besides the [shared options](README.md#running-one):

- `--interval` sets the minutes per row (must divide a day); daily totals don't depend on it.
- `--artifacts` drops 1–3 h gaps on about half the days and about 5 % of whole days (device not carried); the remaining rows are unchanged.

```bash
docker compose run --rm migrate python -m app.simulators.activity --new-user demo --scenario withdrawal --days 21 --seed 1
```
