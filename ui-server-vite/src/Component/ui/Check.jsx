import Icon from './Icon';

export default function Check({ on, size = 28, className = '', ...p }) {
  const dim = size === 28 ? 'w-7 h-7' : size === 30 ? 'w-[30px] h-[30px]' : 'w-[22px] h-[22px]';
  return (
    <button type="button" {...p}
      className={`${dim} rounded-full border-2 inline-flex items-center justify-center shrink-0 transition-colors duration-150 ${on ? 'bg-ok border-ok text-white' : 'bg-white border-[#9AA1BC] text-transparent hover:border-ok'} ${className}`}>
      <Icon name="check" size={15} sw={3} />
    </button>
  );
}

export function CheckMark({ size = 30, iconSize = 15, className = '' }) {
  const dim = size === 30 ? 'w-[30px] h-[30px]' : 'w-[22px] h-[22px]';
  return (
    <span className={`${dim} rounded-full inline-flex items-center justify-center shrink-0 bg-ok text-white ${className}`}>
      <Icon name="check" size={iconSize} sw={3} />
    </span>
  );
}
