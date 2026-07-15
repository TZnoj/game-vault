# Security, Transactions, Deletion, and Vercel Cron Fix

## Files to copy

Copy these files into the matching project locations:

```text
app/admin/game/[id]/page.tsx
app/admin/new/page.tsx
app/admin/copy/[copyId]/page.tsx
app/api/cron/nightly-enrich/route.ts
vercel.json
```

## File to delete

Delete this file from the project root:

```text
middleware.ts
```

It is a no-op file. Removing it clears the Next.js 16 warning about the deprecated middleware convention. Admin protection remains in `app/admin/layout.tsx` and in each write server action.

## Security fix

`deleteGame()` now begins with:

```ts
await requireAdmin();
```

A direct server-action request can no longer bypass the admin check.

## Transaction changes

The following multi-model operations now use `prisma.$transaction()`:

- Updating a game, its metadata override, franchise, and genres
- Creating a game, its initial owned copy, review, and genres
- Updating a copy and its latest review
- Deleting a copy and its reviews
- Deleting an entire game and all dependent records

External enrichment remains outside the create transaction so slow third-party API requests do not hold database locks open.

## Complete game deletion

Deleting a game now removes or detaches every known dependent record inside one transaction:

- Reviews
- User game copies
- Game-platform links
- Game-genre links
- Screenshots
- Metadata override
- Genre override
- The game itself

Enrichment logs are preserved for audit history, but their nullable `gameId` is set to `null` before the game is deleted.

No Prisma schema change or database migration is required for this package.

## Why the Vercel cron never ran

The project had the route:

```text
/api/cron/nightly-enrich
```

but did not have a root `vercel.json` registering that route as a cron job. Vercel only invokes paths listed under the `crons` configuration.

The included `vercel.json` schedules it nightly at:

```text
05:00 UTC
```

Schedule:

```text
0 5 * * *
```

Vercel cron schedules use UTC.

## Required Vercel setting

Add a Production environment variable:

```text
CRON_SECRET=<a random value of at least 16 characters>
```

Vercel automatically sends it as:

```text
Authorization: Bearer <CRON_SECRET>
```

The route now reports a clear configuration error when `CRON_SECRET` is missing.

After adding or changing the environment variable, redeploy the production deployment.

Also confirm that Cron Jobs are enabled in the Vercel project settings.

## Cron runtime changes

The route now declares:

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
```

The old job attempted up to 350 games and deliberately waited one second after every game. That could take at least 350 seconds before external API time was included.

The new job:

- Processes up to 12 games per invocation
- Removes the artificial one-second delay
- Selects the oldest incomplete records first
- Preserves run and per-game logs
- Records a failed run when a top-level error occurs

Repeated nightly runs will work through the incomplete library without exceeding typical Vercel function limits.

## Testing the cron route

After deployment, test it manually from PowerShell:

```powershell
$headers = @{ Authorization = "Bearer YOUR_CRON_SECRET" }
Invoke-RestMethod -Uri "https://www.tyguy.ca/api/cron/nightly-enrich" -Headers $headers
```

A successful response includes:

```json
{
  "ok": true,
  "checked": 12,
  "updated": 0,
  "failed": 0
}
```

The number checked can be lower when fewer than 12 games need enrichment.

You can confirm scheduled invocations in Vercel under the project's Cron Jobs and Logs views.

## Build

Run:

```bash
npm run build
```
