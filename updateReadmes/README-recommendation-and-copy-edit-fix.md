# Recommendation and Copy Edit Fix

## What changed

- Excludes a game from recommendations when any owned copy is Completed, Playing, or Replaying.
- Requires all owned copies of an eligible recommendation to be Backlog.
- Compares normalized titles to avoid recommending another database entry or platform copy of a game already played.
- Clarifies that Gameplay, Story, and Art similarity values are tag-based heuristic estimates.
- Fixes the Edit button for an owned copy on a game page.

The copy Edit link now uses:

```text
/admin/copy/[copyId]
```

instead of the invalid route:

```text
/admin/game/[gameId]/copy/[copyId]
```

## Files to replace

```text
app/game/[id]/page.tsx
lib/recommendations.ts
components/recommendations/RecommendationCard.tsx
```

## Installation

Copy the files into the matching locations in your project, replacing the existing versions.

Then run:

```bash
npm run build
```

No database migration or additional npm package is required.
