GAME VAULT — GOALS PACE DISPLAY UPDATE

Replace this file in your project:

  app/goals/page.tsx

Changes:
- Keeps Current Pace as the annualized completion rate.
- Replaces the redundant Predicted Finish card with On Pace For.
- Shows projected completions directly against the yearly goal.
- Shows how many games ahead of or short of the goal the projection is.
- Adds a projection progress bar.
- Makes Current Month more actionable by showing games completed and how many more are needed to reach the current monthly target.

No database migration or npm package is required.

After replacing the file, run:

  npm run build
