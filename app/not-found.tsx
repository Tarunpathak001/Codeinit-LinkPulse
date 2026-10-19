import Link from "next/link";
export default function NotFound() {
  return (
    <main className="center-page">
      <h1>This connection is missing.</h1>
      <p>We could not find the page you requested.</p>
      <Link className="button primary" href="/">
        Back to LinkPulse
      </Link>
    </main>
  );
}
