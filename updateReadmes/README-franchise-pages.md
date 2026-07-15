# Franchise Pages Upgrade

## Files to replace

Copy this file into the matching location in your Game Vault project:

- `app/franchise/[id]/page.tsx`

## What changed

- Expanded franchise overview with unique game counts.
- Added Completed, Playing, Backlog, On Hold, and Dropped totals.
- Added a prominent completion percentage and progress bar.
- Added average rating, best game, worst game, and average completed-game hours.
- Added a release timeline ordered from earliest to latest release date.
- Added cover art, status, platforms, genres, rating, and completed hours to timeline entries.
- Games without release dates appear at the end alphabetically.
- `Standalone` is excluded and its detail page returns not found.

## Calculation details

- Counts are based on unique game titles, not copies.
- A title is considered Completed if any owned copy is completed.
- Playing includes both Playing and Replaying.
- Completion rate excludes endless games.
- Ratings use the most recent reviewed copy for each title.
- Average hours uses completed titles with recorded playtime.

## After copying

Run:

```bash
npm run build
```

No database migration or new npm dependency is required.
