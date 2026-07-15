# Hall of Fame Game Link Fix

## What changed

Hall of Fame game links now use the numeric game ID route expected by the project.

Before:

```text
/game/clair-obscur-expedition-33
```

After:

```text
/game/22
```

## File to replace

```text
components/hall-of-fame/HallOfFameDashboard.tsx
```

## Notes

This package is based on the Hall of Fame integer-rating-tier version and preserves the 10/9/8 tier changes.

## Verify

Run:

```bash
npm run build
```
