export type RecommendationGame = {
  id: number;
  title: string;
  coverArtUrl: string | null;
  hltbMain: number | null;
  franchiseId: number | null;
  franchise: { id: number; name: string } | null;
  gameGenres: { genreId: number; genre: { id: number; name: string } }[];
  userGames: {
    status: string;
    dateStarted: Date | string | null;
    dateCompleted: Date | string | null;
    hoursPlayed: number | null;
    reviews: {
      overallRating: number | null;
      gameplayRating: number | null;
      storyRating: number | null;
      artRating: number | null;
      musicRating: number | null;
    }[];
  }[];
};

export type RecommendationResult = {
  game: RecommendationGame;
  match: number;
  type: "VERY_SIMILAR" | "SAME_GENRE" | "SAME_FRANCHISE" | "HIDDEN_ALTERNATIVE" | "IF_YOU_LIKED";
  sourceGame: { id: number; title: string } | null;
  reasons: string[];
  breakdown: {
    gameplay: number;
    story: number;
    art: number;
    length: number;
  };
};

export type RecommendedNextData = {
  recentSources: { id: number; title: string; kind: "PLAYING" | "RECENTLY_COMPLETED" }[];
  recentGenres: string[];
  rankedPool: RecommendationResult[];
  surprisePool: RecommendationResult[];
};

const STANDALONE = "standalone";
const BLOCKED_RECOMMENDATION_STATUSES = new Set(["COMPLETED", "PLAYING", "REPLAYING"]);
const normalize = (value: string) => value.trim().toLowerCase();
const normalizeTitle = (value: string) => normalize(value).replace(/[^a-z0-9]+/g, " ").trim();

const GAMEPLAY_TERMS = [
  "action", "action rpg", "jrpg", "rpg", "srpg", "strategy", "tactical", "turn-based",
  "turn based", "soulslike", "platformer", "shooter", "fighting", "rhythm", "puzzle",
  "simulation", "sim", "monster collector", "roguelike", "roguelite", "stealth", "survival",
  "hack and slash", "musou", "metroidvania", "adventure",
];

const STORY_TERMS = [
  "story", "story heavy", "visual novel", "narrative", "mystery", "romance", "horror",
  "psychological", "character", "drama", "historical", "crime", "detective", "choice",
  "multiple endings", "social sim", "fantasy", "sci-fi", "science fiction",
];

const ART_TERMS = [
  "anime", "pixel", "pixel art", "2d", "3d", "stylized", "realistic", "fantasy", "dark fantasy",
  "sci-fi", "science fiction", "horror", "retro", "gothic", "colorful", "hand-drawn",
  "cel shaded", "cel-shaded", "noir",
];

function validFranchise(game: RecommendationGame) {
  const franchise = game.franchise;
  if (!franchise || normalize(franchise.name) === STANDALONE) return null;
  return franchise;
}

function genreNames(game: RecommendationGame) {
  return game.gameGenres.map((entry) => entry.genre.name);
}

function latestReview(game: RecommendationGame) {
  return game.userGames.flatMap((copy) => copy.reviews).find(Boolean) ?? null;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function overlapScore(a: string[], b: string[]) {
  const left = new Set(a.map(normalize));
  const right = new Set(b.map(normalize));
  if (!left.size || !right.size) return 0;
  const shared = [...left].filter((item) => right.has(item)).length;
  return (shared / Math.max(left.size, right.size)) * 100;
}

function matchingTags(tags: string[], terms: string[]) {
  return tags.filter((tag) => {
    const normalizedTag = normalize(tag);
    return terms.some((term) => normalizedTag.includes(term));
  });
}

function categorySimilarity(sourceTags: string[], candidateTags: string[], terms: string[], fallback: number) {
  const sourceCategoryTags = matchingTags(sourceTags, terms);
  const candidateCategoryTags = matchingTags(candidateTags, terms);

  if (!sourceCategoryTags.length || !candidateCategoryTags.length) {
    return clamp(fallback);
  }

  return clamp(overlapScore(sourceCategoryTags, candidateCategoryTags));
}

function preferenceBoost(rating: number | null | undefined) {
  if (rating == null) return 1;
  return 0.9 + (Math.max(0, Math.min(10, rating)) / 10) * 0.2;
}

function lengthSimilarity(a: number | null, b: number | null) {
  if (a == null || b == null) return 50;
  if (a === 0 && b === 0) return 100;
  const max = Math.max(a, b, 1);
  return clamp(100 - (Math.abs(a - b) / max) * 100);
}

function shuffled<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function scorePair(source: RecommendationGame, candidate: RecommendationGame): RecommendationResult {
  const sourceGenres = genreNames(source);
  const candidateGenres = genreNames(candidate);
  const sharedGenres = sourceGenres.filter((genre) =>
    candidateGenres.some((candidateGenre) => normalize(candidateGenre) === normalize(genre)),
  );

  const sourceReview = latestReview(source);
  const genreScore = overlapScore(sourceGenres, candidateGenres);

  const gameplay = clamp(
    categorySimilarity(sourceGenres, candidateGenres, GAMEPLAY_TERMS, genreScore) *
      preferenceBoost(sourceReview?.gameplayRating),
  );
  const story = clamp(
    categorySimilarity(sourceGenres, candidateGenres, STORY_TERMS, genreScore * 0.8 + 10) *
      preferenceBoost(sourceReview?.storyRating),
  );
  const art = clamp(
    categorySimilarity(sourceGenres, candidateGenres, ART_TERMS, genreScore * 0.65 + 15) *
      preferenceBoost(sourceReview?.artRating),
  );
  const length = lengthSimilarity(source.hltbMain, candidate.hltbMain);

  const sourceFranchise = validFranchise(source);
  const candidateFranchise = validFranchise(candidate);
  const sameFranchise = Boolean(
    sourceFranchise && candidateFranchise && sourceFranchise.id === candidateFranchise.id,
  );

  const match = clamp(
    gameplay * 0.35 + story * 0.2 + art * 0.1 + length * 0.15 + genreScore * 0.2 +
      (sameFranchise ? 8 : 0),
  );

  const reasons: string[] = [];
  sharedGenres.slice(0, 4).forEach((genre) => reasons.push(genre));
  if (sameFranchise && sourceFranchise) reasons.push(`Same ${sourceFranchise.name} franchise`);
  if (length >= 80) reasons.push("Similar game length");
  if (gameplay >= 80) reasons.push("Similar gameplay tags");
  if (story >= 80) reasons.push("Similar narrative themes");
  if (art >= 80) reasons.push("Similar visual themes");
  if (!reasons.length) reasons.push("Balanced overall similarity");

  let type: RecommendationResult["type"] = "IF_YOU_LIKED";
  if (sameFranchise) type = "SAME_FRANCHISE";
  else if (match >= 82 && sharedGenres.length >= 2) type = "VERY_SIMILAR";
  else if (sharedGenres.length >= 1) type = "SAME_GENRE";
  else if (match >= 55) type = "HIDDEN_ALTERNATIVE";

  return {
    game: candidate,
    match,
    type,
    sourceGame: { id: source.id, title: source.title },
    reasons,
    breakdown: { gameplay, story, art, length },
  };
}

function hasBlockedStatus(game: RecommendationGame) {
  return game.userGames.some((copy) => BLOCKED_RECOMMENDATION_STATUSES.has(copy.status));
}

function isBacklogOnly(game: RecommendationGame) {
  return game.userGames.length > 0 &&
    game.userGames.some((copy) => copy.status === "BACKLOG") &&
    game.userGames.every((copy) => copy.status === "BACKLOG");
}

function isLiked(game: RecommendationGame) {
  const review = latestReview(game);
  return game.userGames.some((copy) => copy.status === "COMPLETED") &&
    (review?.overallRating ?? 0) >= 7.5;
}

function getEligibleCandidates(games: RecommendationGame[], source?: RecommendationGame) {
  const blockedTitles = new Set(
    games
      .filter(hasBlockedStatus)
      .map((game) => normalizeTitle(game.title)),
  );

  const seenTitles = new Set<string>();
  const sourceTitle = source ? normalizeTitle(source.title) : null;

  return games.filter((game) => {
    const title = normalizeTitle(game.title);
    if (!title || title === sourceTitle) return false;
    if (blockedTitles.has(title)) return false;
    if (!isBacklogOnly(game)) return false;
    if (seenTitles.has(title)) return false;
    seenTitles.add(title);
    return true;
  });
}

function completionTimestamp(game: RecommendationGame) {
  return Math.max(
    0,
    ...game.userGames
      .filter((copy) => copy.status === "COMPLETED" && copy.dateCompleted)
      .map((copy) => new Date(copy.dateCompleted as Date | string).getTime()),
  );
}

function getRecentRecommendationSources(games: RecommendationGame[]) {
  const current = games.filter((game) =>
    game.userGames.some((copy) => copy.status === "PLAYING" || copy.status === "REPLAYING"),
  );

  const currentTitles = new Set(current.map((game) => normalizeTitle(game.title)));
  const recentlyCompleted = games
    .filter((game) => completionTimestamp(game) > 0 && !currentTitles.has(normalizeTitle(game.title)))
    .sort((a, b) => completionTimestamp(b) - completionTimestamp(a))
    .slice(0, 3);

  return [
    ...current.map((game) => ({ game, kind: "PLAYING" as const })),
    ...recentlyCompleted.map((game) => ({ game, kind: "RECENTLY_COMPLETED" as const })),
  ];
}

function addChangeOfPaceReasons(
  result: RecommendationResult,
  recentGenreCounts: Map<string, { label: string; count: number }>,
) {
  const candidateGenres = genreNames(result.game);
  const repeated = [...recentGenreCounts.values()]
    .filter((entry) => entry.count >= 2)
    .sort((a, b) => b.count - a.count);
  const avoided = repeated.find((entry) =>
    !candidateGenres.some((genre) => normalize(genre) === normalize(entry.label)),
  );

  const reasons = [...result.reasons];
  if (avoided) reasons.unshift(`A change from recent ${avoided.label} games`);
  else if (![...recentGenreCounts.keys()].some((genre) => candidateGenres.some((item) => normalize(item) === genre))) {
    reasons.unshift("A different genre from your recent games");
  }

  return { ...result, reasons: [...new Set(reasons)].slice(0, 5) };
}

export function buildRecommendedNext(games: RecommendationGame[]): RecommendedNextData {
  const recent = getRecentRecommendationSources(games);
  const sources = recent.map((entry) => entry.game);
  const candidates = getEligibleCandidates(games);

  if (!sources.length || !candidates.length) {
    return {
      recentSources: recent.map(({ game, kind }) => ({ id: game.id, title: game.title, kind })),
      recentGenres: [],
      rankedPool: [],
      surprisePool: [],
    };
  }

  const recentGenreCounts = new Map<string, { label: string; count: number }>();
  for (const source of sources) {
    for (const genre of genreNames(source)) {
      const key = normalize(genre);
      const existing = recentGenreCounts.get(key);
      recentGenreCounts.set(key, { label: existing?.label ?? genre, count: (existing?.count ?? 0) + 1 });
    }
  }

  const scored = candidates.map((candidate) => {
    const pairResults = sources
      .map((source) => scorePair(source, candidate))
      .sort((a, b) => b.match - a.match);
    const best = pairResults[0];
    const second = pairResults[1];
    const baseMatch = second ? best.match * 0.72 + second.match * 0.28 : best.match;

    let fatiguePenalty = 0;
    for (const candidateGenre of genreNames(candidate)) {
      const recentCount = recentGenreCounts.get(normalize(candidateGenre))?.count ?? 0;
      if (recentCount > 0) fatiguePenalty += 8 + Math.max(0, recentCount - 1) * 6;
    }
    fatiguePenalty = Math.min(32, fatiguePenalty);

    const hasFreshGenre = genreNames(candidate).some((genre) => !recentGenreCounts.has(normalize(genre)));
    const changeOfPaceBoost = hasFreshGenre ? 7 : 0;
    const adjustedMatch = clamp(baseMatch - fatiguePenalty + changeOfPaceBoost);

    return addChangeOfPaceReasons(
      { ...best, match: adjustedMatch, type: "IF_YOU_LIKED" },
      recentGenreCounts,
    );
  });

  const ranked = scored
    .filter((result) => result.match >= 25)
    .sort((a, b) => b.match - a.match);

  return {
    recentSources: recent.map(({ game, kind }) => ({ id: game.id, title: game.title, kind })),
    recentGenres: [...recentGenreCounts.values()]
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 6)
      .map((entry) => entry.label),
    rankedPool: ranked.slice(0, 24),
    surprisePool: ranked.slice(0, 50),
  };
}

export function buildPersonalRecommendations(games: RecommendationGame[], limitPerType = 6) {
  const sources = shuffled(games.filter(isLiked))
    .sort((a, b) => (latestReview(b)?.overallRating ?? 0) - (latestReview(a)?.overallRating ?? 0))
    .slice(0, 12);
  const candidates = getEligibleCandidates(games);

  const bestByCandidate = new Map<number, RecommendationResult>();
  for (const candidate of candidates) {
    for (const source of sources) {
      if (source.id === candidate.id) continue;
      const result = scorePair(source, candidate);
      const previous = bestByCandidate.get(candidate.id);
      if (!previous || result.match > previous.match) bestByCandidate.set(candidate.id, result);
    }
  }

  const all = shuffled([...bestByCandidate.values()]).sort((a, b) => b.match - a.match);
  const groups: Record<RecommendationResult["type"], RecommendationResult[]> = {
    VERY_SIMILAR: [], SAME_GENRE: [], SAME_FRANCHISE: [], HIDDEN_ALTERNATIVE: [], IF_YOU_LIKED: [],
  };

  for (const result of all) {
    const target = groups[result.type];
    if (target.length < limitPerType) target.push(result);
  }

  groups.IF_YOU_LIKED = all.slice(0, limitPerType);
  return groups;
}

export function buildRecommendationsForGame(
  source: RecommendationGame,
  games: RecommendationGame[],
  limit = 8,
) {
  return shuffled(getEligibleCandidates(games, source))
    .map((candidate) => scorePair(source, candidate))
    .filter((result) => result.match >= 35)
    .sort((a, b) => b.match - a.match)
    .slice(0, limit);
}
