// tailwind.config.ts (extend) — maps Tailwind names to the CSS variables in tokens.css
export const reignTheme = {
  colors: { bg: 'var(--bg)', side: 'var(--side)', card: 'var(--card)', line: 'var(--line)', ink: 'var(--ink)', ink2: 'var(--ink2)', muted: 'var(--muted)', navy: 'var(--navy)', navyInk: 'var(--navyInk)', track: 'var(--track)', fill: 'var(--fill)', bar: 'var(--bar)', dot: 'var(--dot)', chip: 'var(--chip)', chipStrong: 'var(--chipStrong)', chipStrongInk: 'var(--chipStrongInk)', pos: 'var(--pos)', posBg: 'var(--posBg)', warn: 'var(--warn)', warnBg: 'var(--warnBg)', neg: 'var(--neg)', negBg: 'var(--negBg)', active: 'var(--active)', sunk: 'var(--sunk)', accent: 'var(--accent)' },
  borderRadius: { card: 'var(--radius-card)', control: 'var(--radius-control)', tag: 'var(--radius-tag)' },
  fontFamily: { sans: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'] },
};
