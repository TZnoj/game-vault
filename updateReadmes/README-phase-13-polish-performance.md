# Phase 13 — Polish & Performance

## Files to copy

Copy the folders/files from this package into the matching locations in Game Vault.

## Implemented

### Smart loading
- Shared card/statistics loading skeleton components.
- Route-level `loading.tsx` files for the homepage, backlog, goals, statistics, timeline, recommendations, years, Hall of Fame, platform/franchise lists, and game/platform/franchise detail pages.
- Timeline-specific loading layout.
- Global retry screen and polished not-found screen.

### Image improvements
- Shared `GameCover` component with lazy loading, AVIF/WebP delivery, blur placeholder, stable aspect-ratio containers, responsive `sizes`, and an error fallback.
- Applied to the main library and recommendation cards.
- Expanded Next.js image size configuration and a 30-day optimized-image cache.

### Faster navigation
- Subtle route-entry transition with reduced-motion support.
- Smooth scrolling for pagination.
- Browser-history Back buttons on game, platform, and franchise detail pages.
- Existing Next.js links continue to prefetch routes and preserve normal browser scroll history.

### Performance
- Main game library now paginates at 48 cards per page.
- Recommendation Prisma query now selects only fields used by the recommendation engine instead of loading complete records.
- Filtering and sorting remain memoized and only the visible page is rendered.

### Better empty/error states
- Shared `EmptyState` component.
- Improved no-search-results state.
- Friendly global 404 and retry states.

## Intentionally not included in this package

Database-backed aggregate precomputation and long-lived server caching are not enabled yet. Those changes need a separate data-cache design because Game Vault invalidates many connected pages after every edit, and caching Prisma results incorrectly could show stale private library data. A later Phase 13B can add tagged per-user caches and optional summary tables after the data ownership and invalidation strategy are finalized.

Virtual scrolling was not added because pagination prevents the browser from rendering hundreds of cards at once and remains easier to navigate and more accessible. Virtualization can still be added later to an infinite-scroll view if the library grows enough to justify it.

## Commands

No migration or new dependency is required.

```bash
npm run build
```
