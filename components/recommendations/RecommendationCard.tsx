import Link from "next/link";
import type { RecommendationResult } from "@/lib/recommendations";
import { GameCover } from "@/components/ui/GameCover";

export function RecommendationCard({ recommendation }: { recommendation: RecommendationResult }) {
  const { game, match, reasons, breakdown, sourceGame } = recommendation;
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
      <Link href={`/game/${game.id}`} className="grid h-full grid-cols-[96px_1fr] gap-4 p-4 sm:grid-cols-[120px_1fr]">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800">
          <GameCover src={game.coverArtUrl} alt={`${game.title} cover`} sizes="120px" />
        </div>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-white">{game.title}</h3>
              {sourceGame && <p className="mt-1 text-xs text-zinc-500">Because you liked {sourceGame.title}</p>}
            </div>
            <div className="shrink-0 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-center">
              <div className="text-xl font-black text-fuchsia-300">{match}%</div>
              <div className="text-[10px] uppercase tracking-wider text-fuchsia-200/70">Match</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {reasons.slice(0, 4).map((reason) => <span key={reason} className="rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-300">✓ {reason}</span>)}
          </div>
          <div className="mt-4 space-y-2">
            <Bar label="Gameplay" value={breakdown.gameplay} />
            <Bar label="Story" value={breakdown.story} />
            <Bar label="Art" value={breakdown.art} />
            <Bar label="Length" value={breakdown.length} />
          </div>
          <p className="mt-3 text-[10px] leading-4 text-zinc-600">
            Gameplay, Story, and Art are estimated from your shared tags and themes—not external review scores. Length uses HLTB Main.
          </p>
        </div>
      </Link>
    </article>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return <div className="grid grid-cols-[62px_1fr_36px] items-center gap-2 text-xs">
    <span className="text-zinc-400">{label}</span>
    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-fuchsia-500" style={{ width: `${value}%` }} /></div>
    <span className="text-right text-zinc-400">{value}%</span>
  </div>;
}
