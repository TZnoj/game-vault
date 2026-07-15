# Review Improvements

## What changed

The public game detail page now behaves like a complete personal review page.

### Rating bars
- Gameplay, Story, Art, and Music use visual 0–10 progress bars.
- The exact numeric score remains visible.

### Review summary
- Strengths are generated from category scores of 8 or higher.
- Weaknesses are generated from category scores of 5 or lower.
- This is deterministic and does not use an external AI service.

### Review metadata
- Status
- Platform
- Date started
- Date finished
- Hours played
- HLTB main time
- Completion percentage
- Overall rating

Completion percentage is 100% for completed games. For unfinished games, it compares hours played against HLTB Main when both values exist.

### Personal ranking badges
- Shows an overall rank when the game is in the library's Top 10.
- Shows `Top [Genre] Game` when tied for the highest rating in a genre.
- Shows `Top [Platform] Game` when tied for the highest rating on a platform.
- Up to six badges are displayed.

### Additional polish
- Reorganized game information into review-focused sections.
- Improved owned-copy presentation.
- Preserved the Similar Games section.
- Uses timezone-safe calendar date formatting.

## File to replace

```text
app/game/[id]/page.tsx
```

## Installation

Copy the included `app` directory into the root of the Game Vault project and allow it to replace the matching file.

Run:

```bash
npm run build
```

## Database changes

None.

## New packages

None.
