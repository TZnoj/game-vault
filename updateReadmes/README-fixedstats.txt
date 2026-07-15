GAME VAULT — PHASE 4 STATISTICS DASHBOARD

Replace this file in your project:

  app/stats/page.tsx

Then run:

  npm run build

Included sections:
- Completion statistics
- Rating averages, median, highest/lowest, and distribution
- Total/average/median hours, longest/shortest games
- Hours by month and year
- Genre statistics
- Platform statistics
- Franchise statistics

Calculation notes:
- Games Started counts records with a start date or any status other than BACKLOG.
- Completion Rate excludes endless games from the denominator.
- Rating calculations use the latest review for each user-game record.
- Hours statistics use completed games with recorded hours.
- "Top Platform" and "Top Franchise" mean most games in the library.
- The Standalone franchise is excluded from franchise rankings.

No Prisma migration or npm package is required.


UPDATE INCLUDED:
- Franchise table now uses “Games Owned” instead of “Games Played.”
- Highest Rated randomly selects one of the games rated exactly 10/10 on each dynamic page load.
- Lowest Rated randomly selects one of the games rated exactly 1/10 on each dynamic page load.
- If no exact 10 or 1 exists, the card falls back to a random game tied at the actual highest or lowest rating.
