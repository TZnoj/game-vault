import Link from "next/link";
import { prisma } from "@/lib/prisma";

const YEARLY_GAME_GOAL = 20;
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

type GoalUserGame = {
  id: number;
  status: string;
  dateStarted: Date | null;
  dateCompleted: Date | null;
  hoursPlayed: number | null;
  platform: {
    name: string;
  } | null;
  game: {
    id: number;
    title: string;
    hltbMain: number | null;
  };
  reviews: {
    overallRating: number | null;
  }[];
};

type MonthlyTotal = {
  monthIndex: number;
  name: string;
  shortName: string;
  count: number;
  isFuture: boolean;
  isCurrent: boolean;
};

export default async function GoalsPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth();
  const monthStart = new Date(currentYear, currentMonthIndex, 1);
  const nextMonthStart = new Date(currentYear, currentMonthIndex + 1, 1);
  const currentMonthProgress = clamp(
    (now.getTime() - monthStart.getTime()) /
      (nextMonthStart.getTime() - monthStart.getTime()),
    0,
    1,
  );
  const elapsedMonths = currentMonthIndex + currentMonthProgress;

  const userGames = (await prisma.userGame.findMany({
    include: {
      game: true,
      platform: true,
      reviews: {
        orderBy: {
          reviewDate: "desc",
        },
      },
    },
  })) as GoalUserGame[];

  const completedThisYear = userGames
    .filter((userGame) => {
      if (userGame.status !== "COMPLETED" || !userGame.dateCompleted) {
        return false;
      }

      return new Date(userGame.dateCompleted).getFullYear() === currentYear;
    })
    .sort(
      (a, b) =>
        new Date(b.dateCompleted!).getTime() -
        new Date(a.dateCompleted!).getTime(),
    );

  const monthlyTotals: MonthlyTotal[] = MONTH_NAMES.map((name, monthIndex) => ({
    monthIndex,
    name,
    shortName: name.slice(0, 3),
    count: completedThisYear.filter(
      (userGame) =>
        userGame.dateCompleted &&
        new Date(userGame.dateCompleted).getMonth() === monthIndex,
    ).length,
    isFuture: monthIndex > currentMonthIndex,
    isCurrent: monthIndex === currentMonthIndex,
  }));

  const elapsedMonthlyTotals = monthlyTotals.slice(0, currentMonthIndex + 1);
  const fastestMonth = getFastestMonth(elapsedMonthlyTotals);
  const slowestMonth = getSlowestMonth(elapsedMonthlyTotals);
  const bestStreak = getLongestMonthStreak(elapsedMonthlyTotals, (count) => count > 0);
  const worstStreak = getLongestMonthStreak(elapsedMonthlyTotals, (count) => count === 0);
  const maximumMonthlyCount = Math.max(
    ...monthlyTotals.map((month) => month.count),
    1,
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

  const rawProgressPercent =
    (completedThisYear.length / YEARLY_GAME_GOAL) * 100;
  const progressPercent = clamp(rawProgressPercent, 0, 100);
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

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Annual goals
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">{currentYear} Goals</h1>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Your completion target, current pace, monthly performance, and every
            game finished this year.
          </p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8">
            <div>
              <p className="text-sm font-medium text-zinc-400">Annual Progress</p>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-5xl font-bold tracking-tight">
                  {completedThisYear.length}
                  <span className="text-2xl text-zinc-500"> / {YEARLY_GAME_GOAL}</span>
                </p>
                <p className="text-xl font-semibold text-zinc-300">
                  {rawProgressPercent.toFixed(1)}%
                </p>
              </div>
              <p className="mt-3 text-sm text-zinc-400">
                {remainingGames === 0
                  ? "Goal achieved — every additional completion extends your total."
                  : `${remainingGames} ${remainingGames === 1 ? "game" : "games"} remaining.`}
              </p>
            </div>

            <div
              className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                isOnTrack
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }`}
            >
              {isOnTrack ? "On pace to reach your goal" : "Behind the required pace"}
            </div>
          </div>

          <div className="border-t border-zinc-800 px-6 py-5 md:px-8">
            <div className="h-4 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-zinc-100 transition-[width] duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PaceCard
            label="Current Pace"
            value={`${projectedGames.toFixed(1)} games/year`}
            detail={`${averageGamesPerMonth.toFixed(2)} per elapsed month`}
          />
          <PaceCard
            label="Need"
            value={
              remainingGames === 0
                ? "Goal complete"
                : `${requiredGamesPerMonth.toFixed(1)} games/month`
            }
            detail={
              remainingGames === 0
                ? `${completedThisYear.length - YEARLY_GAME_GOAL} above goal`
                : `${remainingGames} games over ${remainingMonths.toFixed(1)} months`
            }
          />
          <PaceCard
            label="Current Month Progress"
            value={`${(currentMonthProgress * 100).toFixed(0)}%`}
            detail={`of ${MONTH_NAMES[currentMonthIndex]} has elapsed`}
          />
          <PaceCard
            label="Predicted Finish"
            value={`${Math.round(projectedGames)} games`}
            detail={`${projectedGames >= YEARLY_GAME_GOAL ? "+" : ""}${(
              projectedGames - YEARLY_GAME_GOAL
            ).toFixed(1)} versus goal`}
          />
        </section>

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Monthly pace
              </p>
              <h2 className="mt-1 text-2xl font-bold">Monthly Breakdown</h2>
            </div>
            <p className="text-sm text-zinc-500">
              Bars are scaled to your strongest month.
            </p>
          </div>

          <div className="mt-6 grid gap-x-8 gap-y-4 lg:grid-cols-2">
            {monthlyTotals.map((month) => {
              const barWidth =
                month.count === 0 ? 0 : (month.count / maximumMonthlyCount) * 100;

              return (
                <div
                  key={month.name}
                  className={`grid grid-cols-[5.5rem_1fr_2.25rem] items-center gap-3 ${
                    month.isFuture ? "opacity-40" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {month.name}
                    </p>
                    {month.isCurrent && (
                      <p className="text-[11px] text-zinc-500">Current month</p>
                    )}
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-zinc-200 transition-[width] duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <p className="text-right text-sm font-bold tabular-nums">
                    {month.count}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Fastest Month"
            value={fastestMonth ? fastestMonth.name : "N/A"}
            detail={fastestMonth ? pluralizeGames(fastestMonth.count) : undefined}
          />
          <StatCard
            label="Slowest Month"
            value={slowestMonth ? slowestMonth.name : "N/A"}
            detail={slowestMonth ? pluralizeGames(slowestMonth.count) : undefined}
          />
          <StatCard
            label="Average Per Month"
            value={averageGamesPerMonth.toFixed(2)}
            detail="Uses the partial current month"
          />
          <StatCard
            label="Best Streak"
            value={`${bestStreak.length} ${bestStreak.length === 1 ? "month" : "months"}`}
            detail={formatStreakRange(bestStreak)}
          />
          <StatCard
            label="Worst Streak"
            value={`${worstStreak.length} ${worstStreak.length === 1 ? "month" : "months"}`}
            detail={formatStreakRange(worstStreak)}
          />
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Hours This Year"
            value={`${completedHoursThisYear.toFixed(1)} hrs`}
          />
          <StatCard
            label="Average Rating"
            value={
              averageRatingThisYear != null
                ? `${averageRatingThisYear.toFixed(1)}/10`
                : "N/A"
            }
          />
          <StatCard
            label="Completed This Year"
            value={completedThisYear.length}
          />
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Completion log
              </p>
              <h2 className="mt-1 text-2xl font-bold">Completed This Year</h2>
            </div>
            <p className="text-sm text-zinc-500">Newest completion first</p>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            <div className="hidden grid-cols-[minmax(0,1fr)_9rem_7rem_7rem_10rem] gap-4 border-b border-zinc-800 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 md:grid">
              <span>Game</span>
              <span>Completed</span>
              <span>Hours</span>
              <span>Rating</span>
              <span>Platform</span>
            </div>

            {completedThisYear.length === 0 ? (
              <div className="px-5 py-12 text-center text-zinc-500">
                No games have been completed in {currentYear} yet.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {completedThisYear.map((userGame) => (
                  <Link
                    key={userGame.id}
                    href={`/game/${userGame.game.id}`}
                    className="grid gap-3 px-5 py-4 transition-colors hover:bg-zinc-800/70 md:grid-cols-[minmax(0,1fr)_9rem_7rem_7rem_10rem] md:items-center md:gap-4"
                  >
                    <p className="min-w-0 truncate font-semibold text-zinc-100">
                      {userGame.game.title}
                    </p>

                    <MobileField label="Completed">
                      {formatDate(userGame.dateCompleted)}
                    </MobileField>
                    <MobileField label="Hours">
                      {userGame.hoursPlayed != null
                        ? `${formatNumber(userGame.hoursPlayed)} hrs`
                        : "N/A"}
                    </MobileField>
                    <MobileField label="Rating">
                      {userGame.reviews[0]?.overallRating != null
                        ? `${formatNumber(userGame.reviews[0].overallRating)}/10`
                        : "N/A"}
                    </MobileField>
                    <MobileField label="Platform">
                      {userGame.platform?.name ?? "N/A"}
                    </MobileField>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function PaceCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-100">
        {value}
      </p>
      <p className="mt-1 text-sm text-zinc-400">{detail}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-zinc-100">{value}</p>
      {detail && <p className="mt-1 text-xs text-zinc-500">{detail}</p>}
    </div>
  );
}

function MobileField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm md:block">
      <span className="text-zinc-500 md:hidden">{label}</span>
      <span className="truncate text-right text-zinc-300 md:text-left">
        {children}
      </span>
    </div>
  );
}

function getFastestMonth(months: MonthlyTotal[]) {
  if (months.length === 0) return null;
  return months.reduce((fastest, month) =>
    month.count > fastest.count ? month : fastest,
  );
}

function getSlowestMonth(months: MonthlyTotal[]) {
  if (months.length === 0) return null;
  return months.reduce((slowest, month) =>
    month.count < slowest.count ? month : slowest,
  );
}

function getLongestMonthStreak(
  months: MonthlyTotal[],
  matches: (count: number) => boolean,
) {
  let bestStart = -1;
  let bestLength = 0;
  let currentStart = -1;
  let currentLength = 0;

  months.forEach((month, index) => {
    if (matches(month.count)) {
      if (currentLength === 0) currentStart = index;
      currentLength += 1;

      if (currentLength > bestLength) {
        bestLength = currentLength;
        bestStart = currentStart;
      }
    } else {
      currentStart = -1;
      currentLength = 0;
    }
  });

  return {
    length: bestLength,
    startMonth: bestStart >= 0 ? months[bestStart]?.name ?? null : null,
    endMonth:
      bestStart >= 0 && bestLength > 0
        ? months[bestStart + bestLength - 1]?.name ?? null
        : null,
  };
}

function formatStreakRange(streak: {
  length: number;
  startMonth: string | null;
  endMonth: string | null;
}) {
  if (streak.length === 0 || !streak.startMonth) return "No streak yet";
  if (streak.length === 1) return streak.startMonth;
  return `${streak.startMonth} – ${streak.endMonth}`;
}

function pluralizeGames(count: number) {
  return `${count} ${count === 1 ? "game" : "games"}`;
}

function formatDate(date: Date | string | null) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}
