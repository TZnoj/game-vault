import Link from "next/link";
import { prisma } from "@/lib/prisma";

const CURRENT_YEAR = new Date().getFullYear();
const YEARLY_GAME_GOAL = 20;

export default async function GoalsPage() {
  const userGames = await prisma.userGame.findMany({
    include: {
      game: true,
      reviews: {
        orderBy: {
          reviewDate: "desc",
        },
      },
    },
  });

  const completedThisYear = userGames.filter((userGame) => {
    if (userGame.status !== "COMPLETED" || !userGame.dateCompleted) {
      return false;
    }

    return new Date(userGame.dateCompleted).getFullYear() === CURRENT_YEAR;
  });

  const backlogGames = userGames.filter(
    (userGame) => userGame.status === "BACKLOG",
  );

  const backlogHours = backlogGames.reduce(
    (sum, userGame) =>
      sum + (userGame.game.hltbMain ?? userGame.hoursPlayed ?? 0),
    0,
  );

  const completedHoursThisYear = completedThisYear.reduce(
    (sum, userGame) => sum + (userGame.hoursPlayed ?? 0),
    0,
  );

  const ratingsThisYear = completedThisYear
    .map((userGame) => userGame.reviews[0]?.overallRating)
    .filter((rating): rating is number => rating != null);

  const averageRatingThisYear =
    ratingsThisYear.length > 0
      ? ratingsThisYear.reduce((sum, rating) => sum + rating, 0) /
        ratingsThisYear.length
      : null;

  const progressPercent = Math.min(
    (completedThisYear.length / YEARLY_GAME_GOAL) * 100,
    100,
  );

  const currentMonth = new Date().getMonth() + 1;
  const averageGamesPerMonth = completedThisYear.length / currentMonth;

  const projectedGames = averageGamesPerMonth * 12;

  const remainingGames = Math.max(
    YEARLY_GAME_GOAL - completedThisYear.length,
    0,
  );

  const remainingMonths = Math.max(12 - currentMonth, 1);

  const requiredGamesPerMonth =
    remainingGames > 0 ? remainingGames / remainingMonths : 0;

  const isOnTrack = projectedGames >= YEARLY_GAME_GOAL;

  const paceMessage = isOnTrack
    ? "You are on pace to hit your yearly goal."
    : "You need to increase your pace to hit your yearly goal.";

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="mt-4 text-4xl font-bold">Goals</h1>
          <p className="mt-2 text-zinc-400">
            Track your yearly completion progress and backlog.
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {CURRENT_YEAR} Completion Goal
            </h2>
            <p className="mt-1 text-zinc-400">
              {completedThisYear.length} / {YEARLY_GAME_GOAL} games completed
            </p>
          </div>

          <p className="text-3xl font-bold">{progressPercent.toFixed(0)}%</p>
        </div>

        <div className="h-4 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-zinc-100"
            style={{
              width: `${progressPercent}%`,
            }}
          />
        </div>
      </section>
      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-500">Current Pace</p>
          <p className="mt-1 text-3xl font-bold">
            {averageGamesPerMonth.toFixed(2)}
          </p>
          <p className="mt-1 text-sm text-zinc-400">games / month</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-500">Required Pace</p>
          <p className="mt-1 text-3xl font-bold">
            {requiredGamesPerMonth.toFixed(2)}
          </p>
          <p className="mt-1 text-sm text-zinc-400">games / month remaining</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-500">Forecast</p>
          <p className="mt-1 text-3xl font-bold">{projectedGames.toFixed(1)}</p>
          <p
            className={`mt-1 text-sm ${
              isOnTrack ? "text-emerald-400" : "text-yellow-400"
            }`}
          >
            {paceMessage}
          </p>
        </div>
      </section>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Completed This Year"
          value={completedThisYear.length}
        />
        <StatCard
          label="Projected Year-End"
          value={projectedGames.toFixed(1)}
        />
        <StatCard
          label="Hours This Year"
          value={completedHoursThisYear.toFixed(1)}
        />
        <StatCard
          label="Avg Rating This Year"
          value={
            averageRatingThisYear != null
              ? averageRatingThisYear.toFixed(1)
              : "N/A"
          }
        />
        <StatCard label="Backlog Games" value={backlogGames.length} />
        <StatCard label="Backlog Hours" value={backlogHours.toFixed(1)} />
        <StatCard
          label="Avg Games / Month"
          value={averageGamesPerMonth.toFixed(2)}
        />
        <StatCard
          label="Goal Remaining"
          value={Math.max(YEARLY_GAME_GOAL - completedThisYear.length, 0)}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">Completed This Year</h2>

        <div className="mt-4 divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          {completedThisYear.map((userGame) => (
            <Link
              key={userGame.id}
              href={`/game/${userGame.game.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-zinc-800"
            >
              <div>
                <p className="font-semibold">{userGame.game.title}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {formatDate(userGame.dateCompleted)}
                </p>
              </div>

              <div className="text-right">
                <p className="font-semibold">
                  {userGame.reviews[0]?.overallRating != null
                    ? `${userGame.reviews[0].overallRating}/10`
                    : "N/A"}
                </p>
                <p className="text-sm text-zinc-500">
                  {userGame.hoursPlayed != null
                    ? `${userGame.hoursPlayed} hrs`
                    : "N/A"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function formatDate(date: Date | string | null) {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}
