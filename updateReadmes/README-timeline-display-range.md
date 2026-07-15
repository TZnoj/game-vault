# Timeline Display Range Update

## What changed

The Timeline page can now display:

- One selected month
- A custom range of consecutive months
- The entire selected year

The selected range respects the existing Year, Platform, Genre, Franchise, and Status filters.

## New controls

A **Display range** section was added below the existing filters:

- **Single Month** — click any month in the calendar to show only that month.
- **Multiple Months** — choose a From month and To month.
- **Full Year** — shows all twelve months together.

Each visible month is displayed as its own section. The summary above the list shows the total games and hours for the current display range.

## Files to replace

Copy this file into the matching location in your Game Vault project:

```text
components/timeline/TimelineDashboard.tsx
```

## Required commands

No migration or npm package is required.

After replacing the file, run:

```bash
npm run build
```
