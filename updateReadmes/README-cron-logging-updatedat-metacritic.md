# Cron Logging, updatedAt Protection, and Metacritic Display

## Files to replace

- `app/api/cron/nightly-enrich/route.ts`
- `lib/enrichGame.ts`
- `app/game/[id]/page.tsx`

## What changed

### Structured cron logging

Each run now logs:

- Run number and start time
- Total games in the library
- Number currently eligible
- The exact games selected for the run
- Whether every game was updated, checked with no changes, or failed
- Changed field names for updated games
- Final checked, updated, failed, and duration totals

The existing `EnrichmentRun` and `EnrichmentLog` database records are still created, so the Admin enrichment history continues to work.

### Full-library rotation

The cron now rotates through the complete library instead of only games with missing metadata.

Selection order:

1. Games never checked before
2. Games with more missing metadata
3. Games with the oldest prior check

Cooldowns:

- Successful/no-change checks: 30 days
- Failed checks: 24 hours

Up to 12 games are checked per run.

### Game.updatedAt only changes after a real metadata change

Previously, `enrichSingleGame()` always called `prisma.game.update()`. Prisma advances `Game.updatedAt` whenever that update runs, even when all supplied values are identical.

The enrichment service now compares these proposed values first:

- RAWG ID
- Slug
- Cover art
- Metacritic score
- Release date
- HLTB Main
- HLTB Main + Extra
- HLTB Completionist

When none changed, no `Game` update query is issued and `Game.updatedAt` remains unchanged.

`EnrichmentRun` and `EnrichmentLog` timestamps still update normally because those records track the cron itself.

### Metacritic restored on game pages

The Review Metadata section now includes:

- `Metacritic: 84/100`
- `N/A` when the score is missing or stored as a negative placeholder

## No migration required

This update only changes application code.

## After copying

Run:

```bash
npm run build
```

Then redeploy and use the Vercel Cron **Run** button. Check both Vercel Runtime Logs and the Admin enrichment-history page.
