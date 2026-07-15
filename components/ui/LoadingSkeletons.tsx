function Pulse({ className }: { className: string }) { return <div className={`animate-pulse rounded-xl bg-zinc-800/80 ${className}`} />; }

export function PageLoadingSkeleton({ cards = 12, showStats = true }: { cards?: number; showStats?: boolean }) {
  return (
    <main className="min-h-screen bg-zinc-950 p-4 text-white sm:p-8" aria-busy="true" aria-label="Loading page">
      <div className="mx-auto max-w-7xl">
        <Pulse className="h-4 w-36" /><Pulse className="mt-3 h-10 w-72 max-w-full" /><Pulse className="mt-3 h-4 w-full max-w-xl" />
        {showStats ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"><Pulse className="h-3 w-24" /><Pulse className="mt-4 h-8 w-20" /></div>)}</div> : null}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: cards }, (_, index) => <div key={index} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50"><Pulse className="aspect-[3/4] w-full rounded-none" /><div className="space-y-3 p-4"><Pulse className="h-5 w-4/5" /><Pulse className="h-3 w-3/5" /><Pulse className="h-3 w-full" /></div></div>)}</div>
      </div>
    </main>
  );
}

export function TimelineLoadingSkeleton() {
  return <main className="min-h-screen bg-zinc-950 p-4 text-white sm:p-8" aria-busy="true"><div className="mx-auto max-w-7xl"><Pulse className="h-10 w-64" /><div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-12">{Array.from({ length: 12 }, (_, index) => <Pulse key={index} className="h-24" />)}</div><div className="mt-8 space-y-4">{Array.from({ length: 5 }, (_, index) => <Pulse key={index} className="h-28 w-full" />)}</div></div></main>;
}
