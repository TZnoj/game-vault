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

const STANDALONE = "standalone";
const normalize = (value: string) => value.trim().toLowerCase();

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

function ratingSimilarity(a: number | null | undefined, b: number | null | undefined) {
  if (a == null || b == null) return 50;
  return clamp(100 - Math.abs(a - b) * 12.5);
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
  const candidateReview = latestReview(candidate);
  const genreScore = overlapScore(sourceGenres, candidateGenres);

  const gameplay = clamp(
    genreScore * 0.7 +
      ratingSimilarity(sourceReview?.gameplayRating, candidateReview?.gameplayRating) * 0.3,
  );
  const story = clamp(
    genreScore * 0.45 + ratingSimilarity(sourceReview?.storyRating, candidateReview?.storyRating) * 0.55,
  );
  const art = clamp(
    genreScore * 0.3 + ratingSimilarity(sourceReview?.artRating, candidateReview?.artRating) * 0.7,
  );
  const length = lengthSimilarity(source.hltbMain, candidate.hltbMain);

  const sourceFranchise = validFranchise(source);
  const candidateFranchise = validFranchise(candidate);
  const sameFranchise = Boolean(
    sourceFranchise && candidateFranchise && sourceFranchise.id === candidateFranchise.id,
  );

  const match = clamp(
    gameplay * 0.35 + story * 0.25 + art * 0.1 + length * 0.15 + genreScore * 0.15 +
      (sameFranchise ? 8 : 0),
  );

  const reasons: string[] = [];
  sharedGenres.slice(0, 4).forEach((genre) => reasons.push(genre));
  if (sameFranchise && sourceFranchise) reasons.push(`Same ${sourceFranchise.name} franchise`);
  if (length >= 80) reasons.push("Similar game length");
  if (gameplay >= 85) reasons.push("Very similar gameplay profile");
  if (story >= 85) reasons.push("Strong story match");
  if (art >= 85) reasons.push("Similar art-score profile");
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

function isCandidate(game: RecommendationGame) {
  return game.userGames.some((copy) => copy.status === "BACKLOG");
}

function isLiked(game: RecommendationGame) {
  const review = latestReview(game);
  return game.userGames.some((copy) => copy.status === "COMPLETED") &&
    (review?.overallRating ?? 0) >= 7.5;
}

export function buildPersonalRecommendations(games: RecommendationGame[], limitPerType = 6) {
  const sources = shuffled(games.filter(isLiked))
    .sort((a, b) => (latestReview(b)?.overallRating ?? 0) - (latestReview(a)?.overallRating ?? 0))
    .slice(0, 12);
  const candidates = games.filter(isCandidate);

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
  candidates: RecommendationGame[],
  limit = 8,
) {
  return shuffled(candidates)
    .filter((candidate) => candidate.id !== source.id)
    .map((candidate) => scorePair(source, candidate))
    .filter((result) => result.match >= 35)
    .sort((a, b) => b.match - a.match)
    .slice(0, limit);
}
