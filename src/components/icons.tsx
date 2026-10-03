import { SVGProps } from "react";

/**
 * Hand-rolled inline SVG icon set.
 * Inlined (not a package) so there is no extra bundle and no icon-name guessing.
 * All icons are 24x24, stroke-based, currentColor.
 */

type P = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconPalette = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3a9 9 0 1 0 0 18c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.5-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4.1-4-7.4-9-7.4Z" />
    <circle cx="7.5" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="11" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconShield = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3 5 6v5.5c0 4.3 2.9 8.2 7 9.5 4.1-1.3 7-5.2 7-9.5V6l-7-3Z" />
    <path d="m9.2 12 2 2 3.6-3.8" />
  </svg>
);

export const IconLink = (p: P) => (
  <svg {...base} {...p}>
    <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 1 0-5.7-5.7l-1.4 1.4" />
    <path d="M13.5 10.5a4 4 0 0 0-5.7 0L5 13.3a4 4 0 1 0 5.7 5.7l1.4-1.4" />
  </svg>
);

export const IconCpu = (p: P) => (
  <svg {...base} {...p}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="2" />
    <rect x="10" y="10" width="4" height="4" rx="1" />
    <path d="M9.5 3v3M14.5 3v3M9.5 18v3M14.5 18v3M3 9.5h3M3 14.5h3M18 9.5h3M18 14.5h3" />
  </svg>
);

export const IconQr = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <path d="M13.5 13.5h3v3h-3zM19.5 13.5h1M13.5 19.5h1M17 17h4v4h-4z" />
  </svg>
);

export const IconUpload = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 15.5V4.5M8.5 8 12 4.5 15.5 8" />
    <path d="M4.5 15v3.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V15" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base} {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const IconAlert = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3.5 2.8 19.5h18.4L12 3.5Z" />
    <path d="M12 9.5v4.2M12 17h.01" />
  </svg>
);

export const IconCopy = (p: P) => (
  <svg {...base} {...p}>
    <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
    <path d="M15.5 8.5v-4a2 2 0 0 0-2-2h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h4" />
  </svg>
);

export const IconSearch = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

export const IconArrow = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </svg>
);

export const IconUser = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.8 20c.9-3.6 3.7-5.6 7.2-5.6s6.3 2 7.2 5.6" />
  </svg>
);

export const IconLogout = (p: P) => (
  <svg {...base} {...p}>
    <path d="M15 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2" />
    <path d="M10 12h10M17 9l3 3-3 3" />
  </svg>
);

export const IconLayers = (p: P) => (
  <svg {...base} {...p}>
    <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" />
    <path d="m3.5 12 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5" />
  </svg>
);

export const IconSpark = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.8L12 18l-1.7-5.5L4.8 10.7 10.3 9 12 3.5Z" />
  </svg>
);

export const IconClock = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const IconExternal = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14 4.5h5.5V10" />
    <path d="M19.5 4.5 11 13" />
    <path d="M18 14.5v4a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6h4" />
  </svg>
);

export const IconMenu = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconClose = (p: P) => (
  <svg {...base} {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const IconWallet = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h11.5A2 2 0 0 1 19.5 8v.5" />
    <rect x="3.5" y="8.5" width="17" height="10.5" rx="2.5" />
    <circle cx="16" cy="14" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

export const IconImage = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m4.5 17 4.8-4.8a1.8 1.8 0 0 1 2.5 0L20.5 20" />
  </svg>
);
export const IconDownload = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3.5v10.5" />
    <path d="M7.5 10 12 14.5 16.5 10" />
    <path d="M4 16.5v2A2 2 0 0 0 6 20.5h12a2 2 0 0 0 2-2v-2" />
  </svg>
);
