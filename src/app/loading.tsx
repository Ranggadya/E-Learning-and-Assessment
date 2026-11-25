export default function RootLoading() {
  return (
    <div className="min-h-screen bg-canvas px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="h-12 animate-pulse rounded-2xl border border-line bg-surface" />
        <div className="h-80 animate-pulse rounded-2xl border border-line bg-surface" />
      </div>
    </div>
  );
}
