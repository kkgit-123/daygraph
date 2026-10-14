const base = 'inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold whitespace-nowrap transition-colors duration-150';
const variants = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'bg-white border border-field-border text-ink hover:bg-ground',
  ghost: 'text-quiet-ink hover:bg-[#E8EBF3]',
};
const sizes = { md: 'h-10 px-4 text-[14px]', sm: 'h-[34px] px-3 text-[13px]' };

export default function Button({ variant = 'primary', size = 'md', disabled, className = '', type = 'button', ...p }) {
  return (
    <button type={type} disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-45 pointer-events-none' : ''} ${className}`} {...p} />
  );
}
