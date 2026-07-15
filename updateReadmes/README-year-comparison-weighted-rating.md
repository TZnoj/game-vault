# Year Comparison — Square-Root Time-Weighted Rating

## Files to add or replace

- `app/years/page.tsx`
- `components/year-comparison/YearComparisonDashboard.tsx`

## What changed

- Keeps the previous rating-trend consistency fix.
- Adds a **Time-weighted rating** to every year card.
- Adds a separate Time-weighted Rating comparison graph.
- Adds a time-weighted rating statement to Personal Trends.

## Formula

Each rated game's weight is:

`weight = sqrt(time)`

The yearly value is:

`sum(rating × sqrt(time)) / sum(sqrt(time))`

Time uses:

1. Recorded hours played.
2. HLTB Main when recorded hours are unavailable.
3. A neutral one-hour fallback when neither value exists.

This makes longer games count more than short games, but prevents a single extremely long game from dominating the entire year.

## Installation

Copy the included files into the matching paths in your Game Vault project, then run:

```bash
npm run build
```

No Prisma migration or new npm dependency is required.
