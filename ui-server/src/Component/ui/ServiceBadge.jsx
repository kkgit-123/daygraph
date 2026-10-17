/* Text badge for a Google service. Brand colour dot only; no Google logo artwork. */
export default function ServiceBadge({ name, color }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-ink px-2 py-0.5 rounded-full whitespace-nowrap border border-border bg-surface-2">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />{name}
    </span>
  );
}
