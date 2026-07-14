GAME VAULT — PHASE 2 BETTER HOMEPAGE

Replace these files in your project:

app/page.tsx
components/GameLibrary.tsx
components/HomeDashboard.tsx (new)

WHAT THIS ADDS

1. Recently Updated
- Uses Game.updatedAt, UserGame.updatedAt, and the latest Review.reviewDate.
- Sorts newest first.
- Limits the feed to 10 unique games.
- Shows relative times such as "2 hours ago" and "Yesterday".
- Links each item to its game page.

2. Homepage Statistics
Collection:
- Total games
- Completed
- Playing
- Backlog
- Dropped

Ratings:
- Overall average
- Highest rated game
- Lowest rated game
- Gameplay average
- Story average
- Music average
- Art average

Time:
- Total hours
- Average played-game length
- Longest game
- Shortest game
- Hours completed during the current year

Library:
- Platforms owned
- Genres played
- Franchises
- Games started this year
- Games completed this year

IMPORTANT SCHEMA LIMITATIONS

- Review has reviewDate but no updatedAt. The feed can identify a recent review by reviewDate, but it cannot reliably distinguish a notes-only edit from another review edit. A future activity log or Review.updatedAt field would make labels fully precise.

The existing four filter-sensitive summary cards are hidden on the homepage to avoid duplicating the new dashboard. GameLibrary still supports them elsewhere through its showSummaryStats property.

After copying the files, run:

npm run build
