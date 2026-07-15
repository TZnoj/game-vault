# Collection Health — Admin Integration

## What changed

Collection Health is now an admin-only maintenance page rather than a top-level public page.

The dashboard is available at:

```text
/admin/collection-health
```

The Admin landing page now includes:

- A prominent Collection Health action in the header
- A Collection Health dashboard card above the game table
- Direct links from every health issue to the relevant admin game editor

The main public navbar does not include a Health link.

## Files to copy

```text
app/admin/page.tsx
app/admin/collection-health/page.tsx
components/NavBar.tsx
```

## Remove the old public route

If you installed the earlier Collection Health package, delete:

```text
app/collection-health/page.tsx
```

Leaving that file in place will keep the old public `/collection-health` route available.

## Dashboard checks

- Missing cover art
- Missing HLTB Main times
- Missing genres
- Missing platforms
- Completed games without ratings
- Completed copies without completion dates
- Playing/replaying copies without start dates
- Possible duplicate records
- Multiple owned copies
- Recommendation-system issues
- Overall Collection Health score

## Notes

- No Prisma migration is required.
- No npm package is required.
- Issue links open `/admin/game/[id]` so problems can be corrected immediately.

## Verify

Run:

```bash
npm run build
```

Then open:

```text
/admin
```
