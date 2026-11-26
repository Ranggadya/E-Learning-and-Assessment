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
  TEXT: { label: "Teks", className: "badge-neutral" },
  IMAGE: { label: "Gambar", className: "badge-info" },
  MEMORY: { label: "Memori 5 dtk", className: "badge-warning" },
  SPEED: { label: "Kecepatan", className: "badge-danger" },
};

const LEVEL_META: Record<CefrLevel, string> = {
  A1: "badge-success",
  A2: "badge-info",
  B1: "badge-warning",
  B2: "badge-caution",
  C1: "badge-danger",
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
