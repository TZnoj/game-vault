import { prisma } from "@/lib/prisma";
import { buildPersonalRecommendations, buildRecommendedNext, type RecommendationGame, type RecommendationResult } from "@/lib/recommendations";
import { RecommendationCard } from "@/components/recommendations/RecommendationCard";
import { RecommendedNext } from "@/components/recommendations/RecommendedNext";

export const dynamic = "force-dynamic";

const sections: { key: RecommendationResult["type"]; title: string; description: string }[] = [
  { key: "VERY_SIMILAR", title: "Very Similar", description: "The strongest overall matches across genre, ratings, and length." },
  { key: "SAME_GENRE", title: "Same Genre", description: "Familiar styles and gameplay categories from games you rated highly." },
  { key: "SAME_FRANCHISE", title: "Same Franchise", description: "More from franchises you already enjoyed. Standalone is always excluded." },
  { key: "HIDDEN_ALTERNATIVE", title: "Hidden Alternatives", description: "Less obvious choices with a surprisingly compatible profile." },
  { key: "IF_YOU_LIKED", title: "If You Liked…", description: "Your strongest personalized recommendations from the backlog." },
];

export default async function RecommendationPage() {
  const games = await prisma.game.findMany({
    select: {
      id: true,
      title: true,
      coverArtUrl: true,
      hltbMain: true,
      franchiseId: true,
      franchise: { select: { id: true, name: true } },
      gameGenres: {
        select: {
          genreId: true,
          genre: { select: { id: true, name: true } },
        },
      },
      userGames: {
        select: {
          status: true,
          dateStarted: true,
          dateCompleted: true,
          hoursPlayed: true,
          reviews: {
            select: {
              overallRating: true,
              gameplayRating: true,
              storyRating: true,
              artRating: true,
              musicRating: true,
            },
            orderBy: [{ reviewDate: "desc" }, { id: "desc" }],
          },
        },
      },
    },
    orderBy: { title: "asc" },
  }) as RecommendationGame[];
  const recommendedNext = buildRecommendedNext(games);
  const groups = buildPersonalRecommendations(games);

  return <main className="min-h-screen bg-zinc-950 p-4 text-white sm:p-8">
    <div className="mx-auto max-w-7xl">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-fuchsia-400">Personalized Discovery</p>
      <h1 className="mt-2 text-4xl font-black">Recommendations</h1>
      <p className="mt-2 max-w-3xl text-zinc-400">Built from games you completed and rated highly. Completed, playing, replaying, and duplicate copies are not recommended.</p>
      <div className="mt-10">
        <RecommendedNext data={recommendedNext} />
      </div>
      <div className="mt-12 space-y-12">
        {sections.map((section) => {
          const items = groups[section.key];
          if (!items.length) return null;
          return <section key={section.key}>
            <h2 className="text-2xl font-bold">{section.title}</h2>
            <p className="mt-1 text-sm text-zinc-400">{section.description}</p>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">{items.map((item) => <RecommendationCard key={`${section.key}-${item.game.id}`} recommendation={item} />)}</div>
          </section>;
        })}
      </div>
    </div>
  </main>;
}
