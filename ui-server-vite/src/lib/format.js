/* Small text helpers shared by the panels (DG-F07). */

export const plural = (n, one, many = `${one}s`) => (n === 1 ? one : many);

/* formatCount(3, 'decision') -> "3 decisions" */
export const formatCount = (n, one, many) => `${n} ${plural(n, one, many)}`;

/* Truncates at a word boundary and adds an ellipsis. */
export function truncate(text = '', max = 120) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).trimEnd()}…`;
}
