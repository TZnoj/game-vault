import Link from "next/link";
import { getIsAdmin } from "@/lib/adminAuth";

export async function NavBar() {
  const isAdmin = await getIsAdmin();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/95 px-8 py-4 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link href="/" className="text-lg font-bold hover:text-zinc-300">Game Vault</Link>
        <nav className="flex flex-wrap items-center gap-2">
          <NavLink href="/">Library</NavLink>
          <NavLink href="/recommendation">Recommendations</NavLink>
          <NavLink href="/stats">Stats</NavLink>
          <NavLink href="/years">Years</NavLink>
          <NavLink href="/hall-of-fame">Hall of Fame</NavLink>
          <NavLink href="/timeline">Timeline</NavLink>
          <NavLink href="/goals">Goals</NavLink>
          <NavLink href="/platforms">Platforms</NavLink>
          <NavLink href="/franchises">Franchises</NavLink>
          <NavLink href="/backlog">Backlog</NavLink>
          {isAdmin && (
            <Link href="/admin" title="Admin" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-600 hover:border-zinc-600 hover:text-zinc-300">⚙</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white">{children}</Link>;
}
