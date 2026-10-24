import type { ReactNode } from 'react';

export type VoyagerIconProps = { size?: number; className?: string; strokeWidth?: number };
type IconProps = VoyagerIconProps & { label?: string };

const icon = (children: ReactNode, label: string) => ({ size = 20, className = '', strokeWidth = 1.7, label: ariaLabel = label }: IconProps) => (
  <svg className={`rl-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={ariaLabel}>
    {children}
  </svg>
);

const gold = (cx: number, cy: number, r = 1.1) => <circle cx={cx} cy={cy} r={r} className="rl-icon-accent" stroke="none" />;

export const CabinIcon = icon(<><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M10 20v-5h4v5"/>{gold(12, 11.2)}</>, 'Home');
export const FoldMapIcon = icon(<><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>{gold(12.5, 12)}</>, 'Map');
export const CompassIcon = icon(<><circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>{gold(12, 12)}</>, 'Explore');
export const JournalIcon = icon(<><path d="M5 5h11a3 3 0 0 1 3 3v11H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>{gold(15, 7)}</>, 'Diary');
export const CircleFriendsIcon = icon(<><circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.4"/><path d="M3.5 19c.4-3.2 2.4-5 5.5-5s5.1 1.8 5.5 5M14.5 14.5c3-.8 5.3.8 6 4"/>{gold(12, 4)}</>, 'Friends');
export const ExplorerIcon = icon(<><circle cx="12" cy="9" r="3"/><path d="M6 20c.5-3.5 2.8-5.5 6-5.5s5.5 2 6 5.5"/>{gold(12, 5)}</>, 'Profile');
export const BootIcon = icon(<><path d="M7 4h5v6l5 2c1.3.5 2 1.6 2 3v3H5V4M5 18h14"/>{gold(12, 16)}</>, 'Trekking');
export const FallsIcon = icon(<><path d="M4 5h16M8 5v9M12 5v11M16 5v7M4 19c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.8 0"/>{gold(12, 20)}</>, 'Waterfalls');
export const PalmIcon = icon(<><path d="M12 21V11M12 11C11 8 8 6.7 5 7.3c2.6.3 4.6 1.5 5.7 4M12 11c1-3.4 4-4.7 7.2-4.1-2.6.3-4.6 1.5-5.7 4M4 21c2.7-1.5 5.5-1.5 8 0s5.5 1.5 8 0"/>{gold(12, 11)}</>, 'Beaches');
export const GopuramIcon = icon(<><path d="m12 3 3 4h-6zM8.5 7h7l2.5 4h-9.5zM5.5 11h13l2.5 5h-16zM4 20h16M10 20v-4h4v4"/>{gold(12, 4)}</>, 'Temples');
export const PeakIcon = icon(<><path d="m3 20 6.5-13 4 7 2.2-3.2L21 20z"/>{gold(17, 5)}</>, 'Mountains');
export const PineIcon = icon(<><path d="m12 3-5 7h3l-4 6h5v5h2v-5h5l-4-6h3z"/>{gold(12, 8)}</>, 'Nature');
export const PinIcon = icon(<><path d="M12 21s6-5.5 6-11a6 6 0 0 0-12 0c0 5.5 6 11 6 11z"/><circle cx="12" cy="10" r="2.3"/>{gold(12, 10, .8)}</>, 'Place');
export const StampToolIcon = icon(<><circle cx="12" cy="6.5" r="2.7"/><path d="M10.5 9v3c0 1-.6 1.6-1.6 2-1.5.6-2.3 1.3-2.3 2.4v.8h10.8v-.8c0-1.1-.8-1.8-2.3-2.4-1-.4-1.6-1-1.6-2V9M5 20h14"/>{gold(12, 17)}</>, 'Stamps');

export function CompassRose({ size = 52, className = '' }: { size?: number; className?: string }) {
  return <svg className={`rl-rose ${className}`} width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Compass"><circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="32" cy="32" r="24.5" fill="none" stroke="currentColor" strokeWidth=".8" strokeDasharray="1.6 3.4"/><path d="M32 6 36.4 27.6 58 32 36.4 36.4 32 58 27.6 36.4 6 32 27.6 27.6z" fill="currentColor"/><path d="M32 15 34.4 29.6 49 32 34.4 34.4 32 49 29.6 34.4 15 32 29.6 29.6z" fill="var(--rose-core,#0b2447)" opacity=".78"/><circle cx="32" cy="32" r="3.2" fill="var(--rose-pin,#fbf4e1)"/></svg>;
}

