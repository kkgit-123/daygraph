export default function Field({ size = 'md', className = '', ...p }) {
  return (
    <input
      className={`w-full ${size === 'sm' ? 'h-10' : 'h-11'} border border-field-border rounded-[10px] px-3.5 bg-surface text-ink placeholder:text-faint transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent)_22%,transparent)] ${className}`}
      {...p} />
  );
}
