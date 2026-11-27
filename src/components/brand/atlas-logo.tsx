/**
 * The Atlas wordmark (Reign mark + the word "Atlas") used on the login
 * page, now also the app-wide logo — Round 2 section 1b. Inlined (not
 * <img src>) so `fill="currentColor"` inherits the surrounding text colour
 * and the same markup paints navy in light mode / white in dark mode just
 * by living inside elements already themed that way, exactly like
 * reign-logo.tsx. Path data and layout copied from docs/redesign/atlas-logo.svg,
 * with its hardcoded fill and embedded C2PA metadata stripped.
 */
export function AtlasLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 390 100" fill="currentColor" className={className} aria-hidden="true">
      <g transform="scale(0.2776)">
        <polygon points="0 237.67 0 119.96 121.31 119.96 242.63 241.27 242.63 360.18 122.51 360.18 122.51 243.67 118.91 240.07 0 240.07" />
        <polygon points="121.31 117.71 121.31 0 242.63 0 363.94 121.31 363.94 240.22 243.83 240.22 243.83 123.72 240.22 120.11 121.31 120.11" />
      </g>
      <text
        x="123"
        y="86"
        fontFamily="Inter Tight, Neue Haas Grotesk Display, Inter, sans-serif"
        fontSize="100"
        fontWeight="400"
        letterSpacing="-2"
      >
        Atlas
      </text>
    </svg>
  );
}
