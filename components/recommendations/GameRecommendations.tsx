import { prisma } from "@/lib/prisma";
import { buildRecommendationsForGame, type RecommendationGame } from "@/lib/recommendations";
import { RecommendationCard } from "./RecommendationCard";

export async function GameRecommendations({ gameId }: { gameId: number }) {
  const games = await prisma.game.findMany({
    include: {
      franchise: true,
      gameGenres: { include: { genre: true } },
      userGames: { include: { reviews: { orderBy: { reviewDate: "desc" } } } },
    },
  }) as RecommendationGame[];
  const source = games.find((game) => game.id === gameId);
  if (!source) return null;
  const recommendations = buildRecommendationsForGame(source, games, 6);
  if (!recommendations.length) return null;
  return <section className="mt-14 border-t border-zinc-800 pt-10">
    <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Keep Playing</p>
    <h2 className="mt-1 text-2xl font-bold">If You Liked This…</h2>
    <p className="mt-1 text-sm text-zinc-400">Recommendations with transparent match scores and category breakdowns.</p>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">{recommendations.map((r) => <RecommendationCard key={r.game.id} recommendation={r} />)}</div>
  </section>;
}
