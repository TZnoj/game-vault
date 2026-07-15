# Admin-only access and editing controls

## Files included

- `app/admin/layout.tsx`
- `app/admin/game/[id]/page.tsx`
- `app/admin/copy/[copyId]/page.tsx`
- `app/admin/new/page.tsx`
- `app/game/[id]/page.tsx`
- `app/page.tsx`
- `components/NavBar.tsx`
- `lib/adminAuth.ts`
- `lib/auth.ts`

## What changed

- All `/admin/*` pages are protected by a server-side admin layout.
- Signed-out visitors are redirected to the NextAuth sign-in page.
- Signed-in non-admin users are redirected to the homepage.
- The Admin navbar icon and homepage Admin icon are hidden for non-admin users.
- Game-page Edit controls and owned-copy Edit links are hidden for non-admin users.
- Server actions continue to verify admin access before creating, updating, auto-saving, or deleting data.

## Configuring admins

The existing account remains the default admin. To configure one or more admins in Vercel, add an environment variable:

```text
ADMIN_EMAILS=first@example.com,second@example.com
```

Email matching is case-insensitive. When `ADMIN_EMAILS` is omitted, the project falls back to the existing admin email.

## Apply

Copy the included files into the matching project paths, then run:

```bash
npm run build
```
