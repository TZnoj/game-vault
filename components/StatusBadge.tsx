import { GameStatus } from "@prisma/client";

const statusStyles: Record<GameStatus, string> = {
  COMPLETED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  PLAYING: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  BACKLOG: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
  ONHOLD: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  DROPPED: "border-red-500/40 bg-red-500/10 text-red-300",
  REPLAYING: "border-purple-500/40 bg-purple-500/10 text-purple-300",
};

const statusLabels: Record<GameStatus, string> = {
  COMPLETED: "Completed",
  PLAYING: "Playing",
  BACKLOG: "Backlog",
  ONHOLD: "On Hold",
  DROPPED: "Dropped",
  REPLAYING: "Replaying",
};

export function StatusBadge({ status }: { status: GameStatus | null | undefined }) {
  if (!status) {
    return (
      <span className="inline-flex rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-400">
        Unknown
      </span>
    );
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}