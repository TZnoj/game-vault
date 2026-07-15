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
    dateStarted?: Date | string | null;
    dateCompleted?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
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
  // Ratings affect confidence only slightly. They do not invent candidate ratings.
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

  // These are tag-based estimates. Candidate games in the backlog usually have no review scores yet.
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


export type RecommendedNextItem = {
  game: {
    id: number;
    title: string;
    coverArtUrl: string | null;
    hltbMain: number | null;
    genres: string[];
  };
  match: number;
  sourceTitles: string[];
  reasons: string[];
  differenceReasons: string[];
};

export type RecommendedNextCollection = {
  primary: RecommendedNextItem[];
  surprise: RecommendedNextItem[];
  context: {
    currentlyPlaying: string[];
    recentlyCompleted: string[];
    fatiguedGenres: string[];
  };
};

function toTimestamp(value: Date | string | null | undefined) {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function latestCompletedTimestamp(game: RecommendationGame) {
  return Math.max(
    0,
    ...game.userGames
      .filter((copy) => copy.status === "COMPLETED")
      .map((copy) =>
        Math.max(
          toTimestamp(copy.dateCompleted),
          toTimestamp(copy.updatedAt),
          toTimestamp(copy.createdAt),
        ),
      ),
  );
}

function recentRecommendationSources(games: RecommendationGame[]) {
  const currentlyPlaying = games
    .filter((game) =>
      game.userGames.some((copy) => copy.status === "PLAYING" || copy.status === "REPLAYING"),
    )
    .sort((a, b) => normalizeTitle(a.title).localeCompare(normalizeTitle(b.title)));

  const recentlyCompleted = games
    .filter((game) => game.userGames.some((copy) => copy.status === "COMPLETED"))
    .sort((a, b) => latestCompletedTimestamp(b) - latestCompletedTimestamp(a))
    .slice(0, 3);

  const seen = new Set<number>();
  const sources = [...currentlyPlaying, ...recentlyCompleted].filter((game) => {
    if (seen.has(game.id)) return false;
    seen.add(game.id);
    return true;
  });

  return { currentlyPlaying, recentlyCompleted, sources };
}

function recentGenreCounts(sources: RecommendationGame[]) {
  const counts = new Map<string, { label: string; count: number }>();
  for (const source of sources) {
    const unique = new Map(
      genreNames(source).map((name) => [normalize(name), name] as const),
    );
    for (const [key, label] of unique) {
      const current = counts.get(key);
      counts.set(key, { label, count: (current?.count ?? 0) + 1 });
    }
  }
  return counts;
}

function genreFatiguePenalty(candidate: RecommendationGame, counts: Map<string, { label: string; count: number }>) {
  let penalty = 0;
  for (const genre of genreNames(candidate)) {
    const recent = counts.get(normalize(genre));
    if (!recent) continue;
    // Even one recent appearance creates a meaningful soft penalty. Repeated appearances strengthen it.
    penalty += 16 + Math.max(0, recent.count - 1) * 8;
  }
  return Math.min(48, penalty);
}

function sharedGenreCount(a: RecommendedNextItem, b: RecommendedNextItem) {
  const left = new Set(a.game.genres.map(normalize));
  return b.game.genres.filter((genre) => left.has(normalize(genre))).length;
}

function diversifyRecommendedNext(items: RecommendedNextItem[]) {
  const remaining = [...items];
  const ordered: RecommendedNextItem[] = [];

  while (remaining.length) {
    const batch: RecommendedNextItem[] = [];
    while (batch.length < 3 && remaining.length) {
      let bestIndex = 0;
      let bestScore = Number.NEGATIVE_INFINITY;

      remaining.forEach((item, index) => {
        const overlapPenalty = batch.reduce(
          (total, selected) => total + sharedGenreCount(item, selected) * 24,
          0,
        );
        const score = item.match - overlapPenalty;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      });

      batch.push(remaining.splice(bestIndex, 1)[0]);
    }
    ordered.push(...batch);
  }

  return ordered;
}

export function buildRecommendedNext(
  games: RecommendationGame[],
  poolLimit = 18,
): RecommendedNextCollection {
  const { currentlyPlaying, recentlyCompleted, sources } = recentRecommendationSources(games);
  const candidates = getEligibleCandidates(games);
  const genreCounts = recentGenreCounts(sources);
  const fatiguedGenres = [...genreCounts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((entry) => entry.label);

  if (!sources.length || !candidates.length) {
    return {
      primary: [],
      surprise: [],
      context: {
        currentlyPlaying: currentlyPlaying.map((game) => game.title),
        recentlyCompleted: recentlyCompleted.map((game) => game.title),
        fatiguedGenres,
      },
    };
  }

  const scored = candidates
    .map((candidate) => {
      const pairResults = sources
        .filter((source) => source.id !== candidate.id)
        .map((source) => scorePair(source, candidate))
        .sort((a, b) => b.match - a.match);

      const best = pairResults[0];
      if (!best) return null;

      const candidateGenres = genreNames(candidate);
      const fatiguePenalty = genreFatiguePenalty(candidate, genreCounts);
      const adjustedMatch = clamp(best.match - fatiguePenalty);
      const sourceTitles = pairResults
        .filter((result) => result.match >= Math.max(35, best.match - 12))
        .slice(0, 2)
        .map((result) => result.sourceGame?.title)
        .filter((title): title is string => typeof title === "string");

      const repeatedGenres = candidateGenres.filter((genre) => genreCounts.has(normalize(genre)));
      const avoidedGenres = fatiguedGenres
        .filter((genre) => !candidateGenres.some((candidateGenre) => normalize(candidateGenre) === normalize(genre)))
        .slice(0, 2);

      const differenceReasons: string[] = [];
      if (avoidedGenres.length) {
        differenceReasons.push(`A change of pace from recent ${avoidedGenres.join(" and ")} games`);
      }
      if (repeatedGenres.length) {
        differenceReasons.push(
          `Still a strong fit despite the recent ${repeatedGenres.slice(0, 2).join(" / ")} rotation`,
        );
      } else {
        differenceReasons.push("Avoids the main genres in your current rotation");
      }

      const recentLengths = sources
        .map((source) => source.hltbMain)
        .filter((value): value is number => typeof value === "number" && value > 0);
      const averageRecentLength = recentLengths.length
        ? recentLengths.reduce((sum, value) => sum + value, 0) / recentLengths.length
        : null;

      if (
        averageRecentLength != null &&
        candidate.hltbMain != null &&
        candidate.hltbMain <= averageRecentLength * 0.65
      ) {
        differenceReasons.push("A shorter reset after your recent games");
      }

      const reasons = [...new Set(best.reasons)]
        .filter((reason) => !reason.toLowerCase().startsWith("same "))
        .slice(0, 3);

      return {
        item: {
          game: {
            id: candidate.id,
            title: candidate.title,
            coverArtUrl: candidate.coverArtUrl,
            hltbMain: candidate.hltbMain,
            genres: candidateGenres,
          },
          match: adjustedMatch,
          sourceTitles,
          reasons,
          differenceReasons: differenceReasons.slice(0, 2),
        } satisfies RecommendedNextItem,
        baseMatch: best.match,
        fatiguePenalty,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .filter((entry) => entry.baseMatch >= 35)
    .sort(
      (a, b) =>
        b.item.match - a.item.match ||
        a.fatiguePenalty - b.fatiguePenalty ||
        a.item.game.title.localeCompare(b.item.game.title),
    );

  const primary = diversifyRecommendedNext(scored.map((entry) => entry.item)).slice(0, poolLimit);

  // Surprise keeps quality safeguards but draws from a wider, less obvious pool.
  const surprise = scored
    .filter((entry) => entry.baseMatch >= 42)
    .sort(
      (a, b) =>
        a.item.match - b.item.match ||
        a.fatiguePenalty - b.fatiguePenalty ||
        a.item.game.title.localeCompare(b.item.game.title),
    )
    .map((entry) => entry.item)
    .slice(0, Math.max(poolLimit, 24));

  return {
    primary,
    surprise,
    context: {
      currentlyPlaying: currentlyPlaying.map((game) => game.title),
      recentlyCompleted: recentlyCompleted.map((game) => game.title),
      fatiguedGenres,
    },
  };
}
