import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Heart, Images, MapPin, MessageCircle, Search, Send, Share2, Sparkles, Trash2, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { api } from '../lib/api';
import PostCarousel, { type PostData } from '../components/PostCarousel';
import PassportStamp, { type StampInfo } from '../components/PassportStamp';

type Relationship = 'none' | 'sent' | 'received' | 'friends';
type Person = { id: string; name: string; avatar: string; bio: string };
type FoundPerson = Person & { relationship: Relationship; requestId: string | null; mutualCount: number };
type Friend = Person & { friendsSince: string; mutualCount: number; sharedCount: number };
type IncomingRequest = Person & { id: string; senderId: string; createdAt: string; mutualCount: number };
type OutgoingRequest = Person & { id: string; receiverId: string; createdAt: string };
type FeedMemory = {
  id: string; title: string; story: string; place: string; state: string; district: string; destinationName: string;
  visitDate: string; images: string[]; createdAt: string; author: Person;
  likeCount: number; liked: boolean; commentCount: number;
  stampIn?: number; stampAt?: number;
};
type Comment = { id: string; comment: string; createdAt: string; author: Person; mine: boolean };
type MyMemory = { id: string; title: string; imageUrl: string; images?: string[]; place?: string };
type Tab = 'feed' | 'friends' | 'requests' | 'find';

const timeAgo = (value?: string) => {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (Number.isNaN(seconds)) return '';
  if (seconds < 60) return 'just now';
  const units: [number, string][] = [[31536000, 'y'], [2592000, 'mo'], [604800, 'w'], [86400, 'd'], [3600, 'h'], [60, 'm']];
  for (const [size, label] of units) if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
  return 'just now';
};
const memberSince = (value?: string) => { const d = value ? new Date(value.replace(' ', 'T')) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''; };
// Stamp lands 5 minutes after upload; seconds left come from the server so clocks/timezones don't matter.
const withStamp = (m: FeedMemory): FeedMemory => ({ ...m, stampAt: typeof m.stampIn === 'number' ? Date.now() + m.stampIn * 1000 : undefined });
const stampOf = (m: FeedMemory): StampInfo => ({ stampAt: m.stampAt, place: m.destinationName || m.place || m.title, region: m.state, date: m.visitDate ? new Date(`${m.visitDate}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined });
const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

function Avatar({ person, size = 44 }: { person: Pick<Person, 'name' | 'avatar'>; size?: number }) {
  return <span className="fr-avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>
    {person.avatar ? <img src={person.avatar} alt="" loading="lazy" /> : <b>{(person.name || '?').charAt(0).toUpperCase()}</b>}
  </span>;
}

type Props = { onBadge?: (pendingRequests: number) => void; openMemory?: () => void };

export default function FriendsPage({ onBadge, openMemory }: Props) {
  const [tab, setTab] = useState<Tab>('feed');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([]);
  const [feed, setFeed] = useState<FeedMemory[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [suggestions, setSuggestions] = useState<FoundPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [post, setPost] = useState<PostData | null>(null);
  const [sharing, setSharing] = useState(false);
  const noticeTimer = useRef<number>();

  const say = useCallback((message: string) => {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 3200);
  }, []);
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const loadPeople = useCallback(async () => {
    const [f, r, s] = await Promise.all([
      api<{ friends: Friend[] }>('/friends'),
      api<{ incoming: IncomingRequest[]; outgoing: OutgoingRequest[] }>('/friend-requests'),
      api<{ users: FoundPerson[] }>('/friends/suggestions').catch(() => ({ users: [] as FoundPerson[] })),
    ]);
    setFriends(f.friends); setIncoming(r.incoming); setOutgoing(r.outgoing); setSuggestions(s.users);
    onBadge?.(r.incoming.length);
  }, [onBadge]);

  const loadFeed = useCallback(async (offset = 0) => {
    const result = await api<{ memories: FeedMemory[]; hasMore: boolean }>(`/friends/memories?limit=12&offset=${offset}`);
    const stamped = result.memories.map(withStamp);
    setFeed(prev => offset ? [...prev, ...stamped] : stamped);
    setHasMore(result.hasMore);
  }, []);

  const refreshAll = useCallback(async () => {
    try { setError(''); await Promise.all([loadPeople(), loadFeed(0)]); }
    catch (e) { setError(errorText(e, 'Could not load your friends.')); }
    finally { setLoading(false); }
  }, [loadPeople, loadFeed]);
  useEffect(() => { refreshAll(); }, [refreshAll]);

  // ---- actions ------------------------------------------------------
  const run = async (id: string, action: () => Promise<void>, success?: string) => {
    setBusyId(id);
    try { await action(); if (success) say(success); }
    catch (e) { setError(errorText(e, 'Something went wrong.')); window.setTimeout(() => setError(''), 4000); }
    finally { setBusyId(''); }
  };
  const sendRequest = (person: Person) => run(person.id, async () => {
    const result = await api<{ status: string }>(`/friend-requests/${person.id}`, { method: 'POST' });
    await Promise.all([loadPeople(), loadFeed(0)]);
    say(result.status === 'friends' ? `You and ${person.name} are now friends.` : `Request sent to ${person.name}.`);
  });
  const cancelRequest = (requestId: string, name: string) => run(requestId, async () => { await api(`/friend-requests/${requestId}`, { method: 'DELETE' }); await loadPeople(); }, `Request to ${name} cancelled.`);
  const respond = (requestId: string, name: string, status: 'accepted' | 'rejected') => run(requestId, async () => {
    await api(`/friend-requests/${requestId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await Promise.all([loadPeople(), loadFeed(0)]);
  }, status === 'accepted' ? `You and ${name} are now friends.` : `Request from ${name} declined.`);
  const unfriend = (friend: Person) => {
    if (!window.confirm(`Remove ${friend.name} from your friends? Shared memories between you will stop being visible to each other.`)) return;
    run(friend.id, async () => { await api(`/friends/${friend.id}`, { method: 'DELETE' }); setProfileId(null); await Promise.all([loadPeople(), loadFeed(0)]); }, `${friend.name} was removed.`);
  };
  const toggleLike = async (memory: FeedMemory) => {
    setFeed(prev => prev.map(m => m.id === memory.id ? { ...m, liked: !m.liked, likeCount: m.likeCount + (m.liked ? -1 : 1) } : m));
    try { const r = await api<{ liked: boolean; count: number }>(`/memories/${memory.id}/like`, { method: 'POST' }); setFeed(prev => prev.map(m => m.id === memory.id ? { ...m, liked: r.liked, likeCount: r.count } : m)); }
    catch (e) { setFeed(prev => prev.map(m => m.id === memory.id ? memory : m)); setError(errorText(e, 'Could not update your like.')); window.setTimeout(() => setError(''), 4000); }
  };
  const openPost = (memory: FeedMemory) => setPost({
    title: memory.title, images: memory.images, date: memory.visitDate,
    place: [memory.destinationName || memory.place, memory.district, memory.state].filter(Boolean).join(' · '),
    note: memory.story ? `${memory.author.name}: ${memory.story}` : undefined, stamp: stampOf(memory),
  });

  const pending = incoming.length;
  const tabs: { id: Tab; label: string; icon: typeof Users; count?: number }[] = [
    { id: 'feed', label: 'Feed', icon: Sparkles },
    { id: 'friends', label: 'Friends', icon: Users, count: friends.length },
    { id: 'requests', label: 'Requests', icon: UserPlus, count: pending },
    { id: 'find', label: 'Find people', icon: Search },
  ];

  return <div className="rl-page fr-page">
    <header className="fr-head">
      <div><span className="rl-eyebrow">Your travel circle</span><h1>Friends</h1><p>Share trips, see where your people have been, and plan the next one together.</p></div>
      <div className="fr-head-actions">
        <button className="btn-secondary" onClick={() => setSharing(true)} disabled={!friends.length} title={friends.length ? 'Choose who sees a memory' : 'Add a friend first'}><Share2 size={16} /> Share a memory</button>
        <button className="btn-primary" onClick={() => setTab('find')}><UserPlus size={16} /> Add friends</button>
      </div>
    </header>

    <nav className="fr-tabs" role="tablist" aria-label="Friends sections">
      {tabs.map(t => { const Icon = t.icon; return <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
        <Icon size={17} /><span>{t.label}</span>{!!t.count && <b className={t.id === 'requests' ? 'alert' : ''}>{t.count}</b>}
      </button>; })}
    </nav>

    {error && <p className="fr-error" role="alert">{error}</p>}
    {notice && <p className="fr-notice" role="status"><Check size={15} /> {notice}</p>}

    {loading ? <div className="fr-skeletons" aria-busy="true">{[0, 1, 2].map(i => <div key={i} className="fr-skeleton" />)}</div> : <>
      {tab === 'feed' && <FeedTab friends={friends} feed={feed} hasMore={hasMore} onMore={() => loadFeed(feed.length).catch(e => setError(errorText(e, 'Could not load more.')))}
        onProfile={setProfileId} onLike={toggleLike} onOpen={openPost} onFind={() => setTab('find')} onShare={() => setSharing(true)} onNewMemory={openMemory} />}
      {tab === 'friends' && <FriendsTab friends={friends} onProfile={setProfileId} onUnfriend={unfriend} busyId={busyId} onFind={() => setTab('find')} />}
      {tab === 'requests' && <RequestsTab incoming={incoming} outgoing={outgoing} busyId={busyId} onRespond={respond} onCancel={cancelRequest} onFind={() => setTab('find')} />}
      {tab === 'find' && <FindTab suggestions={suggestions} busyId={busyId} onAdd={sendRequest} onCancel={cancelRequest} onRespond={respond} onProfile={setProfileId} />}
    </>}

    {profileId && <FriendProfile friendId={profileId} onClose={() => setProfileId(null)} onOpenPost={setPost} onUnfriend={unfriend} />}
    {sharing && <ShareModal friends={friends} onClose={() => setSharing(false)} onSaved={message => { say(message); loadFeed(0).catch(() => undefined); }} />}
    {post && <PostCarousel post={post} onClose={() => setPost(null)} />}
  </div>;
}

/* ------------------------------------------------------------------ Feed */
function FeedTab({ friends, feed, hasMore, onMore, onProfile, onLike, onOpen, onFind, onShare, onNewMemory }: {
  friends: Friend[]; feed: FeedMemory[]; hasMore: boolean; onMore: () => void; onProfile: (id: string) => void;
  onLike: (m: FeedMemory) => void; onOpen: (m: FeedMemory) => void; onFind: () => void; onShare: () => void; onNewMemory?: () => void;
}) {
  return <div className="fr-feed-layout">
    {friends.length > 0 && <section className="fr-strip" aria-label="Your friends">
      {friends.map(f => <button key={f.id} onClick={() => onProfile(f.id)} aria-label={`Open ${f.name}'s profile`}>
        <span className={`fr-ring ${f.sharedCount ? 'live' : ''}`}><Avatar person={f} size={62} /></span><small>{f.name.split(' ')[0]}</small>
      </button>)}
    </section>}

    {feed.length ? <div className="fr-feed">
      {feed.map(m => <FeedCard key={m.id} memory={m} onProfile={onProfile} onLike={onLike} onOpen={onOpen} />)}
      {hasMore && <button className="btn-secondary fr-more" onClick={onMore}>Load more memories</button>}
    </div> : <div className="fr-empty">
      <span><Sparkles size={30} /></span>
      <h2>{friends.length ? 'Nothing shared with you yet' : 'Travel is better together'}</h2>
      <p>{friends.length ? 'When a friend shares a diary memory with you, it appears here. You can also share one of yours so they can do the same.' : 'Add a few friends and you will see the memories they share with you here.'}</p>
      <div className="fr-empty-actions">
        {friends.length ? <button className="btn-primary" onClick={onShare}><Share2 size={16} /> Share a memory</button> : <button className="btn-primary" onClick={onFind}><UserPlus size={16} /> Find friends</button>}
        {onNewMemory && <button className="btn-secondary" onClick={onNewMemory}>Write a new memory</button>}
      </div>
    </div>}
  </div>;
}

function FeedCard({ memory, onProfile, onLike, onOpen }: { memory: FeedMemory; onProfile: (id: string) => void; onLike: (m: FeedMemory) => void; onOpen: (m: FeedMemory) => void }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState('');
  const [count, setCount] = useState(memory.commentCount);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const where = [memory.destinationName || memory.place, memory.state].filter(Boolean).join(', ');

  const toggleComments = async () => {
    const next = !showComments; setShowComments(next);
    if (next && comments === null) {
      try { setComments((await api<{ comments: Comment[] }>(`/memories/${memory.id}/comments`)).comments); }
      catch (e) { setErr(errorText(e, 'Could not load comments.')); setComments([]); }
    }
  };
  const send = async () => {
    const value = text.trim(); if (!value || sending) return;
    setSending(true); setErr('');
    try { const r = await api<{ comment: Comment }>(`/memories/${memory.id}/comments`, { method: 'POST', body: JSON.stringify({ comment: value }) }); setComments(prev => [...(prev || []), r.comment]); setCount(c => c + 1); setText(''); }
    catch (e) { setErr(errorText(e, 'Could not post your comment.')); } finally { setSending(false); }
  };
  const remove = async (id: string) => {
    try { await api(`/comments/${id}`, { method: 'DELETE' }); setComments(prev => (prev || []).filter(c => c.id !== id)); setCount(c => Math.max(0, c - 1)); }
    catch (e) { setErr(errorText(e, 'Could not delete that comment.')); }
  };

  return <article className="fr-card">
    <header>
      <button className="fr-card-author" onClick={() => onProfile(memory.author.id)}><Avatar person={memory.author} size={42} /><span><strong>{memory.author.name}</strong><small>{timeAgo(memory.createdAt)}</small></span></button>
      {where && <span className="fr-where"><MapPin size={13} />{where}</span>}
    </header>
    <button className="fr-media" onClick={() => onOpen(memory)} aria-label={`Open ${memory.title}`}>
      <img src={memory.images[0]} alt={memory.title} loading="lazy" />
      {memory.images.length > 1 && <span className="fr-multi"><Images size={14} />{memory.images.length}</span>}
      <PassportStamp info={stampOf(memory)} size={96} className="feed-stamp" />
    </button>
    <div className="fr-card-actions">
      <button className={memory.liked ? 'liked' : ''} onClick={() => onLike(memory)} aria-pressed={memory.liked} aria-label={memory.liked ? 'Unlike' : 'Like'}><Heart size={21} fill={memory.liked ? 'currentColor' : 'none'} /><span>{memory.likeCount || ''}</span></button>
      <button onClick={toggleComments} aria-expanded={showComments} aria-label="Comments"><MessageCircle size={21} /><span>{count || ''}</span></button>
    </div>
    <div className="fr-card-body">
      <h3>{memory.title}</h3>
      {memory.story && <p>{memory.story}</p>}
    </div>
    {showComments && <div className="fr-comments">
      {comments === null ? <p className="fr-muted">Loading comments…</p> : comments.length ? <ul>{comments.map(c => <li key={c.id}>
        <Avatar person={c.author} size={30} />
        <div><p><strong>{c.author.name}</strong> {c.comment}</p><small>{timeAgo(c.createdAt)}</small></div>
        {c.mine && <button onClick={() => remove(c.id)} aria-label="Delete comment"><Trash2 size={14} /></button>}
      </li>)}</ul> : <p className="fr-muted">No comments yet. Say something nice.</p>}
      {err && <p className="fr-inline-error">{err}</p>}
      <form onSubmit={e => { e.preventDefault(); send(); }}>
        <input value={text} onChange={e => setText(e.target.value)} maxLength={1000} placeholder="Add a comment…" aria-label="Add a comment" />
        <button type="submit" disabled={!text.trim() || sending} aria-label="Post comment"><Send size={16} /></button>
      </form>
    </div>}
  </article>;
}

/* --------------------------------------------------------------- Friends */
function FriendsTab({ friends, onProfile, onUnfriend, busyId, onFind }: { friends: Friend[]; onProfile: (id: string) => void; onUnfriend: (f: Friend) => void; busyId: string; onFind: () => void }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => friends.filter(f => f.name.toLowerCase().includes(q.trim().toLowerCase())), [friends, q]);
  if (!friends.length) return <div className="fr-empty"><span><Users size={30} /></span><h2>No friends yet</h2><p>Search for people by name or email and send your first request.</p><button className="btn-primary" onClick={onFind}><UserPlus size={16} /> Find friends</button></div>;
  return <section className="fr-section">
    <label className="fr-search"><Search size={17} /><input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search your ${friends.length} friends…`} />{q && <button onClick={() => setQ('')} aria-label="Clear search"><X size={15} /></button>}</label>
    {list.length ? <div className="fr-grid">{list.map(f => <article className="fr-person" key={f.id}>
      <button className="fr-person-main" onClick={() => onProfile(f.id)}>
        <span className={`fr-ring ${f.sharedCount ? 'live' : ''}`}><Avatar person={f} size={74} /></span>
        <strong>{f.name}</strong>
        <p>{f.bio || 'Collecting stories one trip at a time.'}</p>
      </button>
      <ul className="fr-facts"><li><b>{f.sharedCount}</b>shared</li><li><b>{f.mutualCount}</b>mutual</li><li><b>{memberSince(f.friendsSince) || '—'}</b>friends since</li></ul>
      <div className="fr-person-actions"><button className="btn-secondary" onClick={() => onProfile(f.id)}>View profile</button>
        <button className="fr-icon-danger" onClick={() => onUnfriend(f)} disabled={busyId === f.id} aria-label={`Remove ${f.name}`} title="Remove friend"><UserMinus size={16} /></button></div>
    </article>)}</div> : <p className="fr-muted">No friends match “{q}”.</p>}
  </section>;
}

/* -------------------------------------------------------------- Requests */
function RequestsTab({ incoming, outgoing, busyId, onRespond, onCancel, onFind }: {
  incoming: IncomingRequest[]; outgoing: OutgoingRequest[]; busyId: string;
  onRespond: (id: string, name: string, status: 'accepted' | 'rejected') => void; onCancel: (id: string, name: string) => void; onFind: () => void;
}) {
  if (!incoming.length && !outgoing.length) return <div className="fr-empty"><span><UserPlus size={30} /></span><h2>No pending requests</h2><p>Requests you send and receive will show up here.</p><button className="btn-primary" onClick={onFind}>Find people <ArrowRight size={16} /></button></div>;
  return <div className="fr-requests">
    <section className="fr-section"><div className="fr-sec-head"><h2>Received</h2><span>{incoming.length}</span></div>
      {incoming.length ? <ul className="fr-list">{incoming.map(r => <li key={r.id}>
        <Avatar person={r} size={52} />
        <div className="fr-list-text"><strong>{r.name}</strong><small>{r.mutualCount ? `${r.mutualCount} mutual friend${r.mutualCount > 1 ? 's' : ''} · ` : ''}{timeAgo(r.createdAt)}</small></div>
        <div className="fr-list-actions"><button className="btn-primary" disabled={busyId === r.id} onClick={() => onRespond(r.id, r.name, 'accepted')}><Check size={15} /> Accept</button>
          <button className="btn-secondary" disabled={busyId === r.id} onClick={() => onRespond(r.id, r.name, 'rejected')}>Decline</button></div>
      </li>)}</ul> : <p className="fr-muted">No requests waiting for you.</p>}
    </section>
    <section className="fr-section"><div className="fr-sec-head"><h2>Sent</h2><span>{outgoing.length}</span></div>
      {outgoing.length ? <ul className="fr-list">{outgoing.map(r => <li key={r.id}>
        <Avatar person={r} size={52} />
        <div className="fr-list-text"><strong>{r.name}</strong><small>Sent {timeAgo(r.createdAt)} · waiting for a reply</small></div>
        <div className="fr-list-actions"><button className="btn-secondary" disabled={busyId === r.id} onClick={() => onCancel(r.id, r.name)}>Cancel request</button></div>
      </li>)}</ul> : <p className="fr-muted">You have no pending sent requests.</p>}
    </section>
  </div>;
}

/* ------------------------------------------------------------------ Find */
function FindTab({ suggestions, busyId, onAdd, onCancel, onRespond, onProfile }: {
  suggestions: FoundPerson[]; busyId: string; onAdd: (p: Person) => void; onCancel: (requestId: string, name: string) => void;
  onRespond: (id: string, name: string, status: 'accepted' | 'rejected') => void; onProfile: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<FoundPerson[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const term = q.trim();

  useEffect(() => {
    if (term.length < 2) { setResults([]); setSearching(false); setSearchError(''); return; }
    setSearching(true);
    const handle = window.setTimeout(async () => {
      try { setResults((await api<{ users: FoundPerson[] }>(`/users/search?q=${encodeURIComponent(term)}`)).users); setSearchError(''); }
      catch (e) { setSearchError(errorText(e, 'Search failed.')); } finally { setSearching(false); }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [term]);

  // Reflect actions (add / cancel / accept) in the visible results without another search.
  const [overrides, setOverrides] = useState<Record<string, Relationship>>({});
  const relationOf = (p: FoundPerson) => overrides[p.id] ?? p.relationship;
  useEffect(() => { setOverrides({}); }, [results, suggestions]);
  const act = (person: FoundPerson) => {
    const rel = relationOf(person);
    if (rel === 'none') { onAdd(person); setOverrides(o => ({ ...o, [person.id]: 'sent' })); }
    else if (rel === 'sent' && person.requestId) { onCancel(person.requestId, person.name); setOverrides(o => ({ ...o, [person.id]: 'none' })); }
    else if (rel === 'received' && person.requestId) { onRespond(person.requestId, person.name, 'accepted'); setOverrides(o => ({ ...o, [person.id]: 'friends' })); }
  };

  const row = (p: FoundPerson) => { const rel = relationOf(p); return <li key={p.id}>
    <button className="fr-row-avatar" onClick={() => rel === 'friends' && onProfile(p.id)} tabIndex={rel === 'friends' ? 0 : -1}><Avatar person={p} size={52} /></button>
    <div className="fr-list-text"><strong>{p.name}</strong><small>{p.mutualCount ? `${p.mutualCount} mutual friend${p.mutualCount > 1 ? 's' : ''}` : p.bio || 'Roamly traveler'}</small></div>
    <div className="fr-list-actions">
      {rel === 'friends' ? <span className="fr-pill"><Check size={14} /> Friends</span>
        : <button className={rel === 'none' ? 'btn-primary' : 'btn-secondary'} disabled={busyId === p.id || (rel !== 'none' && !p.requestId)} onClick={() => act(p)}>
          {rel === 'none' && <><UserPlus size={15} /> Add friend</>}{rel === 'sent' && 'Requested · Undo'}{rel === 'received' && <><Check size={15} /> Accept</>}</button>}
    </div>
  </li>; };

  return <section className="fr-section">
    <label className="fr-search big"><Search size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or exact email address…" autoFocus aria-label="Search for people" />{q && <button onClick={() => setQ('')} aria-label="Clear search"><X size={15} /></button>}</label>
    {term.length >= 2 ? <>
      {searchError && <p className="fr-inline-error">{searchError}</p>}
      {searching && !results.length ? <p className="fr-muted">Searching…</p> : results.length ? <ul className="fr-list">{results.map(row)}</ul>
        : !searching && <div className="fr-empty small"><h3>No one found for “{term}”</h3><p>Check the spelling, or try the person’s full email address.</p></div>}
    </> : <>
      <p className="fr-hint">Type at least 2 letters. To find someone who has a common name, search with their email address.</p>
      {suggestions.length > 0 && <><div className="fr-sec-head"><h2>People you may know</h2><span>via mutual friends</span></div><ul className="fr-list">{suggestions.map(row)}</ul></>}
    </>}
  </section>;
}

/* --------------------------------------------------------- Friend profile */
function FriendProfile({ friendId, onClose, onOpenPost, onUnfriend }: { friendId: string; onClose: () => void; onOpenPost: (p: PostData) => void; onUnfriend: (f: Person) => void }) {
  const [data, setData] = useState<{ friend: Person & { friendsSince: string; mutualCount: number; sharedCount: number }; memories: FeedMemory[] } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api<NonNullable<typeof data>>(`/friends/${friendId}`).then(r => setData({ ...r, memories: r.memories.map(withStamp) })).catch(e => setError(errorText(e, 'Could not load this profile.'))); }, [friendId]);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  const f = data?.friend;
  return <div className="modal-backdrop" onClick={onClose}><section className="fr-profile" role="dialog" aria-modal="true" aria-label="Friend profile" onClick={e => e.stopPropagation()}>
    <button className="icon-btn fr-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
    {error ? <p className="fr-error">{error}</p> : !f ? <p className="fr-muted">Loading…</p> : <>
      <div className="fr-profile-head">
        <span className={`fr-ring ${f.sharedCount ? 'live' : ''}`}><Avatar person={f} size={96} /></span>
        <div><h2>{f.name}</h2><p>{f.bio || 'Collecting stories one trip at a time.'}</p>
          <ul className="fr-facts inline"><li><b>{f.sharedCount}</b>shared with you</li><li><b>{f.mutualCount}</b>mutual</li><li><b>{memberSince(f.friendsSince) || '—'}</b>friends since</li></ul></div>
      </div>
      <h3 className="fr-profile-title">Shared with you</h3>
      {data!.memories.length ? <div className="fr-mini-grid">{data!.memories.map(m => <button key={m.id} onClick={() => onOpenPost({ title: m.title, images: m.images, date: m.visitDate, place: [m.destinationName || m.place, m.district, m.state].filter(Boolean).join(' · '), note: m.story, stamp: stampOf(m) })} aria-label={`Open ${m.title}`}>
        <img src={m.images[0]} alt={m.title} loading="lazy" />{m.images.length > 1 && <span><Images size={14} /></span>}<PassportStamp info={stampOf(m)} size={54} className="mini-stamp" /><em>{m.title}</em></button>)}</div>
        : <p className="fr-muted">{f.name.split(' ')[0]} hasn’t shared any memories with you yet.</p>}
      <div className="fr-profile-foot"><button className="fr-danger" onClick={() => onUnfriend(f)}><UserMinus size={15} /> Remove friend</button></div>
    </>}
  </section></div>;
}

/* ------------------------------------------------------------ Share modal */
function ShareModal({ friends, onClose, onSaved }: { friends: Friend[]; onClose: () => void; onSaved: (message: string) => void }) {
  const [memories, setMemories] = useState<MyMemory[] | null>(null);
  const [memoryId, setMemoryId] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingShare, setLoadingShare] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api<{ memories: MyMemory[] }>('/memories').then(r => { setMemories(r.memories); if (r.memories[0]) setMemoryId(r.memories[0].id); }).catch(e => { setError(errorText(e, 'Could not load your memories.')); setMemories([]); }); }, []);
  useEffect(() => {
    if (!memoryId) return;
    setLoadingShare(true);
    api<{ friendIds: string[] }>(`/memories/${memoryId}/sharing`).then(r => setSelected(r.friendIds)).catch(() => setSelected([])).finally(() => setLoadingShare(false));
  }, [memoryId]);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);

  const allSelected = friends.length > 0 && selected.length === friends.length;
  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const save = async () => {
    setSaving(true); setError('');
    try {
      const r = await api<{ friendIds: string[] }>(`/memories/${memoryId}/sharing`, { method: 'PATCH', body: JSON.stringify({ friendIds: selected }) });
      onSaved(r.friendIds.length ? `Shared with ${r.friendIds.length} friend${r.friendIds.length > 1 ? 's' : ''}.` : 'This memory is private again.'); onClose();
    } catch (e) { setError(errorText(e, 'Could not update sharing.')); } finally { setSaving(false); }
  };

  return <div className="modal-backdrop" onClick={onClose}><section className="fr-share" role="dialog" aria-modal="true" aria-label="Share a memory" onClick={e => e.stopPropagation()}>
    <div className="modal-heading"><div><span className="eyebrow">Diary sharing</span><h2>Share a memory</h2></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
    {memories === null ? <p className="fr-muted">Loading your memories…</p> : !memories.length ? <p className="fr-muted">You have no diary memories yet. Write one first, then come back to share it.</p> : <>
      <label className="field-label">Memory
        <select value={memoryId} onChange={e => setMemoryId(e.target.value)}>{memories.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
      <div className="fr-share-head"><strong>Who can see it?</strong>
        <button onClick={() => setSelected(allSelected ? [] : friends.map(f => f.id))}>{allSelected ? 'Clear all' : 'Select all'}</button></div>
      <ul className="fr-share-list" aria-busy={loadingShare}>{friends.map(f => <li key={f.id}><label><input type="checkbox" checked={selected.includes(f.id)} onChange={() => toggle(f.id)} disabled={loadingShare} />
        <Avatar person={f} size={36} /><span>{f.name}</span></label></li>)}</ul>
      <p className="fr-hint">Only the friends you tick can see this memory. You can change this any time.</p>
      {error && <p className="fr-inline-error">{error}</p>}
      <div className="modal-actions"><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={saving || loadingShare || !memoryId}>{saving ? 'Saving…' : 'Save sharing'}</button></div>
    </>}
  </section></div>;
}
