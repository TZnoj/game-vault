import { EmptyState } from "@/components/ui/EmptyState";
export default function NotFound() {
  return <main className="min-h-[70vh] bg-zinc-950 p-8 text-white"><div className="mx-auto max-w-3xl"><EmptyState title="That page is not in the vault" description="The game or collection page may have moved, been deleted, or never existed." actionHref="/" actionLabel="Return to Game Vault" icon="🗃️" /></div></main>;
}
