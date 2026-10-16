const PALETTE = {
  AT: ['#C9CEF8', '#1B2150'], RM: ['#FBE0B3', '#4A2F00'], MC: ['#BFE8D6', '#0B4A38'],
  DL: ['#F8CFE0', '#5A1536'], JP: ['#CFE3F8', '#12355A'], AK: ['#E8D5F5', '#3B1A57'],
};

export const initialsOf = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export const colorsFor = (initials, bg, color) => {
  const p = PALETTE[initials] || ['#E8EAFB', '#2A33A5'];
  return { bg: bg || p[0], color: color || p[1] };
};
