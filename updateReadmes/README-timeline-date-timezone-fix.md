# Timeline Date Timezone Fix

## What changed

The Timeline page now treats `dateCompleted` and `dateStarted` as calendar dates rather than timezone-sensitive timestamps.

Previously, a date such as `2026-07-01T00:00:00.000Z` could be converted to Montreal time and displayed as June 30. The Timeline now parses the year, month, and day directly and performs grouping and formatting in UTC.

## File to replace

```text
components/timeline/TimelineDashboard.tsx
```

## Installation

Copy the replacement file into the matching location in your Game Vault project, then run:

```bash
npm run build
```

## Database changes

None.

## New packages

None.
