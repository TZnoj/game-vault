# Recommended Next — Change of Pace

## Goal

This update keeps the existing Recommendations page and all of its current sections unchanged.

It adds a new **Recommended Next** section at the very top of `/recommendation`. The new section recommends exactly three backlog games that fit your tastes while trying to be different from your current gaming rotation.

## Files to copy

Copy these files into the matching locations in the Game Vault project:

```text
app/recommendation/page.tsx
components/recommendations/RecommendedNext.tsx
lib/recommendations.ts
```

The README is stored in:

```text
updateReadmes/README-recommended-next-change-of-pace.md
```

## Recommendation sources

The new section examines:

- Every game currently marked `PLAYING`
- Every game currently marked `REPLAYING`
- The three most recently completed games

The latest completed games are ordered using `dateCompleted`, with update and creation timestamps used only as fallbacks when needed.

## Genre-fatigue rule

Every genre represented by the current/recent source games receives a soft recommendation penalty.

This means that even one recently played JRPG makes another JRPG less likely to appear in Recommended Next. Repeated appearances make the penalty stronger.

The rule is deliberately soft rather than absolute:

- A repeated genre is discouraged.
- It is not permanently blocked.
- An unusually strong candidate can still appear when there are not enough good alternatives.

This logic applies to every genre, not only JRPGs.

## Diversity between the three results

After candidates are scored, the selection process discourages overlap between the three visible recommendations.

For example, it tries to avoid showing three JRPGs, three horror games, or three games with nearly identical genre profiles in the same group.

## Existing exclusions retained

The section uses the existing eligibility rules:

- Completed games are excluded.
- Playing games are excluded.
- Replaying games are excluded.
- Alternate copies of those titles are excluded.
- Duplicate normalized titles are excluded.
- Recommendations must be backlog-only.
- `Standalone` never creates a franchise similarity bonus.

## Recommendation cards

Each card shows:

- Game cover
- Game title
- Adjusted fit score
- HLTB Main time when available
- Genres
- Why the game is a useful change of pace now
- Which recent games still connect it to your tastes

## Refresh Recommendations

The **Refresh Recommendations** button moves to the next diverse group of three candidates from the high-quality recommendation pool.

It does not change or refresh the existing recommendation sections below it.

## Surprise Me

The **Surprise Me** button selects three diverse games from a wider pool of still-suitable backlog candidates.

It is intended to surface less obvious choices without selecting completely unrelated games.

## Existing page preserved

The following existing sections remain below Recommended Next and continue using their previous logic:

- Very Similar
- Same Genre
- Same Franchise
- Hidden Alternatives
- If You Liked…

## Database and dependencies

- No Prisma migration is required.
- No new npm package is required.
- No database fields are added.

## Verification

After copying the files, run:

```bash
npm run build
```

Then open:

```text
/recommendation
```

Confirm that the new Recommended Next panel appears above the existing recommendation sections and that the lower sections remain present.
