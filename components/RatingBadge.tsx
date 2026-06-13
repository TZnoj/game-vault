export function RatingBadge({
  rating,
  compact = false,
}: {
  rating: number | null | undefined;
  compact?: boolean;
}) {
  const style = getRatingStyle(rating);

  return (
    <span
      className={`inline-flex items-center justify-center gap-1 rounded-lg border font-bold ${style.className} ${
        compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
      }`}
    >
      <span>{style.icon}</span>
      <span>{rating != null ? `${rating}/10` : "N/A"}</span>
    </span>
  );
}

export function getRatingStyle(rating: number | null | undefined) {
  if (rating === 10) {
    return {
      icon: "◇",
      className: "border-sky-400/50 bg-sky-400/10 text-sky-300",
    };
  }

  if (rating === 9) {
    return {
      icon: "★",
      className: "border-yellow-400/50 bg-yellow-400/10 text-yellow-300",
    };
  }

  if (rating === 8) {
    return {
      icon: "☆",
      className: "border-zinc-300/50 bg-zinc-300/10 text-zinc-200",
    };
  }

  if (rating === 7) {
    return {
      icon: "☆",
      className: "border-orange-400/50 bg-orange-400/10 text-orange-300",
    };
  }

  if (rating === 6) {
    return {
      icon: "●",
      className: "border-yellow-600/50 bg-yellow-600/10 text-yellow-500",
    };
  }

  if (rating != null && rating <= 5) {
    return {
      icon: "●",
      className: "border-red-500/50 bg-red-500/10 text-red-400",
    };
  }

  return {
    icon: "–",
    className: "border-zinc-700 bg-zinc-800 text-zinc-400",
  };
}