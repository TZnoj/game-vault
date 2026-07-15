# Configurable Library Pagination Size

## Files to replace

```text
components/GameLibrary.tsx
```

## What changed

The main game library no longer uses a fixed 48-game page size.

A **Games per page** selector is now shown beside the sort controls with these options:

- 12
- 24
- 48
- 96
- All

## Remembered preference

The selected page size is saved in browser local storage under:

```text
game-vault-page-size
```

The same browser will automatically reuse the selected size on future visits.

## URL behavior

The current page and non-default page size are reflected in the URL:

```text
?page=3&pageSize=96
```

The default size of 48 is omitted from the URL to keep it clean.

## Pagination controls

When more than one page exists, the library shows:

- First
- Previous
- Current page and total pages
- Next
- Last

Selecting **All** hides the pagination buttons and displays every matching game.

Changing the search, filters, sorting, or page size returns the library to page 1.

The page header also shows the visible range, such as:

```text
Showing 49–96
```

## Installation

No migration or npm package is required.

After replacing the file, run:

```bash
npm run build
```
