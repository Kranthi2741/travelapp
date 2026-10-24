import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Pause, Play, X } from 'lucide-react';
import PassportStamp, { type StampInfo } from './PassportStamp';

export type StorySlide = { image: string; title: string; subtitle?: string; caption?: string };
export type StoryGroup = { id: string; label: string; cover: string; slides: StorySlide[]; /** Passport stamp shown on every photo of this story (it lands 5 minutes after upload). */ stamp?: StampInfo };

type Props = {
  groups: StoryGroup[];
  startGroup: number;
  startSlide?: number;
  onClose: () => void;
  /** Called when a group has been opened, so the ring can turn grey like a "seen" story. */
  onSeen?: (id: string) => void;
};

const SLIDE_MS = 5000;

export default function StoryViewer({ groups, startGroup, startSlide = 0, onClose, onSeen }: Props) {
  const [g, setG] = useState(Math.min(Math.max(startGroup, 0), groups.length - 1));
  const [s, setS] = useState(startSlide);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const elapsed = useRef(0);
  const last = useRef(0);
  const raf = useRef(0);
  const holdStart = useRef(0);

  const group = groups[g];
  const slide = group?.slides[s];

  const next = useCallback(() => {
    if (!group) return;
    if (s < group.slides.length - 1) { setS(s + 1); return; }
    if (g < groups.length - 1) { setG(g + 1); setS(0); return; }
    onClose();
  }, [g, s, group, groups.length, onClose]);

  const prev = useCallback(() => {
    if (s > 0) { setS(s - 1); return; }
    if (g > 0) { setG(g - 1); setS(0); return; }
    elapsed.current = 0; setProgress(0);
  }, [g, s]);

  const jumpGroup = (dir: 1 | -1) => {
    const target = g + dir;
    if (target < 0) return;
    if (target >= groups.length) { onClose(); return; }
    setG(target); setS(0);
  };

  // Reset the timer whenever the slide changes and mark the group as seen.
  useEffect(() => { elapsed.current = 0; setProgress(0); }, [g, s]);
  useEffect(() => { if (group) onSeen?.(group.id); }, [g]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-advance timer (requestAnimationFrame so pausing is exact).
  useEffect(() => {
    if (paused || !slide) return;
    last.current = performance.now();
    const tick = (now: number) => {
      elapsed.current += now - last.current;
      last.current = now;
      const p = Math.min(1, elapsed.current / SLIDE_MS);
      setProgress(p);
      if (p >= 1) { next(); return; }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [paused, slide, next]);

  // Keyboard controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ') { e.preventDefault(); setPaused(p => !p); }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [next, prev, onClose]);

  // Warm the cache for the next photo so slides switch instantly.
  useEffect(() => {
    const upcoming = group?.slides[s + 1] || groups[g + 1]?.slides[0];
    if (upcoming) { const img = new Image(); img.src = upcoming.image; }
  }, [g, s, group, groups]);

  if (!group || !slide) return null;

  const holdDown = () => { holdStart.current = Date.now(); setPaused(true); };
  const holdUp = () => setPaused(false);
  const tap = (action: () => void) => () => { if (Date.now() - holdStart.current < 250) action(); };

  return (
    <div className="sv-backdrop" role="dialog" aria-modal="true" aria-label={`${group.label} story`}>
      <div className="sv-bg" style={{ backgroundImage: `url(${slide.image})` }} aria-hidden="true" />

      <button className="sv-side sv-side-prev" onClick={() => jumpGroup(-1)} disabled={g === 0} aria-label="Previous story"><ChevronLeft size={26} /></button>

      <div className="sv-card">
        <div className="sv-bars" aria-hidden="true">
          {group.slides.map((_, i) => (
            <span key={i}><i style={{ width: `${i < s ? 100 : i === s ? progress * 100 : 0}%` }} /></span>
          ))}
        </div>

        <header className="sv-head">
          <img src={group.cover} alt="" />
          <div><strong>{group.label}</strong><small>{s + 1} of {group.slides.length}</small></div>
          <button onClick={() => setPaused(p => !p)} aria-label={paused ? 'Play' : 'Pause'}>{paused ? <Play size={18} /> : <Pause size={18} />}</button>
          <button onClick={onClose} aria-label="Close story"><X size={20} /></button>
        </header>

        <div className="sv-stage" onPointerDown={holdDown} onPointerUp={holdUp} onPointerLeave={holdUp} onPointerCancel={holdUp}>
          <img key={`bg-${slide.image}-${s}`} className="sv-photo-bg" src={slide.image} alt="" aria-hidden="true" draggable={false} />
          <img key={slide.image + s} className="sv-photo" src={slide.image} alt={slide.title} draggable={false} />
          {group.stamp && <PassportStamp info={group.stamp} size={112} className="sv-stamp" />}
          <button className="sv-zone sv-zone-prev" onClick={tap(prev)} aria-label="Previous photo" />
          <button className="sv-zone sv-zone-next" onClick={tap(next)} aria-label="Next photo" />
        </div>

        <footer className="sv-caption">
          <h3>{slide.title}</h3>
          {slide.subtitle && <p className="sv-where"><MapPin size={13} />{slide.subtitle}</p>}
          {slide.caption && <p className="sv-note">{slide.caption}</p>}
        </footer>
      </div>

      <button className="sv-side sv-side-next" onClick={() => jumpGroup(1)} aria-label="Next story"><ChevronRight size={26} /></button>
    </div>
  );
}
