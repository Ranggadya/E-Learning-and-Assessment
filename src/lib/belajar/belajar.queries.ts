import { unstable_cache } from "next/cache";
import { databasePool } from "@/lib/db/pool";
import { isValidAnonUserId } from "@/lib/english/logic";
import type {
  AdminLessonRow,
  LearningTrackSummary,
  LessonDetail,
  LessonLevel,
  LessonOrigin,
  LessonProgressStatus,
  LessonQuizPublicQuestion,
  LessonSearchHit,
  LessonSource,
  LessonStatus,
  LessonValidationItem,
  PrerequisiteInfo,
  TrackLessonItem,
} from "@/types/belajar";
import { BELAJAR_CACHE_TAG } from "./constants";
import { validateLessonBatch } from "./parser";

function isUndefinedTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "42P01"
  );
}

export async function ensureBelajarSchema(): Promise<void> {
  await databasePool.query(`
    CREATE TABLE IF NOT EXISTS learning_tracks (
      id          SERIAL PRIMARY KEY,
      slug        TEXT UNIQUE NOT NULL,
      title       TEXT NOT NULL,
      description TEXT,
      sort_order  INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS lessons (
      id                SERIAL PRIMARY KEY,
      track_id          INTEGER NOT NULL REFERENCES learning_tracks(id) ON DELETE CASCADE,
      chapter           TEXT,
      slug              TEXT UNIQUE NOT NULL,
      title             TEXT NOT NULL,
      level             TEXT NOT NULL CHECK (level IN ('pemula', 'menengah', 'lanjut')),
      sort_order        INTEGER NOT NULL,
      estimated_minutes INTEGER,
      origin            TEXT NOT NULL CHECK (origin IN ('original', 'translated', 'mixed')),
      status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed')),
      body_md           TEXT NOT NULL,
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS chapter TEXT;
    CREATE INDEX IF NOT EXISTS lessons_track_status_order_idx ON lessons (track_id, status, sort_order);
    CREATE INDEX IF NOT EXISTS lessons_fts_idx ON lessons USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body_md, '')));
    CREATE TABLE IF NOT EXISTS lesson_prerequisites (
      lesson_id   INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      requires_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      PRIMARY KEY (lesson_id, requires_id)
    );
    CREATE TABLE IF NOT EXISTS lesson_sources (
      id        SERIAL PRIMARY KEY,
      lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      title     TEXT NOT NULL,
      url       TEXT NOT NULL,
      license   TEXT,
      author    TEXT,
      changes   TEXT
    );
    CREATE INDEX IF NOT EXISTS lesson_sources_lesson_id_idx ON lesson_sources (lesson_id);
    CREATE TABLE IF NOT EXISTS lesson_progress (
      lesson_id  INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      user_key   TEXT NOT NULL,
      status     TEXT NOT NULL CHECK (status IN ('started', 'done')),
      quiz_score INTEGER,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (lesson_id, user_key)
    );
    CREATE INDEX IF NOT EXISTS lesson_progress_user_idx ON lesson_progress (user_key);
    INSERT INTO learning_tracks (slug, title, description, sort_order) VALUES
      ('fondasi', 'Fondasi Pemrograman & Web', 'Dasar cara kerja komputer, Git, terminal, HTTP, dan logika pemrograman.', 1),
      ('frontend', 'Frontend Engineering', 'HTML semantik, CSS modern, JavaScript, TypeScript, dan arsitektur UI komponen.', 2),
      ('backend', 'Backend Engineering', 'Server HTTP, REST API, autentikasi, validasi input, dan arsitektur layanan.', 3),
      ('database', 'Database & SQL', 'Pemodelan relasional, query PostgreSQL, indeks, transaksi, dan migrasi skema.', 4),
      ('devops', 'DevOps & Deployment', 'Linux dasar, container, CI/CD, pemantauan produksi, dan keamanan infrastruktur.', 5),
      ('system-design', 'System Design', 'Arsitektur sistem berskala besar: Load Balancer, Scalability, Caching, Database Replication, dan High Availability.', 6)
    ON CONFLICT (slug) DO NOTHING;
  `);
}

interface CachedTrackRow {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
  lesson_ids: number[];
}

const getCachedReviewedTracks = unstable_cache(
  async function queryReviewedTracks(): Promise<CachedTrackRow[]> {
    try {
      const res = await databasePool.query<{
        id: number;
        slug: string;
        title: string;
        description: string | null;
        sort_order: number;
        lesson_ids: number[] | null;
      }>(`
        SELECT t.id, t.slug, t.title, t.description, t.sort_order,
               COALESCE(
                 ARRAY_AGG(l.id ORDER BY l.sort_order, l.id) FILTER (WHERE l.id IS NOT NULL),
                 ARRAY[]::int[]
               ) AS lesson_ids
        FROM learning_tracks t
        LEFT JOIN lessons l ON l.track_id = t.id AND l.status = 'reviewed'
        GROUP BY t.id
        ORDER BY t.sort_order ASC, t.id ASC
      `);
      return res.rows.map((r) => ({
        ...r,
        lesson_ids: Array.isArray(r.lesson_ids) ? r.lesson_ids.map(Number) : [],
      }));
    } catch (error) {
      if (isUndefinedTableError(error)) return [];
      throw error;
    }
  },
  ["belajar:reviewed-tracks"],
  { tags: [BELAJAR_CACHE_TAG], revalidate: 3600 },
);

async function getUserProgressMap(
  userKey: string | null | undefined,
): Promise<Map<number, { status: LessonProgressStatus; quizScore: number | null }>> {
  const map = new Map<number, { status: LessonProgressStatus; quizScore: number | null }>();
  if (!userKey || !isValidAnonUserId(userKey)) {
    return map;
  }
  try {
    const res = await databasePool.query<{
      lesson_id: number;
      status: LessonProgressStatus;
      quiz_score: number | null;
    }>(
      `SELECT lesson_id, status, quiz_score FROM lesson_progress WHERE user_key = $1`,
      [userKey],
    );
    for (const row of res.rows) {
      map.set(row.lesson_id, { status: row.status, quizScore: row.quiz_score });
    }
  } catch (error) {
    if (!isUndefinedTableError(error)) throw error;
  }
  return map;
}

export async function getTracksWithProgress(
  userKey: string | null | undefined,
): Promise<LearningTrackSummary[]> {
  const [tracks, progressMap] = await Promise.all([
    getCachedReviewedTracks(),
    getUserProgressMap(userKey),
  ]);

  return tracks.map((t) => {
    const totalLessons = t.lesson_ids.length;
    let completedLessons = 0;
    for (const lid of t.lesson_ids) {
      if (progressMap.get(lid)?.status === "done") {
        completedLessons++;
      }
    }
    const progressPercent =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    return {
      id: t.id,
      slug: t.slug,
      title: t.title,
      description: t.description,
      sortOrder: t.sort_order,
      totalLessons,
      completedLessons,
      progressPercent,
    };
  });
}

interface RawTrackLesson {
  id: number;
  slug: string;
  title: string;
  chapter: string | null;
  level: LessonLevel;
  sort_order: number;
  estimated_minutes: number | null;
  origin: LessonOrigin;
  prereqs: Array<{ id: number; slug: string; title: string; trackSlug: string }> | null;
}

const getCachedTrackLessons = unstable_cache(
  async function queryTrackLessons(trackSlug: string): Promise<{
    track: { id: number; slug: string; title: string; description: string | null } | null;
    lessons: RawTrackLesson[];
  }> {
    try {
      const trackRes = await databasePool.query<{
        id: number;
        slug: string;
        title: string;
        description: string | null;
      }>(`SELECT id, slug, title, description FROM learning_tracks WHERE slug = $1`, [trackSlug]);
      const track = trackRes.rows[0] ?? null;
      if (!track) {
        return { track: null, lessons: [] };
      }

      const lessonsRes = await databasePool.query<RawTrackLesson>(
        `
        SELECT l.id, l.slug, l.title, l.chapter, l.level, l.sort_order, l.estimated_minutes, l.origin,
               COALESCE(
                 (
                   SELECT json_agg(
                     json_build_object(
                       'id', req.id,
                       'slug', req.slug,
                       'title', req.title,
                       'trackSlug', rt.slug
                     )
                     ORDER BY req.sort_order, req.id
                   )
                   FROM lesson_prerequisites lp
                   JOIN lessons req ON req.id = lp.requires_id AND req.status = 'reviewed'
                   JOIN learning_tracks rt ON rt.id = req.track_id
                   WHERE lp.lesson_id = l.id
                 ),
                 '[]'::json
               ) AS prereqs
        FROM lessons l
        WHERE l.track_id = $1 AND l.status = 'reviewed'
        ORDER BY l.sort_order ASC, l.id ASC
        `,
        [track.id],
      );
      return { track, lessons: lessonsRes.rows };
    } catch (error) {
      if (isUndefinedTableError(error)) return { track: null, lessons: [] };
      throw error;
    }
  },
  ["belajar:track-lessons"],
  { tags: [BELAJAR_CACHE_TAG], revalidate: 3600 },
);

export async function getTrackWithLessonsForUser(
  trackSlug: string,
  userKey: string | null | undefined,
): Promise<{
  track: LearningTrackSummary;
  lessons: TrackLessonItem[];
} | null> {
  const [{ track, lessons }, progressMap] = await Promise.all([
    getCachedTrackLessons(trackSlug),
    getUserProgressMap(userKey),
  ]);
  if (!track) {
    return null;
  }

  let completedLessons = 0;
  const items: TrackLessonItem[] = lessons.map((l) => {
    const prog = progressMap.get(l.id) ?? null;
    if (prog?.status === "done") {
      completedLessons++;
    }
    const rawPrereqs = Array.isArray(l.prereqs) ? l.prereqs : [];
    const unmetPrerequisites: PrerequisiteInfo[] = rawPrereqs
      .map((p) => ({
        ...p,
        isDone: progressMap.get(p.id)?.status === "done",
      }))
      .filter((p) => !p.isDone);

    return {
      id: l.id,
      slug: l.slug,
      title: l.title,
      chapter: l.chapter ?? null,
      level: l.level,
      sortOrder: l.sort_order,
      estimatedMinutes: l.estimated_minutes,
      origin: l.origin,
      progressStatus: prog?.status ?? null,
      quizScore: prog?.quizScore ?? null,
      unmetPrerequisites,
    };
  });

  const totalLessons = items.length;
  return {
    track: {
      id: track.id,
      slug: track.slug,
      title: track.title,
      description: track.description,
      sortOrder: 0,
      totalLessons,
      completedLessons,
      progressPercent:
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    },
    lessons: items,
  };
}

const getCachedPublishedLesson = unstable_cache(
  async function queryPublishedLesson(trackSlug: string, lessonSlug: string) {
    try {
      const res = await databasePool.query<{
        id: number;
        slug: string;
        title: string;
        chapter: string | null;
        track_id: number;
        track_slug: string;
        track_title: string;
        level: LessonLevel;
        sort_order: number;
        estimated_minutes: number | null;
        origin: LessonOrigin;
        body_md: string;
      }>(
        `
        SELECT l.id, l.slug, l.title, l.chapter, l.track_id,
               t.slug AS track_slug, t.title AS track_title,
               l.level, l.sort_order, l.estimated_minutes, l.origin, l.body_md
        FROM lessons l
        JOIN learning_tracks t ON t.id = l.track_id
        WHERE t.slug = $1 AND l.slug = $2 AND l.status = 'reviewed'
        `,
        [trackSlug, lessonSlug],
      );
      const lesson = res.rows[0];
      if (!lesson) return null;

      const [sourcesRes, prereqRes, siblingsRes] = await Promise.all([
        databasePool.query<{
          title: string;
          url: string;
          license: string | null;
          author: string | null;
          changes: string | null;
        }>(
          `SELECT title, url, license, author, changes FROM lesson_sources WHERE lesson_id = $1 ORDER BY id ASC`,
          [lesson.id],
        ),
        databasePool.query<{
          id: number;
          slug: string;
          title: string;
          track_slug: string;
        }>(
          `
          SELECT req.id, req.slug, req.title, rt.slug AS track_slug
          FROM lesson_prerequisites lp
          JOIN lessons req ON req.id = lp.requires_id AND req.status = 'reviewed'
          JOIN learning_tracks rt ON rt.id = req.track_id
          WHERE lp.lesson_id = $1
          ORDER BY req.sort_order ASC, req.id ASC
          `,
          [lesson.id],
        ),
        databasePool.query<{ slug: string; title: string }>(
          `SELECT slug, title FROM lessons WHERE track_id = $1 AND status = 'reviewed' ORDER BY sort_order ASC, id ASC`,
          [lesson.track_id],
        ),
      ]);

      const idx = siblingsRes.rows.findIndex((s) => s.slug === lesson.slug);
      return {
        lesson,
        sources: sourcesRes.rows as LessonSource[],
        prereqs: prereqRes.rows,
        prevLesson: idx > 0 ? siblingsRes.rows[idx - 1] : null,
        nextLesson:
          idx >= 0 && idx < siblingsRes.rows.length - 1 ? siblingsRes.rows[idx + 1] : null,
      };
    } catch (error) {
      if (isUndefinedTableError(error)) return null;
      throw error;
    }
  },
  ["belajar:published-lesson"],
  { tags: [BELAJAR_CACHE_TAG], revalidate: 3600 },
);

export async function getPublishedLessonDetail(
  trackSlug: string,
  lessonSlug: string,
  userKey: string | null | undefined,
): Promise<LessonDetail | null> {
  const [cached, progressMap] = await Promise.all([
    getCachedPublishedLesson(trackSlug, lessonSlug),
    getUserProgressMap(userKey),
  ]);
  if (!cached) {
    return null;
  }

  const prog = progressMap.get(cached.lesson.id) ?? null;
  return {
    id: cached.lesson.id,
    slug: cached.lesson.slug,
    title: cached.lesson.title,
    chapter: cached.lesson.chapter ?? null,
    trackId: cached.lesson.track_id,
    trackSlug: cached.lesson.track_slug,
    trackTitle: cached.lesson.track_title,
    level: cached.lesson.level,
    sortOrder: cached.lesson.sort_order,
    estimatedMinutes: cached.lesson.estimated_minutes,
    origin: cached.lesson.origin,
    bodyMd: cached.lesson.body_md,
    sources: cached.sources,
    prerequisites: cached.prereqs.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      trackSlug: p.track_slug,
      isDone: progressMap.get(p.id)?.status === "done",
    })),
    progressStatus: prog?.status ?? null,
    quizScore: prog?.quizScore ?? null,
    prevLesson: cached.prevLesson,
    nextLesson: cached.nextLesson,
  };
}

// Kuis pelajaran memakai tabel soal yang sudah ada (companies.slug = 'materi' & subtests.slug = lessonSlug).
export async function getLessonQuizQuestions(
  lessonSlug: string,
): Promise<LessonQuizPublicQuestion[]> {
  try {
    const res = await databasePool.query<{
      id: number;
      order_index: number;
      prompt: string;
      options: Array<{ key: string; label: string }>;
    }>(
      `
      SELECT q.id, q.order_index, q.prompt, q.options
      FROM questions q
      JOIN subtests s ON s.id = q.subtest_id
      JOIN test_packages p ON p.id = s.test_package_id
      JOIN companies c ON c.id = p.company_id
      WHERE c.slug = 'materi' AND s.slug = $1
      ORDER BY q.order_index ASC, q.id ASC
      `,
      [lessonSlug],
    );
    return res.rows.map((r) => ({
      id: r.id,
      orderIndex: r.order_index,
      prompt: r.prompt,
      options: Array.isArray(r.options) ? r.options : [],
    }));
  } catch (error) {
    if (isUndefinedTableError(error)) return [];
    throw error;
  }
}

export async function upsertLessonProgress(params: {
  userKey: string;
  lessonId: number;
  status: LessonProgressStatus;
  quizScore?: number | null;
}): Promise<boolean> {
  const check = await databasePool.query<{ id: number }>(
    `SELECT id FROM lessons WHERE id = $1 AND status = 'reviewed'`,
    [params.lessonId],
  );
  if (check.rowCount === 0) {
    return false;
  }

  await databasePool.query(
    `
    INSERT INTO lesson_progress (lesson_id, user_key, status, quiz_score, updated_at)
    VALUES ($1, $2, $3, $4, now())
    ON CONFLICT (lesson_id, user_key) DO UPDATE SET
      status = CASE
        WHEN lesson_progress.status = 'done' AND EXCLUDED.status = 'started' THEN 'done'
        ELSE EXCLUDED.status
      END,
      quiz_score = COALESCE(EXCLUDED.quiz_score, lesson_progress.quiz_score),
      updated_at = now()
    `,
    [params.lessonId, params.userKey, params.status, params.quizScore ?? null],
  );
  return true;
}

export async function gradeLessonQuiz(params: {
  userKey: string;
  lessonId: number;
  lessonSlug: string;
  answers: Array<{ questionId: number; selectedOption: string | null }>;
}): Promise<{
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  results: Array<{
    questionId: number;
    correctOption: string;
    isCorrect: boolean;
    explanation: string | null;
  }>;
} | null> {
  const keyRes = await databasePool.query<{
    id: number;
    correct_option: string;
    explanation: string | null;
  }>(
    `
    SELECT q.id, q.correct_option, q.explanation
    FROM questions q
    JOIN subtests s ON s.id = q.subtest_id
    JOIN test_packages p ON p.id = s.test_package_id
    JOIN companies c ON c.id = p.company_id
    WHERE c.slug = 'materi' AND s.slug = $1
    ORDER BY q.order_index ASC, q.id ASC
    `,
    [params.lessonSlug],
  );
  if (keyRes.rows.length === 0) {
    return null;
  }

  const answerMap = new Map<number, string | null>();
  for (const ans of params.answers) {
    answerMap.set(ans.questionId, ans.selectedOption);
  }

  let correctCount = 0;
  const results = keyRes.rows.map((row) => {
    const selected = answerMap.get(row.id) ?? null;
    const isCorrect = selected !== null && selected === row.correct_option;
    if (isCorrect) correctCount++;
    return {
      questionId: row.id,
      correctOption: row.correct_option,
      isCorrect,
      explanation: row.explanation,
    };
  });

  const totalQuestions = keyRes.rows.length;
  const scorePercent = Math.round((correctCount / totalQuestions) * 100);

  await upsertLessonProgress({
    userKey: params.userKey,
    lessonId: params.lessonId,
    status: "started",
    quizScore: scorePercent,
  });

  return { scorePercent, correctCount, totalQuestions, results };
}

export async function searchPublishedLessons(rawQuery: string): Promise<LessonSearchHit[]> {
  const q = rawQuery.trim();
  if (!q) {
    return [];
  }
  const escapedLike = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  try {
    const res = await databasePool.query<{
      id: number;
      slug: string;
      title: string;
      track_slug: string;
      track_title: string;
      level: LessonLevel;
      estimated_minutes: number | null;
      body_md: string;
    }>(
      `
      SELECT l.id, l.slug, l.title,
             t.slug AS track_slug, t.title AS track_title,
             l.level, l.estimated_minutes, l.body_md,
             ts_rank(
               to_tsvector('simple', coalesce(l.title, '') || ' ' || coalesce(l.body_md, '')),
               websearch_to_tsquery('simple', $1)
             ) AS rank
      FROM lessons l
      JOIN learning_tracks t ON t.id = l.track_id
      WHERE l.status = 'reviewed'
        AND (
          to_tsvector('simple', coalesce(l.title, '') || ' ' || coalesce(l.body_md, '')) @@ websearch_to_tsquery('simple', $1)
          OR l.title ILIKE $2 ESCAPE '\\'
          OR l.body_md ILIKE $2 ESCAPE '\\'
        )
      ORDER BY rank DESC, l.sort_order ASC
      LIMIT 30
      `,
      [q, escapedLike],
    );

    return res.rows.map((r) => {
      const cleanBody = r.body_md
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/[#>*`|_\-\[\]()]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const lowerBody = cleanBody.toLowerCase();
      const firstWord = q.toLowerCase().split(/\s+/)[0] ?? "";
      const pos = firstWord ? lowerBody.indexOf(firstWord) : -1;
      const start = pos > 50 ? pos - 50 : 0;
      const snippet =
        (start > 0 ? "…" : "") +
        cleanBody.slice(start, start + 180) +
        (cleanBody.length > start + 180 ? "…" : "");

      return {
        id: r.id,
        slug: r.slug,
        title: r.title,
        trackSlug: r.track_slug,
        trackTitle: r.track_title,
        level: r.level,
        estimatedMinutes: r.estimated_minutes,
        snippet,
      };
    });
  } catch (error) {
    if (isUndefinedTableError(error)) return [];
    throw error;
  }
}

export async function listAdminBelajarData(): Promise<{
  tracks: Array<{ id: number; slug: string; title: string; description: string | null; sortOrder: number }>;
  lessons: AdminLessonRow[];
}> {
  await ensureBelajarSchema();
  const [tracksRes, lessonsRes] = await Promise.all([
    databasePool.query<{
      id: number;
      slug: string;
      title: string;
      description: string | null;
      sort_order: number;
    }>(`SELECT id, slug, title, description, sort_order FROM learning_tracks ORDER BY sort_order ASC, id ASC`),
    databasePool.query<{
      id: number;
      slug: string;
      title: string;
      chapter: string | null;
      track_slug: string;
      track_title: string;
      level: LessonLevel;
      sort_order: number;
      estimated_minutes: number | null;
      origin: LessonOrigin;
      status: LessonStatus;
      prereqs: string[] | null;
      sources_count: string;
      updated_at: Date | string;
    }>(`
      SELECT l.id, l.slug, l.title, l.chapter,
             t.slug AS track_slug, t.title AS track_title,
             l.level, l.sort_order, l.estimated_minutes, l.origin, l.status, l.updated_at,
             COALESCE(
               (
                 SELECT ARRAY_AGG(req.slug ORDER BY req.sort_order, req.id)
                 FROM lesson_prerequisites lp
                 JOIN lessons req ON req.id = lp.requires_id
                 WHERE lp.lesson_id = l.id
               ),
               ARRAY[]::text[]
             ) AS prereqs,
             (SELECT COUNT(*)::text FROM lesson_sources ls WHERE ls.lesson_id = l.id) AS sources_count
      FROM lessons l
      JOIN learning_tracks t ON t.id = l.track_id
      ORDER BY t.sort_order ASC, l.sort_order ASC, l.id ASC
    `),
  ]);

  return {
    tracks: tracksRes.rows.map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      description: t.description,
      sortOrder: t.sort_order,
    })),
    lessons: lessonsRes.rows.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      chapter: l.chapter ?? null,
      trackSlug: l.track_slug,
      trackTitle: l.track_title,
      level: l.level,
      sortOrder: l.sort_order,
      estimatedMinutes: l.estimated_minutes,
      origin: l.origin,
      status: l.status,
      prerequisites: Array.isArray(l.prereqs) ? l.prereqs : [],
      sourcesCount: Number(l.sources_count),
      updatedAt:
        l.updated_at instanceof Date ? l.updated_at.toISOString() : String(l.updated_at),
    })),
  };
}

export async function previewOrImportLessonBatch(params: {
  files: Array<{ fileName: string; content: string }>;
  dryRun: boolean;
}): Promise<{
  ok: boolean;
  items: LessonValidationItem[];
  errors: string[];
  upsertedCount: number;
}> {
  await ensureBelajarSchema();
  const client = await databasePool.connect();
  try {
    const [tracksRes, existingLessonsRes] = await Promise.all([
      client.query<{ id: number; slug: string }>(`SELECT id, slug FROM learning_tracks`),
      client.query<{ id: number; slug: string }>(`SELECT id, slug FROM lessons`),
    ]);

    const trackIdBySlug = new Map<string, number>();
    const existingTrackSlugs = new Set<string>();
    for (const row of tracksRes.rows) {
      trackIdBySlug.set(row.slug, row.id);
      existingTrackSlugs.add(row.slug);
    }

    const existingLessonSlugs = new Set<string>(existingLessonsRes.rows.map((r) => r.slug));

    const batch = validateLessonBatch(params.files, existingTrackSlugs, existingLessonSlugs);
    if (!batch.ok || params.dryRun) {
      return {
        ok: batch.ok,
        items: batch.items,
        errors: batch.errors,
        upsertedCount: 0,
      };
    }

    await client.query("BEGIN");
    const lessonIdBySlug = new Map<string, number>();
    for (const row of existingLessonsRes.rows) {
      lessonIdBySlug.set(row.slug, row.id);
    }

    // Tahap 1: Upsert seluruh baris lessons & ganti lesson_sources secara idempoten.
    for (const lesson of batch.validLessons) {
      const trackId = trackIdBySlug.get(lesson.track);
      if (!trackId) {
        throw new Error(`Jalur ${lesson.track} tidak ditemukan.`);
      }
      const upsertRes = await client.query<{ id: number }>(
        `
        INSERT INTO lessons (
          track_id, chapter, slug, title, level, sort_order, estimated_minutes, origin, status, body_md, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
        ON CONFLICT (slug) DO UPDATE SET
          track_id          = EXCLUDED.track_id,
          chapter           = EXCLUDED.chapter,
          title             = EXCLUDED.title,
          level             = EXCLUDED.level,
          sort_order        = EXCLUDED.sort_order,
          estimated_minutes = EXCLUDED.estimated_minutes,
          origin            = EXCLUDED.origin,
          status            = EXCLUDED.status,
          body_md           = EXCLUDED.body_md,
          updated_at        = now()
        RETURNING id
        `,
        [
          trackId,
          lesson.chapter,
          lesson.slug,
          lesson.title,
          lesson.level,
          lesson.order,
          lesson.estimatedMinutes,
          lesson.origin,
          lesson.status,
          lesson.bodyMd,
        ],
      );
      const lessonId = upsertRes.rows[0].id;
      lessonIdBySlug.set(lesson.slug, lessonId);

      await client.query(`DELETE FROM lesson_sources WHERE lesson_id = $1`, [lessonId]);
      for (const src of lesson.sources) {
        await client.query(
          `INSERT INTO lesson_sources (lesson_id, title, url, license, author, changes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [lessonId, src.title, src.url, src.license, src.author, src.changes],
        );
      }
    }

    // Tahap 2: Pasang ulang lesson_prerequisites setelah semua slug baru di batch masuk.
    for (const lesson of batch.validLessons) {
      const lessonId = lessonIdBySlug.get(lesson.slug)!;
      await client.query(`DELETE FROM lesson_prerequisites WHERE lesson_id = $1`, [lessonId]);
      for (const prereqSlug of lesson.prerequisites) {
        const reqId = lessonIdBySlug.get(prereqSlug);
        if (!reqId) {
          throw new Error(`Prerequisite ${prereqSlug} tidak ditemukan.`);
        }
        await client.query(
          `INSERT INTO lesson_prerequisites (lesson_id, requires_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [lessonId, reqId],
        );
      }
    }

    await client.query("COMMIT");
    return {
      ok: true,
      items: batch.items,
      errors: [],
      upsertedCount: batch.validLessons.length,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function updateLessonStatus(
  lessonId: number,
  status: LessonStatus,
): Promise<{ id: number; slug: string; trackSlug: string; status: LessonStatus } | null> {
  const res = await databasePool.query<{
    id: number;
    slug: string;
    track_slug: string;
    status: LessonStatus;
  }>(
    `
    UPDATE lessons l
    SET status = $2, updated_at = now()
    FROM learning_tracks t
    WHERE l.id = $1 AND t.id = l.track_id
    RETURNING l.id, l.slug, t.slug AS track_slug, l.status
    `,
    [lessonId, status],
  );
  if (!res.rows[0]) return null;
  return {
    id: res.rows[0].id,
    slug: res.rows[0].slug,
    trackSlug: res.rows[0].track_slug,
    status: res.rows[0].status,
  };
}

export async function deleteLessonById(lessonId: number): Promise<boolean> {
  const res = await databasePool.query(`DELETE FROM lessons WHERE id = $1`, [lessonId]);
  return (res.rowCount ?? 0) > 0;
}

export async function upsertLearningTrack(input: {
  slug: string;
  title: string;
  description: string | null;
  sortOrder: number;
}): Promise<void> {
  await ensureBelajarSchema();
  await databasePool.query(
    `
    INSERT INTO learning_tracks (slug, title, description, sort_order)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      sort_order = EXCLUDED.sort_order
    `,
    [input.slug, input.title, input.description, input.sortOrder],
  );
}
