export default function PageHeader({ title, subtitle, eyebrow, children }) {
  return (
    <header className="flex flex-wrap items-end gap-4 stagger">
      <div className="flex-[1_1_360px] min-w-0">
        {eyebrow && <div className="text-[12px] font-semibold uppercase tracking-[.08em] text-accent mb-1.5">{eyebrow}</div>}
        <h1 className="text-[26px] sm:text-[28px] leading-[1.15] font-semibold tracking-[-0.025em]">{title}</h1>
        {subtitle && <p className="mt-2 text-[14.5px] text-muted max-w-[720px]">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}
