# Year Comparison — Experience Weight and Impact Update

## Files to replace

- `components/year-comparison/YearComparisonDashboard.tsx`

## Changes

- Replaces the old square-root weight, weight-share, and score-contribution columns with a simpler table:
  - Game
  - Rating
  - Hours
  - Experience Weight
  - Year Impact
- Experience Weight displays the true percentage of the year's total square-root time weight.
- Experience Weight bars are scaled relative to the most heavily weighted game in the selected year. The largest game always receives a full bar while the percentage still shows its actual share of the yearly total.
- Adds hover tooltips explaining Experience Weight and Year Impact.
- Color-codes Year Impact:
  - Strong green: +0.50 or higher
  - Light green: +0.10 to +0.49
  - Gray: -0.09 to +0.09
  - Orange: -0.10 to -0.49
  - Red: -0.50 or lower
- Adds summary cards for:
  - Most Influential
  - Biggest Positive
  - Biggest Negative
- Keeps the existing clickable weighted-rating card, modal, square-root weighting formula, and leave-one-game-out impact calculation.

## Command

Run:

```bash
npm run build
```

No database migration or new package is required.
