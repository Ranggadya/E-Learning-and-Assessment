import { memo } from "react";

interface QuestionImageProps {
  svgMarkup: string;
}

// SVG berasal dari database soal yang sudah divalidasi saat impor (VR-05), jadi aman dirender langsung.
function QuestionImageComponent({ svgMarkup }: QuestionImageProps) {
  return (
    <div
      className="my-3.5 overflow-hidden rounded-xl border border-line bg-subtle/40 p-3 text-slate-900 dark:bg-slate-900/70 dark:text-slate-100"
    >
      <div
        className="mx-auto w-full max-w-lg [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    </div>
  );
}

export const QuestionImage = memo(QuestionImageComponent);
