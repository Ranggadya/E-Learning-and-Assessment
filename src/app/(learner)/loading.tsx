export default function LearnerLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat halaman">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-subtle" />
        <div className="h-10 w-full animate-pulse rounded-full bg-subtle sm:w-72" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-20 animate-pulse rounded-2xl border border-line bg-surface" />
        <div className="h-20 animate-pulse rounded-2xl border border-line bg-surface" />
        <div className="h-20 animate-pulse rounded-2xl border border-line bg-surface" />
      </div>

      <div className="h-64 animate-pulse rounded-2xl border border-line bg-surface" />
      <div className="h-40 animate-pulse rounded-2xl border border-line bg-surface" />
    </div>
  );
}
