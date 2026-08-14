export default function N2OrbitMark({ compact = false }: { compact?: boolean }) {
  if (compact) return <i className="n2-ai-inline" aria-hidden="true">n2</i>;
  return (
    <span className="n2-orbit-mark" aria-hidden="true">
      <b>n2</b>
      <i />
    </span>
  );
}
