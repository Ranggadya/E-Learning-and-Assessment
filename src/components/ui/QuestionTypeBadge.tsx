import { IconEyeOff, IconFileText, IconImage, IconZap } from "@/components/ui/Icons";
import type { QuestionType } from "@/types/assessment";
import type { CefrLevel } from "@/types/english";

interface QuestionTypeBadgeProps {
  type: QuestionType;
}

interface LevelBadgeProps {
  level: CefrLevel;
}

const TYPE_META: Record<
  QuestionType,
  { label: string; className: string }
> = {
  TEXT: {
    label: "Teks",
    className:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700",
  },
  IMAGE: {
    label: "Gambar",
    className:
      "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/70",
  },
  MEMORY: {
    label: "Memori 5 dtk",
    className:
      "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70",
  },
  SPEED: {
    label: "Kecepatan",
    className:
      "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/70",
  },
};

const LEVEL_META: Record<CefrLevel, string> = {
  A1: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70",
  A2: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/70",
  B1: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70",
  B2: "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/70",
  C1: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/70",
};

export function QuestionTypeBadge({ type }: QuestionTypeBadgeProps) {
  const meta = TYPE_META[type];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${meta.className}`}
    >
      {type === "TEXT" ? <IconFileText className="h-3 w-3" /> : null}
      {type === "IMAGE" ? <IconImage className="h-3 w-3" /> : null}
      {type === "MEMORY" ? <IconEyeOff className="h-3 w-3" /> : null}
      {type === "SPEED" ? <IconZap className="h-3 w-3" /> : null}
      <span>{meta.label}</span>
    </span>
  );
}

export function LevelBadge({ level }: LevelBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold tabular-nums ${LEVEL_META[level]}`}
    >
      {level}
    </span>
  );
}
