# Timeline Dashboard

## What changed

This package replaces the existing Timeline page with an interactive month-by-month dashboard.

### Included features

- GitHub-style annual month activity grid
- Click any month to show its games
- Monthly game cards with cover, date, status, platform, hours, and rating
- Filters for year, platform, genre, franchise, and status
- Year totals for games and recorded hours
- Responsive desktop and mobile layouts
- Empty-state messaging when no games match

## Date behavior

- Completed games use `dateCompleted`.
- Other statuses use `dateStarted` when available.
- When no start date exists, the library-added date is used.
- The default status filter is Completed, so the first view behaves as a completion timeline.

## Files to replace

Copy these paths into the root of your Game Vault project:

```text
app/timeline/page.tsx
components/timeline/TimelineDashboard.tsx
```

## Required commands

No migration and no new npm package are required.

Run:

```bash
npm run build
```
