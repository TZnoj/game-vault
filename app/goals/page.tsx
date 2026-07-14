import Link from "next/link";
import { prisma } from "@/lib/prisma";

const YEARLY_GAME_GOAL = 20;

type GoalUserGame = {
  id: number;
  status: string;
  dateCompleted: Date | null;
  hoursPlayed: number | null;
  game: {
    id: number;
    title: string;
    hltbMain: number | null;
  };
  reviews: {
    overallRating: number | null;
  }[];
};

export default async function GoalsPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth();
  const monthStart = new Date(currentYear, currentMonthIndex, 1);
  const nextMonthStart = new Date(currentYear, currentMonthIndex + 1, 1);
  const currentMonthProgress = Math.min(
    Math.max(
      (now.getTime() - monthStart.getTime()) /
        (nextMonthStart.getTime() - monthStart.getTime()),
      0,
    ),
    1,
  );
  const elapsedMonths = currentMonthIndex + currentMonthProgress;

  const userGames = (await prisma.userGame.findMany({
    include: {
      game: true,
      reviews: {
        orderBy: {
          reviewDate: "desc",
        },
      },
    },
    })) as GoalUserGame[];

  const completedThisYear = userGames.filter((userGame: GoalUserGame) => {
    if (userGame.status !== "COMPLETED" || !userGame.dateCompleted) {
      return false;
    }

    return new Date(userGame.dateCompleted).getFullYear() === currentYear;
  }).sort((a, b) => {
    return (
      new Date(b.dateCompleted!).getTime() -
      new Date(a.dateCompleted!).getTime()
    );
  });

  const backlogGames = userGames.filter(
    (userGame: GoalUserGame) => userGame.status === "BACKLOG",
  );

  const backlogHours = backlogGames.reduce(
    (sum, userGame: GoalUserGame) =>
      sum + (userGame.game.hltbMain ?? userGame.hoursPlayed ?? 0),
    0,
  );

  const completedHoursThisYear = completedThisYear.reduce(
    (sum, userGame: GoalUserGame) => sum + (userGame.hoursPlayed ?? 0),
    0,
  );

  const ratingsThisYear = completedThisYear
    .map((userGame: GoalUserGame) => userGame.reviews[0]?.overallRating)
    .filter((rating): rating is number => rating != null);

  const averageRatingThisYear =
    ratingsThisYear.length > 0
      ? ratingsThisYear.reduce((sum: number, rating: number) => sum + rating, 0) /
        ratingsThisYear.length
      : null;

  const progressPercent = Math.min(
    (completedThisYear.length / YEARLY_GAME_GOAL) * 100,
    100,
  );

  const averageGamesPerMonth =
    elapsedMonths > 0 ? completedThisYear.length / elapsedMonths : 0;

  const projectedGames = averageGamesPerMonth * 12;

  const remainingGames = Math.max(
    YEARLY_GAME_GOAL - completedThisYear.length,
    0,
  );

  const remainingMonths = Math.max(12 - elapsedMonths, 0);

  const requiredGamesPerMonth =
    remainingGames > 0 && remainingMonths > 0
      ? remainingGames / remainingMonths
      : 0;

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
              {currentYear} Completion Goal
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
          <p className="mt-1 text-sm text-zinc-400">games / elapsed month</p>
          <p className="mt-2 text-xs text-zinc-500">
            {formatMonthProgress(now, currentMonthProgress)}
          </p>
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

      <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-lg font-bold">How pace is calculated</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Current pace divides completed games by the exact portion of the year
          elapsed. The current month counts fractionally, so an incomplete month
          no longer counts as a full month. Completed games below are ordered by
          completion date, newest first.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">Completed This Year</h2>

        <div className="mt-4 divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          {completedThisYear.map((userGame: GoalUserGame) => (
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

function formatMonthProgress(date: Date, progress: number) {
  const month = date.toLocaleDateString("en-CA", { month: "long" });
  return `${(progress * 100).toFixed(1)}% of ${month} has elapsed`;
}

function formatDate(date: Date | string | null) {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}
