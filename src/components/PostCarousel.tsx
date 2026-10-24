import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';
import PassportStamp, { type StampInfo } from './PassportStamp';

export type PostData = { title: string; images: string[]; place?: string; date?: string; note?: string; stamp?: StampInfo };

type Props = {
  post: PostData;
  /** Optional: jump to the neighbouring album, like swiping between posts. */
  onPrevPost?: () => void;
  onNextPost?: () => void;
  onClose: () => void;
};

/** Instagram-style multi-photo post: swipe or use arrows, "1/3" counter and dots. */
export default function PostCarousel({ post, onPrevPost, onNextPost, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const count = post.images.length;

  const goTo = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.min(Math.max(i, 0), count - 1);
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    setIndex(next);
  }, [count]);

  // Start at the first photo whenever a different album is shown.
  useEffect(() => { setIndex(0); track.current?.scrollTo({ left: 0 }); }, [post]);

  const onScroll = () => {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') index < count - 1 ? goTo(index + 1) : onNextPost?.();
      else if (e.key === 'ArrowLeft') index > 0 ? goTo(index - 1) : onPrevPost?.();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [index, count, goTo, onClose, onNextPost, onPrevPost]);

  return (
    <div className="pc-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={post.title}>
      <button className="pc-close" onClick={onClose} aria-label="Close post"><X size={22} /></button>
      {onPrevPost && <button className="pc-post-nav prev" onClick={e => { e.stopPropagation(); onPrevPost(); }} aria-label="Previous album"><ChevronLeft size={24} /></button>}

      <article className="pc-card" onClick={e => e.stopPropagation()}>
        <div className="pc-media">
          <div className="pc-track" ref={track} onScroll={onScroll}>
            {post.images.map((src, i) => (
              <div className="pc-slide" key={src + i}><img src={src} alt={`${post.title}, photo ${i + 1} of ${count}`} loading={i === 0 ? 'eager' : 'lazy'} draggable={false} />{post.stamp && <PassportStamp info={post.stamp} size={108} className="pc-stamp" />}</div>
            ))}
          </div>
          {count > 1 && <>
            <span className="pc-count">{index + 1}/{count}</span>
            {index > 0 && <button className="pc-arrow left" onClick={() => goTo(index - 1)} aria-label="Previous photo"><ChevronLeft size={20} /></button>}
            {index < count - 1 && <button className="pc-arrow right" onClick={() => goTo(index + 1)} aria-label="Next photo"><ChevronRight size={20} /></button>}
            <div className="pc-dots" aria-hidden="true">{post.images.map((_, i) => <i key={i} className={i === index ? 'on' : ''} />)}</div>
          </>}
        </div>

        <aside className="pc-info">
          <h2>{post.title}</h2>
          {post.place && <p className="pc-meta"><MapPin size={14} />{post.place}</p>}
          {post.date && <p className="pc-meta"><CalendarDays size={14} />{post.date}</p>}
          {post.note && <p className="pc-note">{post.note}</p>}
          {count > 1 && <div className="pc-thumbs">{post.images.map((src, i) => <button key={src + i} className={i === index ? 'on' : ''} onClick={() => goTo(i)} aria-label={`Show photo ${i + 1}`}><img src={src} alt="" /></button>)}</div>}
        </aside>
      </article>

      {onNextPost && <button className="pc-post-nav next" onClick={e => { e.stopPropagation(); onNextPost(); }} aria-label="Next album"><ChevronRight size={24} /></button>}
    </div>
  );
}
