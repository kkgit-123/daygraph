export default function Panel({ as = 'section', className = '', ...p }) {
  const Tag = as;
  return <Tag className={`bg-white border border-border rounded-[14px] shadow-[0_1px_2px_rgba(23,26,43,.04)] ${className}`} {...p} />;
}
