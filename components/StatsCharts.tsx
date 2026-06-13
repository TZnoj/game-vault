"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RatingRow = {
  rating: string;
  count: number;
};

type MonthRow = {
  month: string;
  count: number;
};

type GenreRow = {
  genre: string;
  count: number;
  percentage: number;
};

export function RatingsDistributionChart({ data }: { data: RatingRow[] }) {
  return (
    <ChartCard title="Ratings Distribution">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis dataKey="rating" stroke="#a1a1aa" />
          <YAxis stroke="#a1a1aa" allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.08)" }}
            contentStyle={{
              background: "#18181b",
              border: "1px solid #3f3f46",
              color: "white",
            }}
          />
          <Bar dataKey="count" fill="#e4e4e7" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 flex flex-wrap gap-2">
        {data.map((row) => (
          <Link
            key={row.rating}
            href={`/?rating=${encodeURIComponent(row.rating)}`}
            className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:border-zinc-400 hover:text-white"
          >
            {row.rating}/10
          </Link>
        ))}
      </div>
    </ChartCard>
  );
}

export function CompletedByMonthChart({ data }: { data: MonthRow[] }) {
  return (
    <ChartCard title="Games Completed By Month">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis dataKey="month" stroke="#a1a1aa" />
          <YAxis stroke="#a1a1aa" allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.08)" }}
            contentStyle={{
              background: "#18181b",
              border: "1px solid #3f3f46",
              color: "white",
            }}
          />
          <Bar dataKey="count" fill="#e4e4e7" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function GenreBreakdownChart({ data }: { data: GenreRow[] }) {
  return (
    <ChartCard title="Genre Breakdown">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="genre"
            outerRadius={100}
            label={(entry) => {
  const payload = entry.payload as {
    genre: string;
    percentage: number;
  };

  return `${payload.genre} ${payload.percentage.toFixed(0)}%`;
}}
          >
            {data.map((entry) => (
              <Cell key={entry.genre} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#18181b",
              border: "1px solid #3f3f46",
              color: "white",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}
