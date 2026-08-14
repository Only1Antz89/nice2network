"use client";

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f7f7f4", color: "#111" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ width: "min(520px, 100%)", textAlign: "center" }}>
            <div style={{ width: 58, height: 58, margin: "0 auto 24px", borderRadius: "50%", display: "grid", placeItems: "center", background: "#111", color: "#fff", fontWeight: 800 }}>n2</div>
            <h1>n2 needs a fresh start.</h1>
            <p style={{ color: "#666", lineHeight: 1.6 }}>The application shell could not load. Retry now, or refresh the page if the problem continues.</p>
            <button type="button" onClick={retry} style={{ border: 0, borderRadius: 999, background: "#111", color: "#fff", padding: "12px 20px", fontWeight: 700 }}>Try again</button>
          </section>
        </main>
      </body>
    </html>
  );
}
