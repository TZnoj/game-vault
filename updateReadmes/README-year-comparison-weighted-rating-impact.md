# Year Comparison — Weighted Rating Impact Breakdown

## Files to replace

- `components/year-comparison/YearComparisonDashboard.tsx`

## What changed

The Time-weighted rating card on every year summary is now clickable.

Selecting it opens a responsive breakdown showing every rated game used in that year's calculation, including:

- Game title
- Personal rating
- Time used
- Whether time came from recorded hours, HLTB Main, or the one-hour fallback
- Square-root time weight
- Percentage of the year's total weight
- Contribution to the final weighted score
- Impact on the final yearly rating

## How Impact is calculated

Impact compares the displayed yearly weighted rating with the result calculated after removing that one game.

- A positive value means the game raises the yearly rating.
- A negative value means the game lowers the yearly rating.
- A value near zero means the game has little effect on the final result.

Impact values are independent leave-one-out comparisons and should not be added together.

## Existing weighted formula

The package preserves square-root time weighting:

`weight = sqrt(time)`

Time is chosen in this order:

1. Recorded hours played
2. HLTB Main
3. One-hour fallback

## Interaction

- Click a year's Time-weighted rating card to open the breakdown.
- Click Close, click outside the panel, or press Escape to close it.
- Click a game title in the breakdown to open its game page.

## Commands

After replacing the file, run:

```bash
npm run build
```

No database migration or additional npm package is required.
