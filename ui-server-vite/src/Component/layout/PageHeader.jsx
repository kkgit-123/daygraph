export default function PageHeader({ title, subtitle, children }) {
  return (
    <header className="flex flex-wrap items-end gap-4">
      <div className="flex-[1_1_360px] min-w-0">
        <h1 className="text-[30px] leading-[1.2] font-bold tracking-[-0.015em]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
