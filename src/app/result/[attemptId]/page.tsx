import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionImage } from "@/components/QuestionImage";
import { getAttemptResult } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface ResultPageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function ResultPage({ params }: ResultPageProps) {
  const { attemptId: attemptIdParam } = await params;
  const attemptId = Number(attemptIdParam);
  if (!Number.isInteger(attemptId)) {
    notFound();
  }

  const result = await getAttemptResult(attemptId);
  if (!result) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Hasil: {result.subtestName}</h1>
      <p className="mt-3 text-5xl font-bold text-blue-600">
        {result.score}
        <span className="text-2xl text-slate-500"> / {result.totalQuestions}</span>
      </p>
      <p className="mt-1 text-sm text-slate-500">Benar +1, salah atau kosong 0, tanpa pengurangan nilai.</p>

      <div className="mt-6 flex gap-3">
        <Link
          href={`/c/${result.companySlug}/${result.packageSlug}`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Kembali ke subtes
        </Link>
      </div>

      <h2 className="mt-10 text-xl font-semibold">Pembahasan</h2>
      <ol className="mt-4 grid gap-4">
        {result.reviewItems.map(function renderReview(item) {
          const selectedOption = item.options.find(function findSelected(option) {
            return option.key === item.selectedOption;
          });
          const correctOption = item.options.find(function findCorrect(option) {
            return option.key === item.correctOption;
          });
          return (
            <li
              key={item.questionId}
              className={`rounded-xl border p-4 ${
                item.isCorrect ? "border-emerald-400 bg-emerald-50/50" : "border-red-300 bg-red-50/50"
              }`}
            >
              <p className="whitespace-pre-line font-medium">
                {item.orderIndex}. {item.prompt}
              </p>
              {item.imageSvg !== null ? <QuestionImage svgMarkup={item.imageSvg} /> : null}
              <p className="mt-2 text-sm">
                Jawabanmu:{" "}
                <strong>{selectedOption ? `${selectedOption.key}. ${selectedOption.label}` : "Tidak dijawab"}</strong>
              </p>
              {!item.isCorrect && correctOption ? (
                <p className="text-sm">
                  Jawaban benar: <strong>{`${correctOption.key}. ${correctOption.label}`}</strong>
                </p>
              ) : null}
              {item.explanation ? (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.explanation}</p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
