import type { ReactNode } from 'react';

/**
 * Roamly icon set: hand-drawn travel icons with slightly irregular, "inked" strokes
 * and a small gold accent on each. All icons share the same props so they can be
 * dropped in anywhere a lucide icon was used.
 */
export type IconProps = { size?: number; className?: string; strokeWidth?: number };
export type IconType = (props: IconProps) => JSX.Element;

const make = (children: ReactNode, label: string): IconType => function RoamlyIcon({ size = 22, className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg className={`rl-icon ${className || ''}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={label}>
      {children}
    </svg>
  );
};

// Small filled gold accents use the --icon-accent colour (falls back to currentColor)
const Accent = ({ d, cx, cy, r = 1.3 }: { d?: string; cx?: number; cy?: number; r?: number }) =>
  d ? <path d={d} className="rl-icon-accent" stroke="none" /> : <circle cx={cx} cy={cy} r={r} className="rl-icon-accent" stroke="none" />;

/* ---- Navigation ---- */
export const CabinIcon = make(<>
  <path d="M2.8 11.6 12 3.9l9.2 7.7" />
  <path d="M5.4 10.2 5.6 20.2l12.9.1-.1-10" />
  <path d="M10 20.2v-5.4c0-.5.4-.8.9-.8h2.2c.5 0 .9.3.9.8v5.4" />
  <path d="M16.2 6.2V4h2v3.6" />
  <Accent cx={12} cy={11.2} r={1.1} />
</>, 'Home');

export const FoldMapIcon = make(<>
  <path d="M3.4 6.8 9 4.6l6 2.1 5.6-2.2v12.9L15 19.6l-6-2.1-5.6 2.1z" />
  <path d="M9 4.6v12.9M15 6.7v12.9" />
  <path d="M11.3 12.2c0-1 .7-1.7 1.4-1.7s1.4.7 1.4 1.7c0 1.100-1.400 2.400-1.400 2.400s-1.400-1.300-1.400-2.400z" />
  <Accent cx={12.7} cy={12.1} r={.7} />
</>, 'Map');

export const CompassIcon = make(<>
  <circle cx={12} cy={12} r={8.6} />
  <path d="M12 3.4v1.6M12 19v1.6M3.4 12H5M19 12h1.600" />
  <path d="m15.800 8.200-1.900 5.700-5.700 1.900 1.900-5.700z" />
  <Accent cx={12} cy={12} r={1.050} />
</>, 'Explore');

export const JournalIcon = make(<>
  <path d="M5.200 4.400h10.900A2.400 2.400 0 0 1 18.500 6.800v13H7.600a2.400 2.400 0 0 1-2.400-2.400z" />
  <path d="M5.200 17.400a2.400 2.400 0 0 1 2.400-2.400h10.900" />
  <path d="M13 4.400v6.100l1.900-1.400 1.900 1.400V4.400" />
  <Accent d="M13 4.400v6.100l1.900-1.400 1.900 1.400V4.400z" />
</>, 'Diary');

export const CircleFriendsIcon = make(<>
  <circle cx={8.600} cy={8.400} r={2.800} />
  <circle cx={16.600} cy={9.400} r={2.300} />
  <path d="M3.400 19.200c.4-3.200 2.400-5.100 5.200-5.100s4.800 1.900 5.200 5.100" />
  <path d="M14.600 14.300c.7-.3 1.400-.4 2-.4 2.200 0 3.800 1.600 4 4.500" />
  <Accent cx={12.500} cy={4.200} r={.9} />
</>, 'Friends');

export const ExplorerIcon = make(<>
  <circle cx={12} cy={10.200} r={3} />
  <path d="M6.600 8.200h10.800M8.400 8.200c.4-2.300 1.800-3.800 3.600-3.800s3.200 1.500 3.600 3.800" />
  <path d="M5.800 20.200c.5-3.500 2.900-5.500 6.200-5.500s5.700 2 6.200 5.500" />
  <Accent d="M8.400 8.200c.4-2.300 1.800-3.800 3.600-3.800s3.200 1.500 3.600 3.800z" />
</>, 'Profile');

/* ---- Categories ---- */
export const BootIcon = make(<>
  <path d="M7.200 3.800h5v6.200l5 2.400c1.300.6 2 1.600 2 3v2.800H4.800V3.800" />
  <path d="M4.800 18.200h14.400" />
  <path d="M8.800 7.200h3.200M8.800 9.600h3.200" />
  <Accent d="M4.800 16.200h14.400v2H4.800z" />
</>, 'Trekking');

export const FallsIcon = make(<>
  <path d="M3.800 5.200h16.400" />
  <path d="M7.800 5.200v8.200M12 5.200v10M16.200 5.200v6.800" />
  <path d="M4.600 18.600c1.500-1.300 3-1.300 4.500 0s3 1.300 4.500 0 3-1.300 4.700 0" />
  <Accent cx={12} cy={20.400} r={.8} />
</>, 'Waterfalls');

export const PalmIcon = make(<>
  <path d="M12.200 21V11.400" />
  <path d="M12.200 11.400C11.200 8 8.200 6.700 5 7.300c2.600.3 4.600 1.500 5.700 4" />
  <path d="M12.200 11.400c1-3.400 4-4.700 7.200-4.100-2.600.3-4.600 1.500-5.700 4" />
  <path d="M12.200 11.400c-.3-2.800.7-4.800 3-6" />
  <path d="M3.600 21c2.800-1.600 5.500-1.600 8.600 0s5.700 1.600 8.200 0" />
  <Accent cx={12.200} cy={11.400} r={1.300} />
</>, 'Beaches');

export const GopuramIcon = make(<>
  <path d="M12 3 15 6.800H9z" />
  <path d="M8.400 6.800h7.200l2.400 4.400H6z" />
  <path d="M5.600 11.200h12.800l2.600 4.600H3z" />
  <path d="M3.600 20h16.800M10 20v-4.200h4V20" />
  <Accent d="M12 3 15 6.800H9z" />
</>, 'Temples');

export const PeakIcon = make(<>
  <path d="M2.600 19.600 9.400 6.200l4 7 2.200-3.200 5.800 9.600z" />
  <path d="m7.200 10.400 2.200 2.200 1.600-1.600" />
  <Accent cx={17.400} cy={5.400} r={1.200} />
</>, 'Mountains');

export const GemIcon = make(<>
  <path d="M6.400 4h11.200L21 9.600 12 20.200 3 9.600z" />
  <path d="M3 9.600h18M9.200 4 7.600 9.600 12 20.200l4.400-10.600L14.800 4" />
  <Accent d="M7.600 9.600 9.200 4h5.600l1.600 5.600z" />
</>, 'Hidden gems');

export const PineIcon = make(<>
  <path d="M12 3.200 7.200 10h2.600L5.600 15.800h4.800V20.600h3.200v-4.800h4.800L14.200 10h2.600z" />
  <Accent cx={12} cy={8.600} r={.9} />
</>, 'Nature');

export const StampToolIcon = make(<>
  <circle cx={12} cy={6.200} r={2.700} />
  <path d="M10.500 8.800v2.900c0 1-.6 1.600-1.600 2-1.500.6-2.300 1.300-2.300 2.400v.9h10.800v-.9c0-1.100-.8-1.800-2.300-2.400-1-.4-1.600-1-1.600-2V8.800" />
  <path d="M4.800 19.800h14.400" />
  <Accent d="M6.600 17.200h10.800v1.400H6.600z" />
</>, 'Stamps');

export const PinIcon = make(<>
  <path d="M12 21.200s6.600-5.700 6.600-11.300A6.600 6.600 0 0 0 5.400 9.900C5.400 15.500 12 21.200 12 21.200z" />
  <circle cx={12} cy={9.900} r={2.300} />
  <Accent cx={12} cy={9.900} r={.9} />
</>, 'Place');

/**
 * The big compass rose used as the centre button of the navigation bar.
 * Not stroke-based: a gold ring with an eight-point star.
 */
export function CompassRose({ size = 54, className }: { size?: number; className?: string }) {
  return (
    <svg className={`rl-rose ${className || ''}`} width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Compass">
      <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="32" cy="32" r="24.500" fill="none" stroke="currentColor" strokeWidth=".8" strokeDasharray="1.600 3.400" />
      <path d="M32 6 36.400 27.600 58 32 36.400 36.400 32 58 27.600 36.400 6 32 27.600 27.600z" fill="currentColor" />
      <path d="M32 15 34.400 29.600 49 32 34.400 34.400 32 49 29.600 34.400 15 32 29.600 29.600z" fill="var(--rose-core, #0b2447)" opacity=".78" />
      <circle cx="32" cy="32" r="3.200" fill="var(--rose-pin, #fbf4e1)" />
    </svg>
  );
}
