export default function Loading() {
  return (
    <main className="ui-container flex-1 py-12">
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="mx-auto max-w-5xl space-y-6"
      >
        <span className="sr-only">Carregando página...</span>
        <div className="ui-card h-32 animate-pulse" aria-hidden="true" />
        <div className="ui-card h-72 animate-pulse" aria-hidden="true" />
        <div className="ui-card h-56 animate-pulse" aria-hidden="true" />
      </div>
    </main>
  );
}
