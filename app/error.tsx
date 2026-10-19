"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="center-page">
      <h1>Something interrupted the connection.</h1>
      <p>Please try again. Your saved data is still in your workspace.</p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
