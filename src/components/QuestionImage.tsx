import { memo } from "react";

interface QuestionImageProps {
  svgMarkup: string;
}

// SVG berasal dari database soal buatan sendiri (bukan input pengunjung), jadi aman dirender langsung.
function QuestionImageComponent({ svgMarkup }: QuestionImageProps) {
  return (
    <div
      className="mx-auto my-4 w-full max-w-xl text-slate-800 dark:text-slate-100 [&_svg]:h-auto [&_svg]:w-full"
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}

export const QuestionImage = memo(QuestionImageComponent);
