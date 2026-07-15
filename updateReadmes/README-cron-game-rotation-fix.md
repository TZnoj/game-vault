# Cron Game Rotation Fix

## Problem

The nightly enrichment route ordered incomplete games by `Game.updatedAt`.
When a game was checked and no metadata changed, the `Game` row was not updated.
That left the same titles at the front of the query, so every run repeatedly checked the same games.

## Fix

The cron now uses each game's latest `EnrichmentLog` instead of `Game.updatedAt`.

Selection rules:

- Games that have never been checked are selected first.
- Successful `checked` or `updated` games are not checked again for 30 days.
- Failed games may be retried after 24 hours.
- Eligible games are ordered by the oldest enrichment check first.
- A maximum of 12 games is processed per run.
- If no game is currently due, the run completes successfully with `Checked 0`.

## File to replace

```text
app/api/cron/nightly-enrich/route.ts
```

## After copying

Run:

```bash
npm run build
```

Redeploy to Vercel, then use the Cron Jobs **Run** button again.

The next run should either:

- check different games that have never been checked, or
- report `Checked 0` if the five previous games are the only incomplete candidates and are still inside their 30-day cooldown.
