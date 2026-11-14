# Sleep simulator

[`backend/app/simulators/sleep.py`](../../backend/app/simulators/sleep.py) writes one `sleep_sessions` row per night, tagged `simulator:sleep:<scenario>`. `--days 21` gives 21 sessions, one for each wake day (a session counts toward the day the user wakes up).

Each night has:

- bedtime and wake jitter;
- an efficiency (time asleep / time in bed);
- `stages` in minutes (`deep`, `rem`, `light`, `awake`, summing to the time in bed). Deep sleep stays fairly constant, so short nights mostly lose REM.

## Scenarios

| Scenario | What it produces |
|---|---|
| `stable_good` / `stable_average` / `stable_poor` | 22:45–07:00 at 92 % / 23:00–07:00 at 88 % / 23:45–06:45 at 78 % efficiency; the poor sleeper is also less regular |
| `weekend_shift` | Friday and Saturday nights: bed 1.5 h later, wake 2 h later (social jetlag) |
| `late_sleep_shift` | Same as the HRV scenario: bedtime 30 min later each night (up to +3 h), wake only 0.8× as much later, so nights get shorter |
| `oversleep` | From the first third, ramps over 5 nights to bed +1.5 h and wake +3.5 h: about 10 h in bed, lower efficiency |
| `stress_period` | Same timeline as the HRV scenario: later to bed, earlier awake, efficiency −15 points, less deep sleep, more irregular |
| `short_night` | One ~3.5 h night (02:30–06:00) waking on the HRV `sudden_drop` day, then a longer rebound night |

`--artifacts` drops about 10 % of the nights (watch off); the remaining nights are unchanged.

## Writing the other signals from the same nights

The sleep simulator can also write the signals that depend on sleep, lined up with these exact nights:

| Option | Writes | Scenario picked | Override |
|---|---|---|---|
| `--with-hrv` | [HRV + heart rate](hrv.md) whose night rise follows these nights (poorer nights restore less) | `stable_good` → `stable_high`, `stable_poor` → `stable_low`, `short_night` → `sudden_drop`, same name for `stress_period` / `late_sleep_shift`, otherwise `stable_average` | `--hrv-scenario` |
| `--with-activity` | [Steps](activity.md) that stop while asleep and follow these wake times | `stable_good` → `stable_active`, `stable_poor` → `stable_sedentary`, `short_night` → `sudden_drop`, same name for `stress_period` / `oversleep` / `late_sleep_shift`, otherwise `stable_average` | `--activity-scenario` |
| `--with-screen` | [Screen time](screen.md) that stops at these bedtimes and follows these wake times | as for activity, with `stable_light` / `stable_heavy` | `--screen-scenario` |

```bash
docker compose run --rm migrate python -m app.simulators.sleep --new-user demo --scenario oversleep --days 21 --seed 1 --with-hrv --with-activity --with-screen
```

From Python, pass `nights=sleep.nights(start, days, scenario, seed=...)` to any other simulator's `generate` or `simulate` to get the same effect.
