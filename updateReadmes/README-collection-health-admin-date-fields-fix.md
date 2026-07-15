# Collection Health Admin Date Fields Fix

## What changed

The Collection Health recommendation mapping now includes `dateStarted` and `dateCompleted` for each owned game copy.

This fixes the TypeScript build error where `RecommendationGame.userGames` required those fields but the mapped objects omitted them.

## File to replace

```text
app/admin/collection-health/page.tsx
```

## Build

```bash
npm run build
```

No migration or new npm package is required.
