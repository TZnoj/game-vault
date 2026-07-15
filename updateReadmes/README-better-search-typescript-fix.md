# Better Search TypeScript Fix

## What changed

Fixed the TypeScript build error in `components/GameLibrary.tsx` where `value` could still be considered `undefined` inside the franchise filter.

The filter now checks `typeof value === "string"` before calling `toLowerCase()`.

The platform-name filter was updated to use the same explicit type guard for consistency.

## File to replace

```text
components/GameLibrary.tsx
```

## Commands

After copying the file, run:

```bash
npm run build
```

## Database changes

None.

## Additional packages

None.
