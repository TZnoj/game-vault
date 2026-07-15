"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-[70vh] bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-xl rounded-2xl border border-red-900/60 bg-red-950/20 p-8 text-center">
        <div className="text-4xl">⚠️</div>
        <h1 className="mt-4 text-2xl font-bold">This page could not load</h1>
        <p className="mt-2 text-zinc-400">The problem may be temporary. Try loading the page again.</p>
        <button onClick={reset} className="mt-6 rounded-xl bg-white px-5 py-2 font-semibold text-black">Try again</button>
      </div>
    </main>
  );
}
