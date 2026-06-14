import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function EnrichmentPage() {
  const runs = await prisma.enrichmentRun.findMany({
    orderBy: {
      startedAt: "desc",
    },
    take: 25,
    include: {
      logs: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  const totalRuns = runs.length;

  const totalChecked = runs.reduce(
    (sum, run) => sum + run.gamesChecked,
    0,
  );

  const totalUpdated = runs.reduce(
    (sum, run) => sum + run.gamesUpdated,
    0,
  );

  const totalFailed = runs.reduce(
    (sum, run) => sum + run.gamesFailed,
    0,
  );

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Enrichment Logs</h1>
            <p className="mt-2 text-zinc-400">
              Nightly metadata refresh history.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 hover:border-zinc-400"
          >
            ← Admin
          </Link>
        </div>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Runs" value={totalRuns} />
          <StatCard label="Games Checked" value={totalChecked} />
          <StatCard label="Games Updated" value={totalUpdated} />
          <StatCard label="Games Failed" value={totalFailed} />
        </section>

        <div className="space-y-6">
          {runs.map((run) => (
            <section
              key={run.id}
              className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
            >
              <div className="border-b border-zinc-800 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      Run #{run.id}
                    </h2>

                    <p className="mt-1 text-sm text-zinc-400">
                      Started: {formatDateTime(run.startedAt)}
                    </p>

                    <p className="text-sm text-zinc-400">
                      Finished:{" "}
                      {run.finishedAt
                        ? formatDateTime(run.finishedAt)
                        : "Still Running"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm">
                    <Badge>
                      Checked {run.gamesChecked}
                    </Badge>

                    <Badge>
                      Updated {run.gamesUpdated}
                    </Badge>

                    <Badge>
                      Failed {run.gamesFailed}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-zinc-800">
                {run.logs.length === 0 ? (
                  <div className="p-4 text-sm text-zinc-500">
                    No logs recorded.
                  </div>
                ) : (
                  run.logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-col gap-2 p-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div>
                        <div className="font-medium">
                          {log.gameTitle}
                        </div>

                        <div className="mt-1 text-sm text-zinc-400">
                          Status: {log.status}
                        </div>

                        {log.error && (
                          <div className="mt-1 text-sm text-red-400">
                            {log.error}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {log.changedFields.length === 0 ? (
                          <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-500">
                            No Changes
                          </span>
                        ) : (
                          log.changedFields.map((field) => (
                            <span
                              key={field}
                              className="rounded-full border border-emerald-700 bg-emerald-950 px-3 py-1 text-xs text-emerald-300"
                            >
                              {field}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full border border-zinc-700 px-3 py-1">
      {children}
    </span>
  );
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}