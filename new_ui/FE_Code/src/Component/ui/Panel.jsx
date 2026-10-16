export default function Panel({ as = 'section', className = '', ...p }) {
  const Tag = as;
  return <Tag className={`spotlight bg-surface border border-border rounded-2xl shadow-card ${className}`} {...p} />;
}

const ICON_TONE = { accent: 'bg-accent-tint text-accent', ai: 'bg-ai-tint text-ai', ok: 'bg-ok-tint text-ok', warn: 'bg-warn-tint text-warn' };

/* Standard card header: optional icon tile, title, subtitle, and actions on the right. */
export function PanelHeader({ icon, iconTone = 'accent', title, subtitle, children, className = '' }) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      {icon && <span className={`w-8 h-8 rounded-[9px] inline-flex items-center justify-center shrink-0 ${ICON_TONE[iconTone]}`}>{icon}</span>}
      <div className="flex-1 min-w-0">
        <h2 className="text-[15.5px] font-semibold tracking-[-0.01em] leading-8">{title}</h2>
        {subtitle && <p className="text-muted text-[13px] -mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap justify-end">{children}</div>}
    </div>
  );
}
