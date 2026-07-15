# Hall of Fame Integer Rating Tiers

## What changed

The Hall of Fame masterpiece groups now match the integer-only rating system:

- Perfect Scores: exactly 10/10
- Near Masterpieces: exactly 9/10
- Hall of Excellence: exactly 8/10

The prior Prisma metadataOverride query fix is included in this package.

## Files to replace

- `app/hall-of-fame/page.tsx`
- `components/hall-of-fame/HallOfFameDashboard.tsx`

## After copying

Run:

```bash
npm run build
```

No database migration or new npm package is required.
