import { useEffect, useId, useState } from 'react';

/**
 * A passport-style ink stamp that appears on a memory's photos (and its story)
 * five minutes after the memory was uploaded.
 *
 * `stampAt` is an absolute browser timestamp (ms). It is computed from the number of
 * seconds the server says are left, so it does not depend on the user's clock or timezone.
 * When `stampAt` is undefined the memory is older / has no timer and is stamped straight away.
 */
export type StampInfo = {
  stampAt?: number;
  place: string;
  region?: string;
  date?: string;
  category?: string;
};

export function useStampReady(stampAt?: number) {
  const [ready, setReady] = useState(() => stampAt === undefined || Date.now() >= stampAt);
  const [fresh, setFresh] = useState(false); // true only when the stamp lands while the user is watching

  useEffect(() => {
    if (stampAt === undefined || Date.now() >= stampAt) { setReady(true); return; }
    setReady(false); setFresh(false);
    const timer = window.setTimeout(() => { setReady(true); setFresh(true); }, Math.max(0, stampAt - Date.now()) + 40);
    return () => window.clearTimeout(timer);
  }, [stampAt]);

  return { ready, fresh };
}

/** Whole seconds left until the stamp lands, ticking once a second while pending. */
export function useStampCountdown(stampAt?: number, active = true) {
  const [left, setLeft] = useState(() => (stampAt === undefined ? 0 : Math.max(0, Math.ceil((stampAt - Date.now()) / 1000))));
  useEffect(() => {
    if (!active || stampAt === undefined) { setLeft(0); return; }
    const update = () => setLeft(Math.max(0, Math.ceil((stampAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [stampAt, active]);
  return left;
}

const clip = (value: string, max: number) => { const v = value.trim().toUpperCase(); return v.length > max ? `${v.slice(0, max - 1)}…` : v; };
const inkOf = (seed: string) => { let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 3; };

type Props = {
  info: StampInfo;
  size?: number;
  className?: string;
  /** Show a dashed "stamp arriving" placeholder with a countdown until the stamp lands. */
  showPending?: boolean;
};

export default function PassportStamp({ info, size = 96, className = '', showPending = false }: Props) {
  const uid = useId().replace(/:/g, '');
  const { ready, fresh } = useStampReady(info.stampAt);
  const left = useStampCountdown(info.stampAt, showPending && !ready);

  if (!ready) {
    if (!showPending) return null;
    const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, '0');
    return <span className={`rl-stamp-pending ${className}`} aria-label={`Your passport stamp arrives in ${mm} minutes ${ss} seconds`}>
      <i /><b>Stamp in {mm}:{ss}</b>
    </span>;
  }

  const top = clip(info.place || 'Somewhere', 24);
  const bottom = `${clip(info.region || 'India', 18)} ★ ROAMLY`;
  const ink = inkOf(`${info.place}${info.region}`);

  const category = (info.category || '').toLowerCase();
  const tone = /beach|coast|waterfall|lake|river|island|sea/.test(category) ? 'water' : /mountain|trek|nature|forest|hill/.test(category) ? 'nature' : /temple|heritage|historic|fort|palace/.test(category) ? 'heritage' : 'default';

  return (
    <span className={`rl-stamp ink-${ink} stamp-${tone} ${fresh ? 'fresh' : ''} ${className}`} style={{ width: size, height: size }} role="img" aria-label={`Passport stamp: ${info.place}${info.region ? `, ${info.region}` : ''}`}>
      <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
        <defs>
          {/* worn-ink look: small gaps in the ink + slightly rough edges */}
          <filter id={`ink-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -4.2 3.7" result="holes" />
            <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" seed="3" result="warp" />
            <feDisplacementMap in="SourceGraphic" in2="warp" scale="1.6" result="rough" />
            <feComposite in="rough" in2="holes" operator="in" />
          </filter>
          <path id={`top-${uid}`} d="M 23 60 A 37 37 0 0 1 97 60" />
          <path id={`bot-${uid}`} d="M 14 60 A 46 46 0 0 0 106 60" />
        </defs>
        <circle cx="60" cy="60" r="58" className="stamp-paper" />
        <g filter={`url(#ink-${uid})`} className="stamp-ink">
          <circle cx="60" cy="60" r="55" fill="none" strokeWidth="3" />
          <circle cx="60" cy="60" r="50.500" fill="none" strokeWidth="1.100" />
          <circle cx="60" cy="60" r="31" fill="none" strokeWidth="1.400" />
          <text className="stamp-ring"><textPath href={`#top-${uid}`} startOffset="50%" textAnchor="middle">{top}</textPath></text>
          <text className="stamp-ring small"><textPath href={`#bot-${uid}`} startOffset="50%" textAnchor="middle">{bottom}</textPath></text>
          <circle cx="16.500" cy="60" r="1.800" stroke="none" /><circle cx="103.500" cy="60" r="1.800" stroke="none" />
          {/* mountains + sun */}
          <path d="M40 58 49 44l5 8 4-5 8 11z" fill="none" strokeWidth="1.800" strokeLinejoin="round" />
          <path d="M52.500 49.500 55 53l2.500-2" fill="none" strokeWidth="1.100" />
          <circle cx="71" cy="45" r="3" stroke="none" />
          <path d="M37 62h46" strokeWidth="1.100" />
          <text x="60" y="73" className="stamp-date" textAnchor="middle">{clip(info.date || '', 12)}</text>
        </g>
      </svg>
    </span>
  );
}
