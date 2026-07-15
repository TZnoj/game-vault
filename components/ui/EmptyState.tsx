import Link from "next/link";

type EmptyStateProps = { title: string; description: string; actionHref?: string; actionLabel?: string; icon?: string };

export function EmptyState({ title, description, actionHref, actionLabel, icon = "🎮" }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-14 text-center">
      <div className="text-4xl" aria-hidden="true">{icon}</div>
      <h2 className="mt-4 text-xl font-bold text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-400">{description}</p>
      {actionHref && actionLabel ? <Link href={actionHref} className="mt-6 inline-flex rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-700">{actionLabel}</Link> : null}
    </div>
  );
}
