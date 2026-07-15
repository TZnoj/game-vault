# Recommended Next — Last Completed + Change of Pace

## Files included

- `app/recommendation/page.tsx`
- `components/recommendations/RecommendedNext.tsx`
- `lib/recommendations.ts`

## What changed

A new **Recommended Next** section appears at the top of the existing Recommendations page. All existing recommendation categories remain below it.

The source games are now determined by:

1. Every game currently marked `PLAYING` or `REPLAYING`.
2. The last three completed games, ordered strictly by `dateCompleted` descending.

The feature does not use `updatedAt`, so editing an older game will not affect the recent-completion source list.

## Change-of-pace logic

Every genre represented in the recent source games applies a soft penalty to candidate games with that genre. The penalty becomes stronger when a genre appears in multiple source games.

This is not a hard exclusion. A game from a recent genre can still appear when it remains an especially strong recommendation, but suitable alternatives are preferred.

The final three recommendations are also diversified against one another by penalizing shared genres and shared non-Standalone franchises.

## Refresh vs. Surprise Me

### Refresh recommendations

Cycles through another set from the highest-scoring change-of-pace candidate pool. These remain the strongest recommendations, just with different games shown.

### Surprise Me

Randomly samples from a wider pool of suitable candidates. This can surface less obvious backlog games that score well enough but would not normally appear in the first few ranked results.

## Existing exclusions retained

The section excludes:

- Completed games
- Playing games
- Replaying games
- Duplicate normalized titles
- Alternate copies when another copy is blocked
- Games that are not backlog-only
- `Standalone` as a franchise similarity source

## Installation

Copy the included files into the matching paths in your project, then run:

```bash
npm run build
```

No Prisma migration or additional npm package is required.
