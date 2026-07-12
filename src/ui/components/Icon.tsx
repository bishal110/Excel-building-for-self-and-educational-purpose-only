import type { SVGProps } from 'react';

export type IconName =
  | 'app'
  | 'sheets'
  | 'docs'
  | 'slides'
  | 'file'
  | 'chevronDown'
  | 'chevronRight'
  | 'undo'
  | 'redo'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'table'
  | 'chart'
  | 'insertRow'
  | 'insertColumn'
  | 'trash'
  | 'eraser'
  | 'sortAscending'
  | 'sortDescending'
  | 'search'
  | 'freeze'
  | 'code'
  | 'help'
  | 'plus'
  | 'duplicate'
  | 'play'
  | 'download'
  | 'print'
  | 'bulletList'
  | 'numberedList'
  | 'image'
  | 'link'
  | 'close'
  | 'check'
  | 'local';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

/**
 * Small, dependency-free icon set for the application chrome.
 *
 * Icons intentionally inherit `currentColor`, which keeps hover, active,
 * high-contrast, and module-specific states controlled by the design system.
 */
export function Icon({ name, size = 16, className = '', ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`icon ${className}`.trim()}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75">
        {glyph(name)}
      </g>
    </svg>
  );
}

function glyph(name: IconName) {
  switch (name) {
    case 'app':
      return (
        <>
          <rect height="7" rx="1.5" width="7" x="3" y="3" />
          <rect height="7" rx="1.5" width="7" x="14" y="3" />
          <rect height="7" rx="1.5" width="7" x="3" y="14" />
          <rect height="7" rx="1.5" width="7" x="14" y="14" />
        </>
      );
    case 'sheets':
      return (
        <>
          <rect height="16" rx="2" width="18" x="3" y="4" />
          <path d="M3 9h18M9 4v16M15 4v16M3 14h18" />
        </>
      );
    case 'docs':
      return (
        <>
          <path d="M6 3h8l4 4v14H6z" />
          <path d="M14 3v5h5M9 12h6M9 16h6" />
        </>
      );
    case 'slides':
      return (
        <>
          <rect height="13" rx="2" width="18" x="3" y="4" />
          <path d="M8 21l4-4 4 4M8 8h8M8 12h5" />
        </>
      );
    case 'file':
      return <path d="M6 3h8l4 4v14H6zM14 3v5h5" />;
    case 'chevronDown':
      return <path d="m7 9 5 5 5-5" />;
    case 'chevronRight':
      return <path d="m9 7 5 5-5 5" />;
    case 'undo':
      return <path d="M9 8 5 12l4 4M5 12h8a6 6 0 0 1 6 6" />;
    case 'redo':
      return <path d="m15 8 4 4-4 4M19 12h-8a6 6 0 0 0-6 6" />;
    case 'cut':
      return (
        <>
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <path d="m8 7.5 11 7M8 16.5l11-7" />
        </>
      );
    case 'copy':
    case 'duplicate':
      return (
        <>
          <rect height="12" rx="2" width="12" x="8" y="8" />
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </>
      );
    case 'paste':
      return (
        <>
          <path d="M9 5h6M9 3h6v4H9z" />
          <path d="M8 5H6a2 2 0 0 0-2 2v13h16V7a2 2 0 0 0-2-2h-2" />
        </>
      );
    case 'alignLeft':
      return <path d="M4 6h16M4 10h11M4 14h16M4 18h9" />;
    case 'alignCenter':
      return <path d="M4 6h16M7 10h10M4 14h16M8 18h8" />;
    case 'alignRight':
      return <path d="M4 6h16M9 10h11M4 14h16M11 18h9" />;
    case 'table':
      return <path d="M4 5h16v14H4zM4 10h16M4 14h16M10 5v14M15 5v14" />;
    case 'chart':
      return <path d="M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7M3 20h18" />;
    case 'insertRow':
      return <path d="M4 5h16v14H4zM4 10h16M4 14h16M12 7v6M9 10h6" />;
    case 'insertColumn':
      return <path d="M4 5h16v14H4zM9 5v14M15 5v14M12 9v6M9 12h6" />;
    case 'trash':
      return <path d="M5 7h14M9 7V4h6v3M8 10v7M12 10v7M16 10v7M7 7l1 14h8l1-14" />;
    case 'eraser':
      return <path d="m4 15 8-9a2 2 0 0 1 3 0l3 3a2 2 0 0 1 0 3l-7 8H7zM9 20h11M8 11l6 6" />;
    case 'sortAscending':
      return <path d="M8 5v14M5 16l3 3 3-3M14 7h5M14 12h4M14 17h3" />;
    case 'sortDescending':
      return <path d="M8 19V5M5 8l3-3 3 3M14 7h3M14 12h4M14 17h5" />;
    case 'search':
      return (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </>
      );
    case 'freeze':
      return <path d="M4 5h16v14H4zM4 10h16M10 5v14M7 7h0M13 13l4 4M17 13l-4 4" />;
    case 'code':
      return <path d="m9 7-5 5 5 5M15 7l5 5-5 5M13 4l-2 16" />;
    case 'help':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.8 9a2.4 2.4 0 1 1 3.2 2.3c-.7.3-1 .8-1 1.7M12 17h0" />
        </>
      );
    case 'plus':
      return <path d="M12 5v14M5 12h14" />;
    case 'play':
      return <path d="m9 6 9 6-9 6z" />;
    case 'download':
      return <path d="M12 4v11M8 11l4 4 4-4M5 20h14" />;
    case 'print':
      return <path d="M7 9V4h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z" />;
    case 'bulletList':
      return <path d="M9 6h11M9 12h11M9 18h11M4 6h0M4 12h0M4 18h0" />;
    case 'numberedList':
      return <path d="M10 6h10M10 12h10M10 18h10M4 5h2v3M4 12h2l-2 3h2M4 18h2v3H4" />;
    case 'image':
      return <path d="M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15.5 9h0" />;
    case 'link':
      return <path d="M9 15 7 17a4 4 0 0 1-6-6l3-3a4 4 0 0 1 6 0M15 9l2-2a4 4 0 0 1 6 6l-3 3a4 4 0 0 1-6 0M8 12h8" />;
    case 'close':
      return <path d="m6 6 12 12M18 6 6 18" />;
    case 'check':
      return <path d="m5 12 4 4L19 6" />;
    case 'local':
      return <path d="M4 17h16M6 17V7h12v10M9 11h6M9 14h6M8 21h8" />;
  }
}
