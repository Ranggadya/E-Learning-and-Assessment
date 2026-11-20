export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-7 w-56 animate-pulse rounded-lg bg-subtle" />
            <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-subtle" />
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-4">
            <div className="h-12 animate-pulse rounded-lg bg-subtle" />
            <div className="h-12 animate-pulse rounded-lg bg-subtle" />
            <div className="h-12 animate-pulse rounded-lg bg-subtle" />
            <div className="h-12 animate-pulse rounded-lg bg-subtle" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="h-44 animate-pulse rounded-xl border border-line bg-surface" />
              <div className="h-44 animate-pulse rounded-xl border border-line bg-surface" />
            </div>
            <div className="h-64 animate-pulse rounded-xl border border-line bg-surface" />
          </div>
        </div>
      </div>
    </div>
  );
}
