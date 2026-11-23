import type {
  PersonalityConfig,
  PersonalityResult,
  PersonalityTraitScore,
  SubtestKind,
} from "@/types/assessment";

export function countSubtestItems(kind: SubtestKind, rawQuestionCount: number, config: unknown): number {
  if (kind === "QUIZ" || typeof config !== "object" || config === null) {
    return rawQuestionCount;
  }
  const c = config as Record<string, unknown>;
  if (kind === "PERSONALITY" && Array.isArray(c.statements)) {
    return c.statements.length;
  }
  if (kind === "PAULI" && typeof c.columns === "number") {
    return c.columns;
  }
  if (kind === "DRAWING" && Array.isArray(c.tasks)) {
    return c.tasks.length;
  }
  return rawQuestionCount;
}

export function resolveSubtestDuration(
  kind: SubtestKind,
  durationSeconds: number | undefined,
  config: unknown,
): number {
  if (durationSeconds && durationSeconds > 0) {
    return durationSeconds;
  }
  if (typeof config === "object" && config !== null) {
    if (kind === "PAULI") {
      const c = config as { columns?: number; secondsPerColumn?: number };
      return (c.columns ?? 10) * (c.secondsPerColumn ?? 30);
    }
    if (kind === "DRAWING") {
      const c = config as { tasks?: Array<{ seconds?: number }> };
      return Array.isArray(c.tasks) ? c.tasks.reduce((sum, t) => sum + (t.seconds || 0), 0) : 300;
    }
  }
  return 0;
}

export function scorePersonality(
  config: PersonalityConfig,
  ratings: Array<number | null>,
): PersonalityResult {
  const statements = Array.isArray(config?.statements) ? config.statements : [];
  const traits = Array.isArray(config?.traits) ? config.traits : [];
  const totalsByTrait = new Map<string, { score: number; count: number }>();
  let answered = 0;

  statements.forEach((stmt, idx) => {
    const raw = ratings[idx];
    if (typeof raw === "number" && Number.isInteger(raw) && raw >= 1 && raw <= 5) {
      answered += 1;
      const points = stmt.reverse ? 6 - raw : raw;
      const current = totalsByTrait.get(stmt.trait) ?? { score: 0, count: 0 };
      current.score += points;
      current.count += 1;
      totalsByTrait.set(stmt.trait, current);
    }
  });

  const traitResults: PersonalityTraitScore[] = traits.map((trait) => {
    const stat = totalsByTrait.get(trait.key) ?? { score: 0, count: 0 };
    if (stat.count === 0) {
      return {
        key: trait.key,
        name: trait.name,
        description: trait.description,
        score: 0,
        maxScore: 0,
        percent: 0,
        level: "Belum dijawab",
        meaning: "Belum ada pernyataan yang dijawab pada aspek ini.",
      };
    }
    const maxScore = stat.count * 5;
    const percent = Math.round(((stat.score - stat.count) / (stat.count * 4)) * 100);
    const level: "Tinggi" | "Sedang" | "Rendah" =
      percent >= 65 ? "Tinggi" : percent <= 35 ? "Rendah" : "Sedang";
    const meaning =
      level === "Tinggi"
        ? trait.highMeaning
        : level === "Rendah"
          ? trait.lowMeaning
          : "Skormu berada di rentang tengah — seimbang antara dua kutub sifat ini.";
    return {
      key: trait.key,
      name: trait.name,
      description: trait.description,
      score: stat.score,
      maxScore,
      percent,
      level,
      meaning,
    };
  });

  return {
    kind: "PERSONALITY",
    answered,
    total: statements.length,
    traits: traitResults,
  };
}
