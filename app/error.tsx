"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("n2 route error", error);
  }, [error]);

  return (
    <main className="route-state-page" role="alert">
      <div className="route-state-mark">n2</div>
      <span className="eyebrow">SOMETHING INTERRUPTED THE FLOW</span>
      <h1>We couldn’t load this part of n2.</h1>
      <p>Your work is still safe. Try the request again, or return to the network home.</p>
      <div className="route-state-actions">
        <button type="button" className="primary-button" onClick={retry}>Try again</button>
        <Link className="secondary-button" href="/">Return home</Link>
      </div>
      {error.digest && <small>Reference: {error.digest}</small>}
    </main>
  );
}
