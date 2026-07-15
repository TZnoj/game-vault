# Better Search

## Files to replace

Copy this file into the matching location in your Game Vault project:

- `components/GameLibrary.tsx`

## Features added

- Searches game titles
- Searches genres
- Searches platforms
- Searches franchises
- Searches review notes
- Searches status names such as `Completed`, `On Hold`, and `Backlog`
- Searches years associated with release, start, completion, or library-add dates
- Multi-select filters for platform, genre, franchise, status, and year
- Minimum and maximum hours filters
- Minimum and maximum overall-rating filters
- Active-filter count
- Clear-all button
- Expandable advanced-filter panel
- Empty search-result state
- Keeps existing sorting and game cards
- Excludes `Standalone` from the franchise-filter list

## Multiple-selection behavior

Within each filter category, selected values use OR logic. For example, selecting PS2 and PS3 displays games owned on either platform.

Different categories use AND logic. For example, selecting JRPG, PS2, and Completed displays completed PS2 games that have the JRPG genre.

## Year behavior

A game matches a selected year when that year appears in at least one of these fields:

- Release date
- Date started
- Date completed
- Date added to the library

## Developer and publisher limitation

The current Prisma `Game` model does not contain developer or publisher fields. The client-side search supports optional `developer` and `publisher` values so it is ready for those fields later, but this package intentionally does not add a migration or overwrite the upgraded admin editor.

Developer and publisher search will begin working after those values are added to the database and included in the homepage query.

## Install

No npm package or database migration is required.

After replacing the file, run:

```bash
npm run build
```
