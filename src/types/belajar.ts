export type LessonLevel = "pemula" | "menengah" | "lanjut";
export type LessonStatus = "draft" | "reviewed";
export type LessonOrigin = "original" | "translated" | "mixed";
export type LessonProgressStatus = "started" | "done";

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export interface LessonSource {
  title: string;
  url: string;
  license: string | null;
  author: string | null;
  changes: string | null;
}

export interface ParsedLessonInput {
  fileName: string;
  slug: string;
  title: string;
  track: string;
  chapter: string | null;
  level: LessonLevel;
  order: number;
  prerequisites: string[];
  estimatedMinutes: number | null;
  status: LessonStatus;
  origin: LessonOrigin;
  sources: LessonSource[];
  bodyMd: string;
}

export interface LessonValidationItem {
  fileName: string;
  slug: string | null;
  title: string | null;
  track: string | null;
  chapter: string | null;
  level: LessonLevel | null;
  order: number | null;
  status: LessonStatus | null;
  origin: LessonOrigin | null;
  prerequisites: string[];
  sourcesCount: number;
  action: "create" | "update" | "invalid";
  errors: string[];
}

export interface LearningTrackSummary {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  sortOrder: number;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
}

export interface PrerequisiteInfo {
  id: number;
  slug: string;
  title: string;
  trackSlug: string;
  isDone: boolean;
}

export interface TrackLessonItem {
  id: number;
  slug: string;
  title: string;
  chapter: string | null;
  level: LessonLevel;
  sortOrder: number;
  estimatedMinutes: number | null;
  origin: LessonOrigin;
  progressStatus: LessonProgressStatus | null;
  quizScore: number | null;
  unmetPrerequisites: PrerequisiteInfo[];
}

export interface LessonQuizPublicQuestion {
  id: number;
  orderIndex: number;
  prompt: string;
  options: Array<{ key: string; label: string }>;
}

export interface LessonDetail {
  id: number;
  slug: string;
  title: string;
  chapter: string | null;
  trackId: number;
  trackSlug: string;
  trackTitle: string;
  level: LessonLevel;
  sortOrder: number;
  estimatedMinutes: number | null;
  origin: LessonOrigin;
  bodyMd: string;
  sources: LessonSource[];
  prerequisites: PrerequisiteInfo[];
  progressStatus: LessonProgressStatus | null;
  quizScore: number | null;
  prevLesson: { slug: string; title: string } | null;
  nextLesson: { slug: string; title: string } | null;
}

export interface LessonSearchHit {
  id: number;
  slug: string;
  title: string;
  trackSlug: string;
  trackTitle: string;
  level: LessonLevel;
  estimatedMinutes: number | null;
  snippet: string;
}

export interface AdminLessonRow {
  id: number;
  slug: string;
  title: string;
  chapter: string | null;
  trackSlug: string;
  trackTitle: string;
  level: LessonLevel;
  sortOrder: number;
  estimatedMinutes: number | null;
  origin: LessonOrigin;
  status: LessonStatus;
  prerequisites: string[];
  sourcesCount: number;
  updatedAt: string;
}

export type MarkdownBlock =
  | { type: "heading"; depth: 1 | 2 | 3 | 4; id: string; html: string }
  | { type: "paragraph"; html: string }
  | { type: "code"; lang: string; code: string }
  | { type: "blockquote"; html: string }
  | { type: "list"; ordered: boolean; itemsHtml: string[] }
  | { type: "table"; headersHtml: string[]; rowsHtml: string[][] }
  | { type: "image"; src: string; alt: string; captionHtml: string }
  | { type: "details"; summaryHtml: string; blocks: MarkdownBlock[] }
  | { type: "hr" };
