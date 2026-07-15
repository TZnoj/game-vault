# Platform Pages Upgrade

## Files to replace

Copy this file into the matching location in your Game Vault project:

- `app/platform/[id]/page.tsx`

## What changed

The platform detail page is now a full dashboard showing:

- Unique games owned
- Completed, Playing, and Backlog counts
- Completion percentage and progress bar
- Average rating
- Average completed-game hours
- Total completed-game hours
- Favorite genre
- Favorite franchise
- On Hold and Dropped counts
- Top Rated games
- Most Played games
- Recently Added games
- Recently Completed games
- A complete platform game grid

## Calculation notes

- Counts use unique game titles, not physical/digital copies.
- A title is Completed if any copy on this platform is completed.
- Playing includes both Playing and Replaying.
- Average rating uses the latest available review for each title.
- Average Hours uses completed titles that have recorded hours.
- Favorite Genre counts how many unique titles use each genre.
- Favorite Franchise excludes `Standalone`.
- Recently Added uses the earliest date that title was added on this platform.
- Recently Completed uses the newest completion date for that title.
- Endless games are excluded from the completion-rate denominator.

## Database and dependencies

No Prisma migration or new npm package is required.

## After replacing the file

Run:

```bash
npm run build
```
