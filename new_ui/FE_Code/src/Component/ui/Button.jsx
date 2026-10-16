const base = 'inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold whitespace-nowrap select-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[.98]';
const variants = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover shadow-[0_1px_2px_rgba(0,0,0,.12)]',
  secondary: 'bg-surface border border-field-border text-ink hover:bg-surface-2',
  ghost: 'text-quiet-ink hover:bg-quiet-tint',
  ai: 'sheen text-white bg-[linear-gradient(135deg,#4C8DFF,#8B5CF6)] hover:brightness-110 shadow-glow',
  danger: 'bg-conflict text-on-accent hover:brightness-110',
};
const sizes = { lg: 'h-11 px-5 text-[14.5px]', md: 'h-10 px-4 text-[14px]', sm: 'h-[34px] px-3 text-[13px]', icon: 'h-9 w-9 p-0' };

export default function Button({ variant = 'primary', size = 'md', disabled, loading, className = '', type = 'button', children, ...p }) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={`${base} ${variants[variant]} ${sizes[size]} ${disabled || loading ? 'opacity-45 pointer-events-none' : ''} ${className}`} {...p}>
      {loading && <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
