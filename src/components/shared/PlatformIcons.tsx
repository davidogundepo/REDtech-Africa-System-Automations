/**
 * PlatformIcons — official SVG brand icons for platforms
 * that lucide-react does not carry (X and TikTok).
 * All other platforms use lucide icons.
 */
import React from "react";

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

/** X (formerly Twitter) — the real X wordmark icon */
export const XIcon = ({ className, style }: IconProps) => (
  <svg
    className={className}
    style={style}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="X"
  >
    {/* Official X path — sourced from Simple Icons / X brand guidelines */}
    <path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" />
  </svg>
);

/** TikTok official icon */
export const TikTokIcon = ({ className, style }: IconProps) => (
  <svg
    className={className}
    style={style}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="TikTok"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.01a8.16 8.16 0 0 0 4.77 1.52V7.08a4.85 4.85 0 0 1-1-.39z" />
  </svg>
);
