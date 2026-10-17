import Icon from './Icon';

export default function Check({ on, size = 28, className = '', ...p }) {
  const dim = size === 28 ? 'w-6 h-6' : size === 30 ? 'w-[26px] h-[26px]' : 'w-5 h-5';
  return (
    <button type="button" {...p}
      className={`${dim} rounded-full border-2 inline-flex items-center justify-center shrink-0 transition-[background-color,border-color,color] duration-150 ${on ? 'bg-ok border-ok text-on-accent' : 'bg-transparent border-field-border text-transparent hover:border-ok hover:text-ok'} ${className}`}>
      <span key={on ? 'on' : 'off'} className={`inline-flex ${on ? 'check-pop' : ''}`}><Icon name="check" size={13} sw={3} /></span>
    </button>
  );
}

export function CheckMark({ size = 30, iconSize = 15, className = '' }) {
  const dim = size === 30 ? 'w-[26px] h-[26px]' : 'w-5 h-5';
  return (
    <span className={`${dim} rounded-full inline-flex items-center justify-center shrink-0 bg-ok text-on-accent ${className}`}>
      <Icon name="check" size={iconSize} sw={3} />
    </span>
  );
}
