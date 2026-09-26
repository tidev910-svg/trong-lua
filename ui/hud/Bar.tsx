/** Thin progress bar (purse energy / uy tín, ripeness on the plot note). */
export function Bar({ value, max, className, label }: { value: number; max: number; className?: string; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`bar${className ? ` ${className}` : ""}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}
