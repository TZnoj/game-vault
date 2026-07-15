# Game Vault — Year Comparison

## Files to replace/add

Copy these files into the matching locations in your Game Vault project:

- `app/years/page.tsx`
- `components/year-comparison/YearComparisonDashboard.tsx`
- `components/NavBar.tsx`

The NavBar change adds a **Years** link pointing to `/years`.

## What this adds

- Year summary cards for games, hours, average rating, and average game length
- Multi-year selection controls
- Comparison graphs for games, hours, and average rating
- Genre distribution comparison
- Platform comparison
- Automatically generated personal trend statements
- Current-year comparisons use the same calendar period from the prior year
- Unique-title counting, so duplicate physical/digital copies do not inflate annual totals
- Timezone-safe completion-year handling

## Calculation notes

- A game is assigned to a year using its `dateCompleted` calendar year.
- Only entries with status `COMPLETED` and a completion date are included.
- The same title is counted once per year even when multiple copies exist.
- Hours use `hoursPlayed` from the selected completed copy.
- Average rating uses the latest review on that completed copy.
- A game can count toward multiple genres when it has multiple genre tags.
- Platform distribution uses the platform selected on the completed copy.

## Commands

No migration or extra npm dependency is required.

Run:

```bash
npm run build
```
