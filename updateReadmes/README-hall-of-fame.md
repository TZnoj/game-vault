# Game Vault — Hall of Fame

## Files to add or replace

- `app/hall-of-fame/page.tsx`
- `components/hall-of-fame/HallOfFameDashboard.tsx`
- `components/NavBar.tsx`

## Features

- Automatically generated 10/10, 9.5–9.9, and 9.0–9.4 masterpiece tiers.
- Top RPG, Action, Horror, PS2, PS5, and Switch categories.
- Top Story, Music, Gameplay, and Art categories using your subratings.
- Interactive Top 10, Top 50, and Top 100 personal rankings.
- Rankings use unique games, not physical copies.
- `Standalone` is ignored as a franchise.
- Responsive cover grids and ranked list.

## Ranking order

1. Overall rating
2. Average of available Story, Gameplay, Music, and Art ratings
3. Recorded completed-game hours
4. Alphabetical title

## Notes

- Category lists show up to five games.
- Platform categories recognize both full platform names and common abbreviations such as PS2 and PS5.
- No database migration or npm package is required.

## Verify

Run:

```bash
npm run build
```

Then visit:

```text
/hall-of-fame
```
