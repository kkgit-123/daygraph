export default function Switch({ id, on, onChange, label, labelledBy }) {
  return (
    <button type="button" role="switch" id={id} aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy} aria-checked={on}
      onClick={() => onChange(!on)}
      className={`w-9 h-5 rounded-full relative inline-block shrink-0 transition-colors duration-200 ${on ? 'bg-ok' : 'bg-field-border'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? 'translate-x-4' : ''}`} />
    </button>
  );
}
