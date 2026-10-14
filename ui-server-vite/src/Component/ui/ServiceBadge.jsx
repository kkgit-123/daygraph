/* Text badge for a Google service. Brand colour only; no Google logo artwork. */
export default function ServiceBadge({ name, color }) {
  return (
    <span className="text-[12px] font-bold text-white px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: color }}>{name}</span>
  );
}
