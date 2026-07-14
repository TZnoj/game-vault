GAME VAULT — EXPANDABLE HOMEPAGE DASHBOARD

Replace these files in your project:

app/page.tsx
components/HomeDashboard.tsx

This update moves everything above the Game Vault library into an expandable
right-side dashboard:

- Recently Updated
- Collection statistics
- Rating statistics
- Time statistics
- Library statistics

The normal homepage now keeps the navbar, Game Vault heading, filters, and game
grid as the primary visible content.

HOW IT WORKS

- Click the fixed "Dashboard" tab on the right side of the screen.
- The dashboard slides in from the right.
- Click outside it, click Close, or press Escape to close it.
- The sidebar is full-width on small screens and capped at a comfortable width
  on desktop.
- Each statistics group can be expanded or collapsed inside the sidebar.
- Clicking a recently updated game closes the sidebar and opens that game.

No database migration or new npm package is required.

After copying the files, run:

npm run build
