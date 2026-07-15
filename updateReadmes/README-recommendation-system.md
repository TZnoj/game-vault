# Recommendation System Upgrade

## Files to replace

- `app/recommendation/page.tsx`
- `app/game/[id]/page.tsx`

## New files to add

- `lib/recommendations.ts`
- `components/recommendations/RecommendationCard.tsx`
- `components/recommendations/GameRecommendations.tsx`

## What changed

- Adds 0–100 match scores.
- Explains recommendations with shared genres, franchise matches, length, gameplay, story, and art profiles.
- Adds breakdown bars for Gameplay, Story, Art, and Length.
- Adds sections for Very Similar, Same Genre, Same Franchise, Hidden Alternatives, and If You Liked.
- Uses completed games rated 7.5 or higher as preference signals.
- Recommends backlog games only on the dedicated recommendation page.
- Excludes games already completed, playing, or replaying from the backlog recommendation pool.
- Treats `Standalone` as no franchise. It never receives a franchise bonus and never appears as a Same Franchise recommendation.
- Randomizes games within close scoring groups so the page is not identical on every load.

## Installation

Copy the included folders into the root of the Game Vault project and allow the matching files to be replaced.

Run:

```bash
npm run build
```

No database migration or additional npm package is required.
