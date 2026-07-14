import { revalidatePath } from "next/cache";

/**
 * Invalidates every page beneath the root layout.
 *
 * Game, copy, review, genre, franchise, platform, and status edits affect
 * aggregate data across most of the site, so invalidating individual routes
 * is easy to get wrong. Using the root layout keeps all pages in sync after
 * the next navigation or request.
 */
export function revalidateGameData() {
  revalidatePath("/", "layout");
}
