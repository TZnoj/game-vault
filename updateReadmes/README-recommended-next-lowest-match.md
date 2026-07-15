# Recommended Next — Lowest Match

## What changed

A third button, **Lowest Match**, was added beside **Refresh recommendations** and **Surprise me** in the Recommended Next section.

When selected, it displays the three eligible backlog games with the lowest match percentages against:

- Every game currently marked Playing or Replaying
- The last three completed games, ordered by `dateCompleted`

## Button behavior

- **Refresh recommendations**: cycles through another group from the strongest-scoring change-of-pace recommendations.
- **Surprise me**: samples from a wider pool of suitable backlog games, including less obvious choices.
- **Lowest Match**: deliberately shows the three least similar eligible backlog games.

Lowest Match still respects the existing exclusions. It will not show:

- Completed games
- Playing games
- Replaying games
- Alternate copies of blocked titles
- Duplicate title records
- Games that are not backlog-only

## Files to replace

```text
components/recommendations/RecommendedNext.tsx
lib/recommendations.ts
```

## Database and dependencies

No Prisma migration or new npm package is required.

## Verification

After copying the files, run:

```bash
npm run build
```
