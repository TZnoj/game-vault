# Year Comparison Weighted Rating Card Cleanup

## What changed

- Removed the nested **View impact** button from the Time-weighted rating card.
- The entire Time-weighted rating card remains clickable.
- Hover highlighting and keyboard focus styling are preserved.
- Clicking the card still opens the per-game weighted-rating impact breakdown.

## File to replace

```text
components/year-comparison/YearComparisonDashboard.tsx
```

## After copying

Run:

```bash
npm run build
```

No database migration or additional npm package is required.
