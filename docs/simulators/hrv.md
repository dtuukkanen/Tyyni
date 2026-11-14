# HRV + heart rate simulator

[`backend/app/simulators/hrv.py`](../../backend/app/simulators/hrv.py) writes RMSSD and heart-rate samples (every 5 min by default, `--interval`) into `heart_samples`, tagged `simulator:hrv:<scenario>`.

Every scenario has:

- a night-time HRV rise, during the built-in 23:00–07:00 UTC night or the real nights from the [sleep simulator](sleep.md);
- day-to-day and within-day noise;
- heart rate that moves inversely to HRV.

## Scenarios

| Scenario | What it produces |
|---|---|
| `stable_high` / `stable_average` / `stable_low` | Steady person with RMSSD ≈ 75 / 45 / 22 ms (resting HR ≈ 55 / 63 / 72) |
| `rising` / `lowering` | HRV goes up / down by about ±25 % |
| `alternating` | Good / bad swings of about ±20–25 % |
| `stress_period` | Normal first third, drops to ~60 % over 2 days, holds, recovers over 3 days |
| `sudden_drop` | Normal, then one day at ~50 % and an exponential recovery |
| `late_sleep_shift` | Bedtime moves 30 min later each night (up to +3 h), so the night HRV peak shifts later |

## Options

Besides the [shared options](README.md#running-one):

- `--timescale days|intraday` (for `rising`, `lowering`, `alternating`): `days` shapes the whole period, so the daily averages move; `intraday` repeats the shape within each day's waking hours and leaves the daily averages flat.
- `--artifacts` adds sensor noise: 1–3 h gaps (watch off) and occasional spikes.

```bash
docker compose run --rm migrate python -m app.simulators.hrv --new-user demo --scenario stress_period --days 21 --seed 1
```
