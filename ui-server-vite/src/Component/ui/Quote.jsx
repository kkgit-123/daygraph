const cls = {
  'q-jp': 'font-jp text-[17px] leading-[1.85] font-medium',
  'q-en': 'font-serif text-[19px] leading-[1.55]',
  'q-tr': 'font-serif italic text-[15.5px] leading-[1.5] text-quiet-ink',
};

export default function Quote({ kind = 'q-en', children, className = '' }) {
  return <p className={`${cls[kind] || cls['q-en']} ${className}`}>{children}</p>;
}
