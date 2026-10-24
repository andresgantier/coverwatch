// Placeholder home page until the app shell is built in Phase 4.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">CoverWatch</h1>
      <p className="max-w-md text-zinc-600">
        Service contract and maintenance management for HVAC service companies.
      </p>
      <a href="/api/health" className="text-sm text-blue-600 underline">
        System health
      </a>
    </main>
  );
}
