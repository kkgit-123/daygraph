export default function Field({ size = 'md', className = '', ...p }) {
  return (
    <input
      className={`w-full ${size === 'sm' ? 'h-10' : 'h-11'} border border-field-border rounded-[10px] px-3.5 bg-white placeholder:text-[#7A809A] ${className}`}
      {...p} />
  );
}
