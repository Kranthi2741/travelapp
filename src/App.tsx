import { useEffect, useMemo, useState } from 'react';
import { Compass, House, Map, BookOpen, Stamp, UserRound, Search, Bell, ChevronDown, ChevronRight, ArrowUpRight, Heart, MapPin, CalendarDays, Navigation, Sparkles, Plus, X, ArrowRight, Camera, Settings, LogOut, LocateFixed, Mountain, Waves, Landmark, Trees, Footprints, Droplets, LayoutGrid, Rows3, Plane, Share2, Images, Award, Users } from 'lucide-react';
import { categories, destinations } from './data/destinations';
import { INDIA_DIRECTORY, directoryCounts, setIndiaDirectory, type DirectoryState } from './data/indiaDirectory';
import { stateCoverUrl, districtCoverUrl } from './data/directoryImages';
import { IndiaSvgMap } from 'vardhan-maps/react';
import { api, getToken, setToken, type ApiMemory, type User } from './lib/api';
import RouteMapModal, { type RouteTarget } from './RouteMapModal';
import StoryViewer, { type StoryGroup } from './components/StoryViewer';
import PostCarousel from './components/PostCarousel';
import PassportStamp, { type StampInfo } from './components/PassportStamp';
import FriendsPage from './pages/FriendsPage';
import { CabinIcon, FoldMapIcon, CompassIcon, JournalIcon, CircleFriendsIcon, BootIcon, FallsIcon, PalmIcon, GopuramIcon, PeakIcon, GemIcon, PineIcon, StampToolIcon, PinIcon, CompassRose, type IconType } from './components/Icons';

type Page = 'Home' | 'Map' | 'Directory' | 'Diary' | 'Friends' | 'Profile';
type DiaryMemory = { stampAt?: number; createdAt?: string; id?: string; title: string; place: string; date: string; note: string; image: string; images?: string[]; state?: string; district?: string; destinationName?: string; tags?: string[] };
type MemoryPlaceContext = { name: string; state: string; district: string; cover?: string; key?: string };
type DestinationRecord = (typeof destinations)[number];
type DirectoryPlaceRecord = { key: string; name: string; state: string; district: string; category: string; image: string; note: string; lat?: number; lng?: number; verified?: boolean };
let allDirectoryPlaces: DirectoryPlaceRecord[] = INDIA_DIRECTORY.flatMap(s => s.places.map(p => ({ ...p, state: s.name, key: `${s.name}::${p.district}::${p.name}` })));
// Passport stamp for a diary memory. `stampAt` is when it lands (5 minutes after upload).
const stampFor = (m: DiaryMemory): StampInfo => {
  const text = [m.destinationName, m.place, m.title, m.note, ...(m.tags || [])].filter(Boolean).join(' ').toLowerCase();
  const category = /beach|coast|waterfall|lake|river|island|sea/.test(text) ? 'Beaches' : /mountain|trek|nature|forest|hill/.test(text) ? 'Nature' : /temple|heritage|historic|fort|palace/.test(text) ? 'Heritage' : undefined;
  return { stampAt: m.stampAt, place: m.destinationName || m.place || m.title, region: m.state, date: m.date, category };
};
const stampAtFrom = (stampIn?: number) => (typeof stampIn === 'number' ? Date.now() + stampIn * 1000 : undefined);
const navItems: { label: Page; text: string; icon: IconType; center?: boolean }[] = [
  { label: 'Home', text: 'Home', icon: CabinIcon },
  { label: 'Directory', text: 'Explore', icon: CompassIcon },
  { label: 'Diary', text: 'Diary', icon: JournalIcon, center: true },
  { label: 'Map', text: 'Map', icon: FoldMapIcon },
  { label: 'Friends', text: 'Friends', icon: CircleFriendsIcon },
];
type UserLoc = { lat: number; lng: number; label: string };
const kmBetween = (a: UserLoc | null, lat?: number, lng?: number) => {
  if (!a || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const R = 6371, rad = (x: number) => x * Math.PI / 180;
  const dLat = rad((lat as number) - a.lat), dLng = rad((lng as number) - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(lat as number)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
};
const kmLabel = (km: number | null) => km === null ? '' : km < 1 ? 'Under 1 km away' : `${km.toLocaleString('en-IN')} km from you`;
const categoryIcons: Record<string, IconType> = { Mountains: PeakIcon, Beaches: PalmIcon, Heritage: GopuramIcon, Temples: GopuramIcon, Nature: PineIcon, Trekking: BootIcon, Waterfalls: FallsIcon, 'Hidden Gems': GemIcon };
const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const editDistance = (a: string, b: string) => { const row = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { let previous = row[0]; row[0] = i; for (let j = 1; j <= b.length; j++) { const current = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = current; } } return row[b.length]; };
const fuzzySearch = (query: string, text: string) => { const q = normalizeSearch(query); if (!q) return true; const haystack = normalizeSearch(text); if (haystack.includes(q)) return true; return q.split(' ').filter(Boolean).every(token => haystack.split(' ').some(word => word.includes(token) || editDistance(token, word) <= Math.max(1, Math.floor(token.length * .3)))); };

function App() {
  const [, setDirectoryVersion] = useState(0);
  const [page, setPage] = useState<Page>('Home');
  const [destinationData, setDestinationData] = useState(destinations);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [saved, setSaved] = useState<number[]>([]);
  const [savedDirectoryKeys, setSavedDirectoryKeys] = useState<string[]>([]);
  const [visitedDirectoryKeys, setVisitedDirectoryKeys] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(() => !getToken());
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => localStorage.getItem('rl-theme') === 'dark' ? 'dark' : 'light');
  const [settingsName, setSettingsName] = useState('');
  const [settingsPhone, setSettingsPhone] = useState(() => localStorage.getItem('rl-phone') || '');
  const [showMemoryForm, setShowMemoryForm] = useState(false);
  const [memoryTitle, setMemoryTitle] = useState('');
  const [memoryNote, setMemoryNote] = useState('');
  const [memoryPlace, setMemoryPlace] = useState('');
  const [memoryDate, setMemoryDate] = useState(new Date().toISOString().slice(0,10));
  const [memoryFiles, setMemoryFiles] = useState<File[]>([]);
  const [shareMemoryWithFriends, setShareMemoryWithFriends] = useState(false);
  const [friendsForSharing, setFriendsForSharing] = useState<any[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [memoryContext, setMemoryContext] = useState<MemoryPlaceContext | null>(null);
  const [savingMemory, setSavingMemory] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [friendBadge, setFriendBadge] = useState(0);
  const [toast, setToast] = useState('');
  const [selectedDestination, setSelectedDestination] = useState<typeof destinations[number] | null>(null);
  const [routeTarget, setRouteTarget] = useState<RouteTarget | null>(null);
  const [stats, setStats] = useState({ states: 0, places: 0, memories: 0, wishlist: 0, visitedIds: [] as number[] });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userLoc, setUserLoc] = useState<UserLoc | null>(null);
  const [locating, setLocating] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [searchingLocation, setSearchingLocation] = useState(false);
  useEffect(() => {
    let active = true;
    api<DirectoryState[]>('/directory').then(directory => {
      if (!active || !Array.isArray(directory)) return;
      setIndiaDirectory(directory);
      allDirectoryPlaces = directory.flatMap(s => s.places.map(p => ({ ...p, state: s.name, key: `${s.name}::${p.district}::${p.name}` })));
      setDirectoryVersion(version => version + 1);
    }).catch(() => { if (active) setDirectoryVersion(version => version + 1); });
    return () => { active = false; };
  }, []);
  const detectLocation = (quiet = false) => {
    if (!navigator.geolocation) { if (!quiet) { setToast('Location is not supported in this browser.'); setTimeout(() => setToast(''), 3000); } return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      let label = 'Your location';
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${lat}&lon=${lng}`);
        const j = await r.json();
        const a = j?.address || {};
        label = a.city || a.town || a.village || a.county || a.state_district || a.state || label;
      } catch { /* keep generic label */ }
      setUserLoc({ lat, lng, label }); setLocating(false);
      try { localStorage.setItem('rl-loc', JSON.stringify({ lat, lng, label })); } catch { /* ignore */ }
    }, err => {
      setLocating(false);
      if (!quiet) { setToast(err.code === err.PERMISSION_DENIED ? 'Location blocked. Allow location access in your browser to see distances.' : 'Could not get your location. Try again.'); setTimeout(() => setToast(''), 3500); }
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  };
  const chooseLocation = async () => {
    const query = locationQuery.trim();
    if (!query || searchingLocation) return;
    setSearchingLocation(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`);
      const results = await response.json();
      const result = results?.[0];
      if (!result) throw new Error('Location not found. Try a city or landmark name.');
      const lat = Number(result.lat), lng = Number(result.lon);
      const label = result.address?.city || result.address?.town || result.address?.village || result.name || query;
      const nextLocation = { lat, lng, label };
      setUserLoc(nextLocation);
      localStorage.setItem('rl-loc', JSON.stringify(nextLocation));
      setLocationQuery('');
      setShowLocationPicker(false);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not find that location.');
      setTimeout(() => setToast(''), 3500);
    } finally { setSearchingLocation(false); }
  };
  useEffect(() => {
    try { const raw = localStorage.getItem('rl-loc'); if (raw) setUserLoc(JSON.parse(raw)); } catch { /* ignore */ }
    (navigator as any).permissions?.query?.({ name: 'geolocation' }).then((p: any) => { if (p.state === 'granted') detectLocation(true); }).catch(() => {});
  }, []);
  // Keep the Friends badge fresh: check for new friend requests now and every minute.
  useEffect(() => {
    if (!backendReady) return;
    let alive = true;
    const check = () => api<{ incoming: number }>('/friends/summary').then(r => { if (alive) setFriendBadge(r.incoming); }).catch(() => undefined);
    check();
    const timer = window.setInterval(check, 60000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [backendReady]);
  const refreshDashboard = async () => { try { const d = await api<{stats:{states:number;places:number;memories:number;wishlist:number};visitedIds:number[];visitedDirectoryKeys?:string[]}>('/dashboard'); setStats({...d.stats, visitedIds:d.visitedIds}); setVisitedDirectoryKeys(d.visitedDirectoryKeys || []); } catch { /* keep last known stats */ } };
  const [memories, setMemories] = useState<DiaryMemory[]>([]);
  useEffect(() => { let active = true; (async () => { if (!getToken()) return; try { const me = await api<{user:User}>('/me'); const user = me.user; setCurrentUser(user); const [wishlist, diary, dash, destinationResult] = await Promise.all([api<{destinationIds:number[];directoryKeys?:string[]}>('/wishlist'), api<{memories:ApiMemory[]}>('/memories'), api<{stats:{states:number;places:number;memories:number;wishlist:number};visitedIds:number[];visitedDirectoryKeys?:string[]}>('/dashboard'), api<{destinations:typeof destinations}>('/destinations')]); if (!active) return; setDestinationData(destinationResult.destinations); setSaved(wishlist.destinationIds); setSavedDirectoryKeys(wishlist.directoryKeys || []); setVisitedDirectoryKeys(dash.visitedDirectoryKeys || []); setMemories(diary.memories.map(m => ({ id:m.id, createdAt:m.createdAt, title:m.title, place:m.place, date:new Date(m.visitDate+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}), note:m.story, image:m.imageUrl || destinationData[0]?.image || destinations[0].image, images:(m as ApiMemory & {images?:string[]}).images?.length ? (m as ApiMemory & {images?:string[]}).images : [m.imageUrl || destinationData[0]?.image || destinations[0].image], state:(m as ApiMemory & {state?:string}).state, district:(m as ApiMemory & {district?:string}).district, destinationName:(m as ApiMemory & {destinationName?:string}).destinationName, tags:m.tags || [], stampAt: stampAtFrom(m.stampIn) }))); setStats({...dash.stats,visitedIds:dash.visitedIds}); setBackendReady(true); } catch { setToken(null); if (active) { setBackendReady(false); setShowAuth(true); } } })(); return () => { active = false; }; }, []);
  useEffect(() => { try { localStorage.setItem('dd-saved-destinations', JSON.stringify(saved)); } catch { /* Storage may be unavailable in private browsing. */ } }, [saved]);
  const filtered = useMemo(() => destinationData.filter(d => (activeCategory === 'All' || d.category === activeCategory) && `${d.name} ${d.state} ${d.category}`.toLowerCase().includes(query.toLowerCase())), [destinationData, activeCategory, query]);
  const updateProfile = async (changes: Partial<Pick<User, 'name' | 'bio' | 'avatar'>>) => {
    if (!backendReady) throw new Error('Start the backend to save profile changes.');
    const result = await api<{user:User}>('/me', { method: 'PATCH', body: JSON.stringify(changes) });
    setCurrentUser(result.user);
    return result.user;
  };
  const toggleSaved = async (id: number) => { const previous = saved; setSaved(old => old.includes(id) ? old.filter(n => n !== id) : [...old, id]); if (backendReady) { try { const r = await api<{destinationIds:number[]}>(`/wishlist/${id}`, {method:'POST', body:JSON.stringify({})}); setSaved(r.destinationIds); await refreshDashboard(); } catch { setSaved(previous); setToast('Could not update wishlist. Please try again.'); setTimeout(()=>setToast(''),3500); } } };
  const toggleDirectorySaved = async (key: string) => {
    const place = allDirectoryPlaces.find(item => item.key === key);
    if (!place) return;
    const previous = savedDirectoryKeys;
    const next = previous.includes(key) ? previous.filter(item => item !== key) : [...previous, key];
    setSavedDirectoryKeys(next);
    try {
      if (backendReady) {
        const result = await api<{destinationIds:number[];directoryKeys:string[]}>('/wishlist/directory', { method:'POST', body:JSON.stringify({ key, place }) });
        setSavedDirectoryKeys(result.directoryKeys || []);
        await refreshDashboard();
      } else {
        setSavedDirectoryKeys(previous);
        setToast('Connect to the API before saving a wishlist place.');
        setTimeout(()=>setToast(''),3500);
      }
    } catch (e) {
      setSavedDirectoryKeys(previous);
      setToast(e instanceof Error ? e.message : 'Could not update wishlist.');
      setTimeout(()=>setToast(''),3500);
    }
  };
  const markDirectoryVisited = async (key: string) => {
    const place = allDirectoryPlaces.find(item => item.key === key);
    if (!place) return;
    if (!backendReady) {
      setToast('Start the API to record visits across sessions.');
      setTimeout(()=>setToast(''),3500);
      return;
    }
    try {
      await api('/visits/directory', { method:'POST', body:JSON.stringify({ key, place, visitDate:new Date().toISOString().slice(0,10) }) });
      await refreshDashboard();
      setToast(`Visit recorded: ${place.name}`);
      setTimeout(()=>setToast(''),3000);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Could not record visit.');
      setTimeout(()=>setToast(''),3500);
    }
  };
  const openGeneralMemory = () => { setMemoryContext(null); setMemoryFiles([]); setMemoryTitle(''); setMemoryNote(''); setMemoryPlace(''); setShowMemoryForm(true); };
  const openPlaceMemories = (place: { name: string; state: string; district: string; image?: string; key?: string }) => {
    setMemoryContext({ name: place.name, state: place.state, district: place.district, cover: place.image, key: place.key });
    setMemoryTitle(`Memories at ${place.name}`);
    setMemoryNote('');
    setMemoryPlace(place.name);
    setMemoryDate(new Date().toISOString().slice(0, 10));
    setMemoryFiles([]);
    setShowMemoryForm(true);
  };
  const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read selected image.'));
    reader.onerror = () => reject(new Error('Could not read selected image.'));
    reader.readAsDataURL(file);
  });
  useEffect(() => {
    if (!shareMemoryWithFriends || !backendReady) return;
    api<{users:any[]}>('/users').then(result => setFriendsForSharing(result.users.filter(user => user.relationship === 'friends'))).catch(() => setFriendsForSharing([]));
  }, [shareMemoryWithFriends, backendReady]);
  const saveMemory = async () => {
    if (!memoryTitle.trim() || savingMemory) return;
    if (memoryFiles.length > 12) { setToast('Please choose up to 12 photos per memory album.'); setTimeout(() => setToast(''), 3500); return; }
    const selected = destinationData.find(d => d.name === memoryPlace);
    const selectedDirectoryPlace = allDirectoryPlaces.find(place => place.name === memoryPlace);
    const fallbackImage = memoryContext?.cover || selected?.image || selectedDirectoryPlace?.image || destinationData[1]?.image || destinations[0].image;
    setSavingMemory(true);
    try {
      let imageUrls: string[] = [];
      if (backendReady && memoryFiles.length) {
        imageUrls = await Promise.all(memoryFiles.map(async file => {
          const form = new FormData();
          form.append('file', file);
          const uploaded = await api<{url:string}>('/uploads', { method: 'POST', body: form });
          return uploaded.url;
        }));
      } else if (memoryFiles.length) {
        const totalBytes = memoryFiles.reduce((total, file) => total + file.size, 0);
        if (totalBytes > 3 * 1024 * 1024) throw new Error('For offline saving, choose photos totaling less than 3 MB. Start the API to save larger albums.');
        imageUrls = await Promise.all(memoryFiles.map(fileToDataUrl));
      }
      if (!imageUrls.length) imageUrls = [fallbackImage];
      const placeName = memoryContext?.name || selected?.name || selectedDirectoryPlace?.name || memoryPlace || 'Somewhere worth remembering';
      const stateName = memoryContext?.state || selected?.state || selectedDirectoryPlace?.state || '';
      const districtName = memoryContext?.district || selectedDirectoryPlace?.district || '';
      const fullPlace = [placeName, districtName, stateName].filter(Boolean).join(', ');
      const memoryPayload = {
        title: memoryTitle.trim(), story: memoryNote.trim(), place: fullPlace,
        destinationId: selected?.id || null, directoryKey: memoryContext?.key || selectedDirectoryPlace?.key || null, visitDate: memoryDate, imageUrl: imageUrls[0], images: imageUrls,
        state: stateName, district: districtName, destinationName: placeName, tags: [], mediaType: 'image', visibleToFriends: shareMemoryWithFriends, sharedWithFriendIds: selectedFriendIds
      };
      if (backendReady) {
        const result = await api<{memory:ApiMemory & {images?:string[];state?:string;district?:string;destinationName?:string}}>('/memories', { method: 'POST', body: JSON.stringify(memoryPayload) });
        const m = result.memory;
        setMemories(old => [{ id:m.id, createdAt:m.createdAt, title:m.title, place:m.place, date:new Date(m.visitDate+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}), note:m.story, image:m.imageUrl || imageUrls[0], images:m.images?.length ? m.images : imageUrls, state:m.state || stateName, district:m.district || districtName, destinationName:m.destinationName || placeName, tags:m.tags || [], stampAt: stampAtFrom(m.stampIn) ?? Date.now() + 300000 }, ...old]);
        await refreshDashboard();
      } else throw new Error('Start the backend to save memories to MySQL.');
      setMemoryTitle(''); setMemoryNote(''); setMemoryPlace(''); setMemoryDate(new Date().toISOString().slice(0,10)); setMemoryFiles([]); setShareMemoryWithFriends(false); setSelectedFriendIds([]); setMemoryContext(null); setShowMemoryForm(false); setPage('Diary');
      setToast('Memory album saved to your diary.'); setTimeout(() => setToast(''), 3000);
    } catch (e) { setToast(e instanceof Error ? e.message : 'Could not save memory album.'); setTimeout(() => setToast(''), 4500); }
    finally { setSavingMemory(false); }
  };
  const markVisited = async (id:number) => { if (!backendReady) { setToast('Start the API to record visits and update your visit history.'); setTimeout(()=>setToast(''),3500); return; } try { await api(`/visits/${id}`,{method:'POST',body:JSON.stringify({visitDate:new Date().toISOString().slice(0,10)})}); await refreshDashboard(); setToast('Visit recorded — your visit history is updated.'); setTimeout(()=>setToast(''),3000); } catch(e) { setToast(e instanceof Error ? e.message : 'Could not record visit.'); setTimeout(()=>setToast(''),3500); } };
  const deleteMemory = async (id: string) => { if (backendReady) { try { await api(`/memories/${id}`,{method:'DELETE'}); } catch (e) { if (e instanceof Error && e.message.includes('Memory not found')) { setMemories(old=>old.filter((m:any)=>m.id!==id)); await refreshDashboard(); setToast('Removed the stale diary card.'); setTimeout(()=>setToast(''),3000); return; } setToast(e instanceof Error ? e.message : 'Could not delete memory.'); setTimeout(()=>setToast(''),3500); return; } } setMemories(old=>old.filter((m:any)=>m.id!==id)); await refreshDashboard(); };  
  const goto = (p: Page) => { if (p === 'Home') setQuery(''); setPage(p); setShowProfileMenu(false); setShowNotifications(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const initial = (currentUser?.name || 'E').trim().charAt(0).toUpperCase();
  const openSettings = () => { setSettingsName(currentUser?.name || ''); setSettingsPhone(localStorage.getItem('rl-phone') || ''); setShowSettings(true); setShowProfileMenu(false); };
  const saveSettings = async () => { if (settingsName.trim() && settingsName.trim() !== currentUser?.name && backendReady) { try { await updateProfile({ name: settingsName.trim() }); } catch (e) { setToast(e instanceof Error ? e.message : 'Could not update settings.'); setTimeout(() => setToast(''), 3500); return; } } localStorage.setItem('rl-phone', settingsPhone.trim()); localStorage.setItem('rl-theme', theme); setShowSettings(false); setToast('Settings saved.'); setTimeout(() => setToast(''), 2500); };
  const submitAuth = async (event: React.FormEvent) => { event.preventDefault(); setAuthError(''); setAuthBusy(true); try { const result = await api<{token:string;user:User}>(authMode === 'login' ? '/auth/login' : '/auth/register', { method:'POST', body: JSON.stringify(authMode === 'login' ? { email: authEmail, password: authPassword } : { name: authName, email: authEmail, password: authPassword }) }); setToken(result.token); setCurrentUser(result.user); setShowAuth(false); setAuthPassword(''); window.location.reload(); } catch (error) { setAuthError(error instanceof Error ? error.message : 'Could not authenticate.'); } finally { setAuthBusy(false); } };
  const signOut = async () => { try { if (getToken()) await api('/auth/logout', { method:'POST' }); } catch { /* clear the local session even if the API is unavailable */ } finally { setToken(null); setCurrentUser(null); setBackendReady(false); setSaved([]); setSavedDirectoryKeys([]); setVisitedDirectoryKeys([]); setMemories([]); setShowProfileMenu(false); setShowAuth(true); } };
  return <div className={`rl-app rl-theme-${theme}`}>
    <div className="rl-brandbar"><button className="rl-logo" onClick={() => goto('Home')} aria-label="Roamly home"><span className="rl-logo-mark"><CompassRose size={30}/></span><span>Roamly</span></button><div className="rl-nav-right">
      <div className="rl-pop-wrap"><button className="rl-icon-btn" aria-label="Notifications" onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}><Bell size={18}/><i/></button>{showNotifications && <div className="rl-pop"><strong>You're all caught up</strong><p>Approved memories and new stamps will show up here.</p></div>}</div>
      <div className="rl-pop-wrap"><button className="rl-avatar-btn" onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }} aria-label="Account menu">{currentUser?.avatar ? <img src={currentUser.avatar} alt=""/> : <span>{initial}</span>}<ChevronDown size={14}/></button>{showProfileMenu && <div className="rl-pop rl-pop-menu"><div className="rl-pop-user"><strong>{currentUser?.name || 'Explorer'}</strong><small>{stats.places ? `${stats.places} places visited` : 'Your story starts here'}</small></div><button onClick={() => goto('Profile')}><UserRound size={15}/> My profile</button><button onClick={openSettings}><Settings size={15}/> Settings</button><button onClick={signOut}><LogOut size={15}/> Sign out</button></div>}</div>
    </div></div>
    <header className="rl-nav">
      <nav className="rl-nav-links" aria-label="Main">{navItems.map(item => { const Icon = item.icon; return <button key={item.label} className={`${page === item.label ? 'active' : ''} ${item.center ? 'nav-center' : ''}`} onClick={() => goto(item.label)} aria-label={item.text} aria-current={page === item.label ? 'page' : undefined}>{item.center ? <span className="nav-rose"><CompassRose size={46}/></span> : <span className="nav-symbol"><Icon size={23}/></span>}<span className="nav-label">{item.text}</span>{item.label === 'Diary' && memories.length > 0 && <b>{memories.length}</b>}{item.label === 'Friends' && friendBadge > 0 && <b className="nav-alert">{friendBadge}</b>}</button>; })}</nav>
    </header>
    <main className="rl-main">
      {page === 'Home' && <HomePage setPage={goto} setQuery={setQuery} activeCategory={activeCategory} setActiveCategory={setActiveCategory} filtered={filtered} saved={saved} toggleSaved={toggleSaved} memories={memories} stats={stats} destinationData={destinationData} markVisited={markVisited} openDestination={setSelectedDestination} openMemory={openGeneralMemory} userLoc={userLoc} detectLocation={() => detectLocation()} openLocationPicker={() => setShowLocationPicker(true)}/>}
      {page === 'Map' && <MapPage theme={theme} destinations={destinationData} saved={saved} savedDirectoryKeys={savedDirectoryKeys} visitedDirectoryKeys={visitedDirectoryKeys} onOpenRoute={setRouteTarget} />}
      {page === 'Directory' && <DirectoryPage onOpenRoute={setRouteTarget} onAddMemories={openPlaceMemories} savedDirectoryKeys={savedDirectoryKeys} visitedDirectoryKeys={visitedDirectoryKeys} onToggleDirectorySaved={toggleDirectorySaved} onMarkVisited={markDirectoryVisited} userLoc={userLoc} externalQuery={query}/>}
      {page === 'Diary' && <DiaryPage memories={memories} openMemory={openGeneralMemory} deleteMemory={deleteMemory}/>}
      {page === 'Friends' && <FriendsPage onBadge={setFriendBadge} openMemory={openGeneralMemory}/>}
      {page === 'Profile' && <ProfilePage backendReady={backendReady} saved={saved} savedDirectoryKeys={savedDirectoryKeys} visitedDirectoryKeys={visitedDirectoryKeys} toggleDirectorySaved={toggleDirectorySaved} markDirectoryVisited={markDirectoryVisited} memories={memories} stats={stats} destinations={destinationData} user={currentUser} setPage={goto} toggleSaved={toggleSaved} markVisited={markVisited} openDestination={setSelectedDestination} updateProfile={updateProfile} openMemory={openGeneralMemory}/>}
    </main>
    <nav className="rl-tabbar" aria-label="Mobile">{navItems.map(item => { const Icon = item.icon; return <button key={item.label} className={page === item.label ? 'active' : ''} onClick={() => goto(item.label)}><Icon size={20}/><span>{item.text}</span>{item.label === 'Friends' && friendBadge > 0 && <i className="tab-dot"/>}</button>; })}</nav>
    {selectedDestination && <div className="modal-backdrop" onClick={() => setSelectedDestination(null)}><section className="destination-modal" onClick={e => e.stopPropagation()}><img className="destination-modal-hero" src={selectedDestination.image} alt={selectedDestination.name}/><button className="destination-modal-close icon-btn" onClick={() => setSelectedDestination(null)} aria-label="Close destination"><X size={18}/></button><div className="destination-modal-copy"><span className="eyebrow">{selectedDestination.category} · {selectedDestination.state}</span><h2>{selectedDestination.name}</h2><p>{selectedDestination.note}</p><div className="destination-modal-facts"><span><MapPin size={15}/>{selectedDestination.state}, India</span><span><Compass size={15}/>{selectedDestination.distance}</span>{kmBetween(userLoc, selectedDestination.lat, selectedDestination.lng) !== null && <span><LocateFixed size={15}/>{kmLabel(kmBetween(userLoc, selectedDestination.lat, selectedDestination.lng))}</span>}</div><div className="modal-actions"><button className="btn-secondary" onClick={() => toggleSaved(selectedDestination.id)}><Heart size={15} fill={saved.includes(selectedDestination.id) ? 'currentColor' : 'none'}/>{saved.includes(selectedDestination.id) ? 'Saved to wishlist' : 'Save to wishlist'}</button>{Number.isFinite(selectedDestination.lat) && Number.isFinite(selectedDestination.lng) && <button className="btn-secondary" onClick={() => { setRouteTarget({ name: selectedDestination.name, state: selectedDestination.state, lat: selectedDestination.lat, lng: selectedDestination.lng }); setSelectedDestination(null); }}><Navigation size={15}/> Get directions</button>}<button className="btn-primary" onClick={() => { markVisited(selectedDestination.id); setSelectedDestination(null); }}><Stamp size={15}/> I’ve been here</button></div></div></section></div>}
    {routeTarget && <RouteMapModal destination={routeTarget} onClose={() => setRouteTarget(null)} userLocation={userLoc}/>}
    {showMemoryForm && <div className="modal-backdrop" onClick={() => {setShowMemoryForm(false);setMemoryContext(null);setMemoryFiles([])}}><section className="memory-modal" onClick={e => e.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">PRESERVE THE MOMENT</span><h2>{memoryContext ? `Memories at ${memoryContext.name}` : 'Add a memory'}</h2></div><button className="icon-btn" onClick={() => {setShowMemoryForm(false);setMemoryContext(null);setMemoryFiles([])}}><X size={18}/></button></div><label className="upload-zone upload-label"><Camera size={27}/><strong>{memoryFiles.length ? `${memoryFiles.length} photo${memoryFiles.length===1?'':'s'} selected` : 'Take photos or upload your memories'}</strong><span>Choose up to 12 images · JPG, PNG, WEBP · 15 MB each</span><input type="file" accept="image/*" multiple onChange={e=>setMemoryFiles(Array.from(e.target.files || []).slice(0,12))} /></label>{memoryFiles.length>0 && <div className="memory-selected-files">{memoryFiles.map((file,index)=><span key={`${file.name}-${index}`}><Camera size={12}/>{file.name}</span>)}</div>}<label className="field-label">Memory title<input value={memoryTitle} onChange={e => setMemoryTitle(e.target.value)} placeholder="e.g. A sunrise I'll never forget" autoFocus maxLength={120}/></label>{memoryContext ? <div className="memory-location-lock"><MapPin size={15}/><span><strong>{memoryContext.name}</strong><small>{memoryContext.district}, {memoryContext.state}</small></span><span className="memory-location-lock-badge">PLACE ALBUM</span></div> : <label className="field-label">Place<select value={memoryPlace} onChange={e=>setMemoryPlace(e.target.value)}><option value="">Choose a destination (optional)</option>{allDirectoryPlaces.map(place=><option key={place.key} value={place.name}>{place.name}, {place.state}</option>)}</select></label>}<label className="field-label">Date of visit<input type="date" value={memoryDate} onChange={e=>setMemoryDate(e.target.value)} /></label><label className="field-label">Your story<textarea value={memoryNote} onChange={e => setMemoryNote(e.target.value)} placeholder="What did this place feel like? What do you want to remember?" rows={4} maxLength={5000}/></label><label className="memory-share-option"><input type="checkbox" checked={shareMemoryWithFriends} onChange={e => setShareMemoryWithFriends(e.target.checked)} /><span><strong>Share with friends</strong><small>Only friends can see this diary memory in their Friends feed.</small></span></label>{shareMemoryWithFriends && <div className="memory-friend-picker"><strong>Share with specific friends</strong>{friendsForSharing.length ? friendsForSharing.map(friend => <label key={friend.id}><input type="checkbox" checked={selectedFriendIds.includes(friend.id)} onChange={e => setSelectedFriendIds(ids => e.target.checked ? [...ids, friend.id] : ids.filter(id => id !== friend.id))} /><span>{friend.name}</span></label>) : <small>Accept friend requests first to choose specific friends.</small>}</div>}<div className="modal-actions"><button className="btn-secondary" onClick={() => {setShowMemoryForm(false);setMemoryContext(null);setMemoryFiles([])}}>Cancel</button><button className="btn-primary" onClick={saveMemory} disabled={!memoryTitle.trim() || savingMemory}>{savingMemory ? <><span className="memory-saving-spinner"/> Saving album…</> : <><BookOpen size={16}/> Save to diary</>}</button></div><p className="demo-note">{backendReady ? 'Photos and album details are saved to your Delusional Diary API.' : 'Offline mode: small albums are saved in this browser only.'}</p></section></div>}
    {showLocationPicker && <div className="modal-backdrop" onClick={() => setShowLocationPicker(false)}><section className="location-picker-modal" onClick={e => e.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">YOUR LOCATION</span><h2>Change your location</h2></div><button className="icon-btn" onClick={() => setShowLocationPicker(false)} aria-label="Close location picker"><X size={18}/></button></div><p className="location-picker-copy">Choose a city or place to update the distances shown across Roamly.</p><button className="btn-secondary location-detect-btn" onClick={() => { setShowLocationPicker(false); detectLocation(); }}><LocateFixed size={16}/> Use my current location</button><div className="location-divider"><span>or search manually</span></div><div className="location-search-row"><input value={locationQuery} onChange={e => setLocationQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') chooseLocation(); }} placeholder="e.g. Hyderabad, India" autoFocus/><button className="btn-primary" onClick={chooseLocation} disabled={!locationQuery.trim() || searchingLocation}>{searchingLocation ? 'Searching…' : 'Set location'}</button></div></section></div>}
    {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><section className="settings-modal" onClick={e => e.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">ACCOUNT PREFERENCES</span><h2>Settings</h2></div><button className="icon-btn" onClick={() => setShowSettings(false)} aria-label="Close settings"><X size={18}/></button></div><label className="field-label">Your name<input value={settingsName} onChange={e => setSettingsName(e.target.value)} placeholder="Your name"/></label><label className="field-label">Phone number<input value={settingsPhone} onChange={e => setSettingsPhone(e.target.value)} placeholder="+91 98765 43210" type="tel"/></label><div className="settings-section"><span className="settings-label">Appearance</span><div className="theme-options"><button className={theme==='light'?'active':''} onClick={() => setTheme('light')}>☀ Light</button><button className={theme==='dark'?'active':''} onClick={() => setTheme('dark')}>◐ Dark</button></div></div><div className="modal-actions"><button className="btn-secondary" onClick={() => setShowSettings(false)}>Cancel</button><button className="btn-primary" onClick={saveSettings}>Save settings</button></div></section></div>}
    {showAuth && <div className="auth-screen"><div className="auth-visual"><span className="rl-logo-mark"><Compass size={22}/></span><span className="auth-brand">Roamly</span><p>Explore India.<br/>Remember every journey.</p></div><form className="auth-card" onSubmit={submitAuth}><span className="eyebrow">WELCOME TO ROAMLY</span><h1>{authMode === 'login' ? 'Welcome back.' : 'Start your journey.'}</h1><p className="auth-subtitle">{authMode === 'login' ? 'Sign in to continue your travel story.' : 'Create an account to save places and memories.'}</p>{authMode === 'signup' && <label className="field-label">Full name<input value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Your name" required/></label>}<label className="field-label">Email address<input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="you@example.com" required/></label><label className="field-label">Password<input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required/></label>{authError && <p className="auth-error">{authError}</p>}<button className="btn-primary auth-submit" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16}/></button><p className="auth-switch">{authMode === 'login' ? 'New to Roamly?' : 'Already have an account?'} <button type="button" onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setAuthError('')}}>{authMode === 'login' ? 'Create an account' : 'Sign in'}</button></p></form></div>}
    {toast && <div className="app-toast" role="status">{toast}</div>}
  </div>;
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: React.ReactNode; subtitle: string; action?: React.ReactNode }) { return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; }
function Stat({ icon, value, label, detail }: { icon: React.ReactNode; value: string; label: string; detail: string }) { return <div className="stat-card"><div className="stat-icon">{icon}</div><div className="stat-value">{value}</div><div className="stat-label">{label}</div><div className="stat-detail">{detail}</div></div>; }

const ph = (id: string, w = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;

function DestinationCard({ d, saved, toggleSaved, markVisited, openDestination, userLoc }: { d: typeof destinations[number]; saved: boolean; toggleSaved: () => void; markVisited?: (id:number)=>void; openDestination?: (d:typeof destinations[number])=>void; userLoc?: UserLoc | null }) {
  const km = kmBetween(userLoc || null, d.lat, d.lng);
  return <article className="rl-card">
    <button className="rl-card-photo" onClick={() => openDestination ? openDestination(d) : markVisited?.(d.id)} aria-label={`Open ${d.name}`}>
      <img src={d.image} alt={d.name} loading="lazy"/><span className="rl-card-shade"/>
      <span className="rl-badge">{d.category}</span>
      {km !== null && <span className="rl-dist"><LocateFixed size={12}/>{km.toLocaleString('en-IN')} km</span>}
    </button>
    <button className={`rl-heart ${saved ? 'on' : ''}`} onClick={toggleSaved} aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}><Heart size={17} fill={saved ? 'currentColor' : 'none'}/></button>
    <div className="rl-card-body">
      <p className="rl-card-where"><MapPin size={13}/>{d.state}</p>
      <h3>{d.name}</h3>
      <p className="rl-card-note">{d.note}</p>
      <div className="rl-card-actions">{markVisited && <button className="rl-link" onClick={() => markVisited(d.id)}><Stamp size={14}/> I’ve been here</button>}<button className="rl-round" aria-label={`Explore ${d.name}`} onClick={() => openDestination?.(d)}><ArrowUpRight size={18}/></button></div>
    </div>
  </article>;
}

function HomePage({ setPage, setQuery, activeCategory, setActiveCategory, filtered, saved, toggleSaved, memories, stats, markVisited, openDestination, openMemory, userLoc, detectLocation, openLocationPicker }: any) {
  const [heroQ, setHeroQ] = useState('');
  const moods = [
    { label: 'Mountains', hint: 'Find your altitude', img: ph('photo-1506905925346-21bda4d32df4', 1100), big: true },
    { label: 'Beaches', hint: 'Follow the coastline', img: ph('photo-1507525428034-b723cf961d3e', 800) },
    { label: 'Heritage', hint: 'Walk through history', img: ph('photo-1524492412937-b28074a5d7da', 800) },
    { label: 'Waterfalls', hint: 'Chase the cascade', img: ph('photo-1432405972618-c60b0225b8f9', 800) },
    { label: 'Nature', hint: 'Take the scenic route', img: ph('photo-1448375240586-882707db888b', 800) },
  ];
  const chips = ['All', ...categories.map(c => c.name)];
  const submit = (e: React.FormEvent) => { e.preventDefault(); setQuery(heroQ); setPage('Directory'); };
  return <div className="rl-page rl-home">
    <section className="rl-hero">
      <img className="rl-hero-img" src={ph('photo-1506905925346-21bda4d32df4', 2200)} alt="Mountains at sunrise"/>
      <div className="rl-hero-shade"/>
      <div className="rl-hero-copy">
        <span className="rl-pill"><Plane size={14}/> India, state by state</span>
        <h1>Go somewhere.<br/><em>Keep every moment.</em></h1>
        <p>Pick a state, find hidden places, and turn every trip into a stamp in your travel passport.</p>
        <form className="rl-hero-search" onSubmit={submit}><Search size={18}/><input value={heroQ} onChange={e => setHeroQ(e.target.value)} placeholder="Try “waterfalls in Karnataka”"/><button type="submit">Explore <ArrowRight size={16}/></button></form>
        <div className="rl-hero-chips">{['Trekking', 'Waterfalls', 'Beaches', 'Heritage'].map(c => <button key={c} onClick={() => { setQuery(c); setActiveCategory('All'); setPage('Directory'); }}>{c}</button>)}</div>
      </div>
      <aside className={`rl-hero-card${userLoc ? ' is-location-set' : ''}`} onClick={userLoc ? openLocationPicker : undefined} onKeyDown={userLoc ? (e: React.KeyboardEvent<HTMLElement>) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLocationPicker(); } } : undefined} role={userLoc ? 'button' : undefined} tabIndex={userLoc ? 0 : undefined} aria-label={userLoc ? `Update location from ${userLoc.label}` : undefined}>
        <span className="rl-hero-card-icon"><LocateFixed size={18}/></span>
        {userLoc ? <><small>YOU ARE NEAR</small><strong>{userLoc.label}</strong><span>Distances on every place are measured from here. <em>Click to update.</em></span></> : <><small>NEAR YOU</small><strong>See how far each place is</strong><button onClick={detectLocation}>Share my location</button></>}
      </aside>
    </section>

    <section className="rl-stats" aria-label="Your travel activity">
      <div><PinIcon size={24}/><strong>{stats?.places || 0}</strong><span>Places visited</span></div>
      <div><StampToolIcon size={24}/><strong>{stats?.states || 0}</strong><span>States explored</span></div>
      <div><Camera size={20}/><strong>{memories?.length || 0}</strong><span>Memories</span></div>
      <div><Heart size={20}/><strong>{saved?.length || 0}</strong><span>Wishlist</span></div>
    </section>

    <section className="rl-home-states" aria-label="Explore India by state">
      <div className="rl-home-states-heading"><div><span className="rl-eyebrow">Start with a region</span><h2>Explore India by state</h2></div><button className="rl-link-lg" onClick={() => setPage('Directory')}>View directory <ArrowRight size={16}/></button></div>
      <div className="rl-home-state-row">{INDIA_DIRECTORY.slice(0, 4).map(state => <button key={state.name} className="rl-home-state" onClick={() => setPage('Directory')}><img src={stateCoverUrl(state.name)} alt=""/><span><strong>{state.name}</strong><small>{state.districts.length} districts to discover</small></span></button>)}</div>
    </section>

  </div>;
}

function DirectoryPage({ onOpenRoute, onAddMemories, savedDirectoryKeys, visitedDirectoryKeys, onToggleDirectorySaved, onMarkVisited, userLoc, externalQuery }: { userLoc?: UserLoc | null; externalQuery?: string; onOpenRoute: (target: RouteTarget) => void; onAddMemories: (place: {name:string;state:string;district:string;image?:string;key?:string}) => void; savedDirectoryKeys: string[]; visitedDirectoryKeys:string[]; onToggleDirectorySaved: (key:string)=>void|Promise<void>; onMarkVisited:(key:string)=>void|Promise<void> }) {
  const [selectedState, setSelectedState] = useState('');
  const [showAllStates, setShowAllStates] = useState(false);
  const [showAllDistricts, setShowAllDistricts] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState('All districts');
  const [search, setSearch] = useState(externalQuery || '');
  useEffect(() => { if (externalQuery !== undefined) setSearch(externalQuery); }, [externalQuery]);
  const [region, setRegion] = useState('All');
  const [category, setCategory] = useState('All categories');
  const selected = INDIA_DIRECTORY.find(s => s.name === selectedState) || INDIA_DIRECTORY[0];
  const allPlaces = allDirectoryPlaces;
  const stateMatches = INDIA_DIRECTORY.filter(s => fuzzySearch(search, `${s.name} ${s.districts.join(' ')} ${s.places.map(p => `${p.name} ${p.category} ${p.note}`).join(' ')}`) && (region==='All' || (region==='States' ? !['Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'].includes(s.name) : ['Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'].includes(s.name))));
  const normalizeText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const categoryMatches = (placeCategory: string, selectedCategory: string) => {
    if (selectedCategory === 'All categories') return true;
    const placeValue = normalizeText(placeCategory);
    const selectedValue = normalizeText(selectedCategory);
    const aliases: Record<string, string[]> = {
      beaches: ['beach', 'coast', 'coastal'],
      temples: ['temple', 'spiritual'],
      waterfalls: ['waterfall', 'cascade', 'falls'],
      trekking: ['trekking', 'trail', 'hiking'],
      mountains: ['mountain', 'hill', 'highland'],
      nature: ['nature', 'viewpoint', 'wildlife', 'eco-tourism', 'forest', 'park'],
    };
    return (aliases[selectedValue] ?? [selectedValue]).some(term => placeValue.includes(term));
  };
  const placeMatches = allPlaces.filter(p =>
    p.state === selectedState &&
    (selectedDistrict === 'All districts' || p.district === selectedDistrict) &&
    categoryMatches(p.category, category) &&
    fuzzySearch(search, `${p.name} ${p.district} ${p.state} ${p.category} ${p.note}`)
  );
  const counts = directoryCounts();
  const coverFor = (name:string) => stateCoverUrl(name);
  const districtCoverFor = (state:string, district:string) => districtCoverUrl(state, district);
  const chooseDistrict = (districtName: string) => {
    const mapName = districtName.trim();
    const aliases: Record<string, string> = {
      'Anantapur': 'Ananthapuramu',
      'Anantapuramu': 'Ananthapuramu',
      'YSR Kadapa': 'YSR Kadapa',
      'Sri Potti Sriramulu Nellore': 'Sri Potti Sriramulu Nellore',
    };
    const wanted = aliases[mapName] ?? mapName;
    const matched = selected.districts.find(d => normalizeText(d) === normalizeText(wanted));
    setSelectedDistrict(matched ?? mapName);
    setCategory('All categories');
    window.setTimeout(() => document.getElementById('directory-attractions')?.scrollIntoView({behavior:'smooth', block:'start'}), 100);
  };
  const chipsFor = [
    { name: 'All categories', label: 'Everything', icon: CompassIcon },
    { name: 'Waterfalls', label: 'Waterfalls', icon: FallsIcon },
    { name: 'Trekking', label: 'Trekking', icon: BootIcon },
    { name: 'Temples', label: 'Temples & heritage', icon: GopuramIcon },
    { name: 'Beaches', label: 'Beaches', icon: PalmIcon },
    { name: 'Mountains', label: 'Mountains', icon: PeakIcon },
    { name: 'Nature', label: 'Nature', icon: PineIcon },
  ];
  const directPlaceMatches = search ? allPlaces.filter(p => categoryMatches(p.category, category) && fuzzySearch(search, `${p.name} ${p.district} ${p.state} ${p.category} ${p.note}`)) : [];
  const visibleDistricts = selected.districts.filter(d => !search || d.toLowerCase().includes(search.toLowerCase()));
  const backToStates = () => { setSelectedState(''); setSelectedDistrict('All districts'); setShowAllDistricts(false); };
  return <div className="rl-page rl-directory">
    <section className="rl-dir-head">
      <div><span className="rl-eyebrow">Explore India</span><h1>{selectedState ? <>{selectedState}</> : <>Pick a state.<br/><em>Find your place.</em></>}</h1><p>{selectedState ? `${selected.districts.length} districts to discover. Choose one, then pick what you’re in the mood for.` : 'Choose a state, open a district and see real places worth the trip.'}</p></div>
      <div className="rl-dir-tools">
        <label className="rl-field-search"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder={selectedState ? 'Search districts or places…' : 'Search a state, district or place…'}/>{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={15}/></button>}</label>
        {!selectedState && <div className="rl-seg">{([['All', 'All 36'], ['States', '28 States'], ['UTs', '8 UTs']] as const).map(([k, label]) => <button key={k} className={region === k ? 'active' : ''} onClick={() => setRegion(k)}>{label}</button>)}</div>}
      </div>
    </section>

    {!selectedState ? <>
      {directPlaceMatches.length > 0 ? <section className="rl-direct-results"><div className="rl-section-head"><div><span className="rl-eyebrow">Direct matches</span><h2>Places for “{search}”</h2></div><span className="rl-count">{directPlaceMatches.length} results</span></div><div className="rl-place-grid">{directPlaceMatches.slice(0, 12).map(p => { const isSaved = savedDirectoryKeys.includes(p.key); return <article className="rl-place" key={p.key}><div className="rl-place-photo"><img src={p.image} alt={p.name} loading="lazy"/><span className="rl-card-shade"/><span className="rl-badge">{p.category}</span><button type="button" className={`rl-heart ${isSaved ? 'on' : ''}`} onClick={() => onToggleDirectorySaved(p.key)} aria-label={isSaved ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}><Heart size={17} fill={isSaved ? 'currentColor' : 'none'}/></button></div><div className="rl-place-body"><h3>{p.name}</h3><p className="rl-card-where"><MapPin size={13}/>{p.district}, {p.state}</p><p className="rl-card-note">{p.note}</p><button type="button" className="rl-route-btn" onClick={() => { setSelectedState(p.state); setSelectedDistrict(p.district); window.setTimeout(() => document.getElementById('directory-attractions')?.scrollIntoView({behavior:'smooth'}), 100); }}>Open place <ArrowUpRight size={14}/></button></div></article>; })}</div></section> : <div className="rl-state-grid">{(showAllStates ? stateMatches : stateMatches.slice(0, 8)).map((state, i) => <button key={state.name} className="rl-state" onClick={() => { setSelectedState(state.name); setSelectedDistrict('All districts'); setShowAllDistricts(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><img src={coverFor(state.name)} alt="" loading="lazy"/><span className="rl-state-shade"/><span className="rl-state-no">{String(i + 1).padStart(2, '0')}</span><span className="rl-state-copy"><strong>{state.name}</strong><small>{state.districts.length} districts <ArrowUpRight size={14}/></small></span></button>)}</div>}
      {stateMatches.length === 0 && directPlaceMatches.length === 0 && <div className="rl-empty"><Compass size={26}/><h3>No place or state matches “{search}”</h3><p>Try a district, attraction, waterfall, beach, or another keyword.</p></div>}
      {stateMatches.length > 8 && <div className="rl-more"><span>Showing {showAllStates ? stateMatches.length : 8} of {stateMatches.length}</span><button className="btn-secondary" onClick={() => setShowAllStates(v => !v)}>{showAllStates ? 'Show fewer' : `Show all ${stateMatches.length}`} <ArrowRight size={15}/></button></div>}
      <p className="rl-total">{counts.districts.toLocaleString('en-IN')} districts across {counts.states} states and union territories</p>
    </> : <>
      <button className="rl-back" onClick={backToStates}><ChevronRight size={15} style={{ transform: 'rotate(180deg)' }}/> All states</button>
      <section className="rl-state-hero"><img src={coverFor(selectedState)} alt=""/><div className="rl-state-hero-shade"/><div className="rl-state-hero-copy"><span className="rl-pill"><MapPin size={13}/> State guide</span><h2>{selectedState}</h2><p>{selected.districts.length} districts · {placeMatches.length} places listed</p></div></section>
      <section className="rl-district-layout">
        <div className="rl-map-card"><div className="rl-map-top"><span className="rl-eyebrow">District map</span><strong>Tap a district</strong></div><div className="rl-map-box"><div className="real-state-map" aria-label={`Geographic outline for ${selectedState}`}><IndiaSvgMap level="district" stateName={selectedState} resolution="high" tooltip onDistrictClick={(districtName: string) => chooseDistrict(districtName)} /></div></div><p>Boundaries from OpenStreetMap-derived data. Hover to identify, click to explore. © OpenStreetMap contributors.</p></div>
        <div className="rl-district-panel">
          <div className="rl-panel-head"><h3>Districts</h3><span>{visibleDistricts.length} entries</span></div>
          <div className="rl-district-grid">{(showAllDistricts ? visibleDistricts : visibleDistricts.slice(0, 8)).map(d => <button key={d} className={`rl-district ${selectedDistrict === d ? 'active' : ''}`} onClick={() => chooseDistrict(d)}><span style={{ backgroundImage: `url(${districtCoverFor(selectedState, d)})` }}/><strong>{d}</strong></button>)}</div>
          {visibleDistricts.length > 8 && <button className="rl-link-lg rl-center" onClick={() => setShowAllDistricts(v => !v)}>{showAllDistricts ? 'Show fewer districts' : `Show all ${visibleDistricts.length} districts`} <ArrowRight size={15}/></button>}
        </div>
      </section>
      <section id="directory-attractions" className="rl-places">
        <div className="rl-section-head"><div><span className="rl-eyebrow">{selectedDistrict === 'All districts' ? 'Whole state' : 'District'}</span><h2>{selectedDistrict === 'All districts' ? `Places in ${selectedState}` : `Discover ${selectedDistrict}`}</h2></div><span className="rl-count">{placeMatches.length} {placeMatches.length === 1 ? 'place' : 'places'}</span></div>
        <div className="rl-chip-row">{chipsFor.map(c => { const Icon = c.icon; return <button key={c.name} className={category === c.name ? 'active' : ''} onClick={() => setCategory(c.name)}><Icon size={15}/>{c.label}</button>; })}</div>
        {placeMatches.length ? <div className="rl-place-grid">{placeMatches.map(p => { const km = kmBetween(userLoc || null, p.lat, p.lng); const isSaved = savedDirectoryKeys.includes(p.key); return <article className="rl-place" key={p.key}>
          <div className="rl-place-photo"><img src={p.image} alt={p.name} loading="lazy"/><span className="rl-card-shade"/><span className="rl-badge">{p.category}</span>{km !== null && <span className="rl-dist"><LocateFixed size={12}/>{km.toLocaleString('en-IN')} km</span>}<button type="button" className={`rl-heart ${isSaved ? 'on' : ''}`} onClick={() => onToggleDirectorySaved(p.key)} aria-label={isSaved ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}><Heart size={17} fill={isSaved ? 'currentColor' : 'none'}/></button></div>
          <div className="rl-place-body"><h3>{p.name}</h3><p className="rl-card-where"><MapPin size={13}/>{p.district}, {p.state}</p>{p.note && <p className="rl-card-note">{p.note}</p>}
            <div className="rl-place-actions"><button type="button" onClick={() => onAddMemories({ name: p.name, state: p.state, district: p.district, image: p.image, key: p.key })}><Camera size={14}/> Add memory</button>{visitedDirectoryKeys.includes(p.key) ? <span className="rl-visited"><Stamp size={14}/> Visited</span> : <button type="button" onClick={() => onMarkVisited(p.key)}><Stamp size={14}/> I’ve been here</button>}</div>
            <button type="button" className="rl-route-btn" onClick={() => onOpenRoute({ name: p.name, state: p.state, lat: p.lat, lng: p.lng })}><Navigation size={15}/> Map & directions <ArrowUpRight size={14}/></button></div>
        </article>; })}</div> : <div className="rl-empty"><Compass size={28}/><h3>{category === 'All categories' ? 'Nothing listed here yet.' : `No ${category.toLowerCase()} places here yet.`}</h3><p>We only show verified places. New records for {selectedDistrict === 'All districts' ? selectedState : selectedDistrict} will appear as they’re added.</p></div>}
      </section>
    </>}
    <p className="rl-source-note"><MapPin size={14}/> District lists are a starter set and boundaries may not reflect the latest official changes. Verify details before you travel.</p>
  </div>;
}

function DiaryPage({ memories, openMemory, deleteMemory }: any) {
  const [openedAlbum, setOpenedAlbum] = useState<DiaryMemory | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [layout, setLayout] = useState<'gallery'|'list'>('gallery');
  const albumImages = openedAlbum?.images?.length ? openedAlbum.images : openedAlbum ? [openedAlbum.image] : [];
  const visibleMemories = memories.filter((m:DiaryMemory) => `${m.title} ${m.place} ${m.note} ${m.state || ''} ${m.district || ''}`.toLowerCase().includes(search.toLowerCase()));
  const photoCount = memories.reduce((sum:number,m:DiaryMemory)=>sum+(m.images?.length || 1),0);
  const closeAlbum = () => { setOpenedAlbum(null); setLightboxImage(null); };
  const stepLightbox = (dir: number) => { if (!lightboxImage || !albumImages.length) return; const i = albumImages.indexOf(lightboxImage); setLightboxImage(albumImages[(i + dir + albumImages.length) % albumImages.length]); };
  useEffect(() => {
    if (!openedAlbum) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { lightboxImage ? setLightboxImage(null) : closeAlbum(); } else if (lightboxImage && e.key === 'ArrowRight') stepLightbox(1); else if (lightboxImage && e.key === 'ArrowLeft') stepLightbox(-1); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  });
  return <div className="rl-page rl-diary">
    <section className="rl-dir-head">
      <div><span className="rl-eyebrow">Your travel diary</span><h1>Little moments.<br/><em>Forever yours.</em></h1><p>{memories.length} {memories.length===1?'memory':'memories'} · {photoCount} {photoCount===1?'photo':'photos'} saved</p></div>
      <div className="rl-dir-tools"><label className="rl-field-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search memories, places, stories…"/></label><div className="rl-seg"><button className={layout==='gallery'?'active':''} onClick={()=>setLayout('gallery')} aria-label="Gallery view"><LayoutGrid size={15}/></button><button className={layout==='list'?'active':''} onClick={()=>setLayout('list')} aria-label="List view"><Rows3 size={15}/></button></div><button className="btn-primary" onClick={openMemory}><Plus size={16}/> New memory</button></div>
    </section>
    {visibleMemories.length>0 && <div className={`rl-masonry ${layout==='list'?'list':''}`}>{visibleMemories.map((m:DiaryMemory,i:number)=>{const images=m.images?.length?m.images:[m.image];return <article className="rl-memory" key={m.id||m.title+i}>
      <button className={`rl-memory-photo ${images.length>1?'stacked':''}`} onClick={()=>setOpenedAlbum(m)} aria-label={`Open ${m.title}`}><img src={m.image} alt={m.title} loading="lazy"/><span className="rl-card-shade"/>{images.length>1&&<span className="rl-badge"><Camera size={12}/> {images.length}</span>}<PassportStamp info={stampFor(m)} size={84} className="card-stamp"/></button>
      <div className="rl-memory-body"><span className="rl-memory-date"><CalendarDays size={13}/>{m.date}</span><h3>{m.title}</h3><p className="rl-card-where"><MapPin size={13}/>{[m.destinationName || m.place,m.district,m.state].filter(Boolean).join(', ')}</p>{m.note&&<p className="rl-card-note">{m.note}</p>}
        <div className="rl-memory-actions"><button onClick={()=>setOpenedAlbum(m)}>Open <ArrowRight size={14}/></button>{m.id&&<button className="danger" onClick={()=>{if(window.confirm('Delete this memory permanently?')) deleteMemory(m.id)}}>Delete</button>}</div></div>
    </article>})}</div>}
    {visibleMemories.length===0&&<div className="rl-empty big"><BookOpen size={30}/><h2>{search?'No memories match that search.':'Your story is waiting to be written.'}</h2><p>{search?'Try a different place name or keyword.':'Add photos and a few words about a place. Your memories will gather here.'}</p>{!search&&<button className="btn-primary" onClick={openMemory}><Plus size={16}/> Add your first memory</button>}</div>}
    {openedAlbum&&<div className="modal-backdrop" onClick={closeAlbum}><section className="rl-album" onClick={e=>e.stopPropagation()} aria-label={`${openedAlbum.title} album`}>
      <header className="rl-album-head"><div><span className="rl-eyebrow">Memory album · {albumImages.length} {albumImages.length===1?'photo':'photos'}</span><h2>{openedAlbum.title || openedAlbum.destinationName || 'A little piece of the world'}</h2><p><MapPin size={14}/>{[openedAlbum.destinationName || openedAlbum.place,openedAlbum.district,openedAlbum.state].filter(Boolean).join(' · ')}</p></div>
        <div className="rl-postmark" aria-hidden="true"><b>{openedAlbum.state || 'INDIA'}</b><span>{openedAlbum.date || 'ROAMLY'}</span></div>
        <button className="icon-btn rl-album-close" onClick={closeAlbum} aria-label="Close album"><X size={20}/></button></header>
      <div className="rl-collage" style={{'--photo-count': albumImages.length} as React.CSSProperties}>{albumImages.map((src:string,index:number)=><figure key={src+index} className={`rl-polaroid p${index%6}`}>
        <button onClick={()=>setLightboxImage(src)} aria-label={`Enlarge photo ${index+1}`}><span className="rl-tape"/><img src={src} alt={`${openedAlbum.title} photo ${index+1}`} loading="lazy"/><PassportStamp info={stampFor(openedAlbum)} size={78} className="polaroid-stamp"/></button>
        <figcaption><strong>{index===0?(openedAlbum.destinationName||openedAlbum.place||'The place'):`Moment ${String(index+1).padStart(2,'0')}`}</strong><span className="rl-photo-index">{String(index+1).padStart(2,'0')} / {String(albumImages.length).padStart(2,'0')}</span><span className="rl-photo-date">{openedAlbum.date || ''}</span></figcaption></figure>)}</div>
      {openedAlbum.note&&<blockquote className="rl-sticky"><span className="rl-eyebrow">A note to my future self</span><p>{openedAlbum.note}</p></blockquote>}
      {lightboxImage&&<div className="rl-lightbox" onClick={()=>setLightboxImage(null)}>
        <button className="rl-lb-close" onClick={()=>setLightboxImage(null)} aria-label="Close photo"><X size={20}/></button>
        {albumImages.length>1&&<button className="rl-lb-nav prev" onClick={e=>{e.stopPropagation();stepLightbox(-1)}} aria-label="Previous photo"><ChevronRight size={22} style={{transform:'rotate(180deg)'}}/></button>}
        <img src={lightboxImage} alt="Full-size travel memory" onClick={e=>e.stopPropagation()}/>
        {albumImages.length>1&&<button className="rl-lb-nav next" onClick={e=>{e.stopPropagation();stepLightbox(1)}} aria-label="Next photo"><ChevronRight size={22}/></button>}
        <span className="rl-lb-count">{Math.max(0,albumImages.indexOf(lightboxImage))+1} / {albumImages.length}</span></div>}
    </section></div>}
  </div>;
}

const resizeImageToDataUrl = (file: File, size = 320) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read that image.'));
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => reject(new Error('That file is not a valid image.'));
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Image processing is not supported here.')); return; }
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
});

function ProfilePage({ backendReady, saved, savedDirectoryKeys, visitedDirectoryKeys, toggleDirectorySaved, markDirectoryVisited, memories, stats, destinations, user, setPage, toggleSaved, markVisited, openDestination, updateProfile, openMemory }: {
  backendReady:boolean;
  saved:number[]; savedDirectoryKeys:string[]; visitedDirectoryKeys:string[]; toggleDirectorySaved:(key:string)=>void|Promise<void>; markDirectoryVisited:(key:string)=>void|Promise<void>; memories:DiaryMemory[]; stats:{states:number;places:number;memories:number;wishlist:number;visitedIds:number[]};
  destinations:DestinationRecord[]; user:User|null; setPage:(p:Page)=>void; toggleSaved:(id:number)=>void|Promise<void>;
  markVisited:(id:number)=>void|Promise<void>; openDestination:(d:DestinationRecord)=>void;
  updateProfile:(changes:Partial<Pick<User,'name'|'bio'|'avatar'>>) => Promise<User>; openMemory:()=>void;
}) {
  type Tab = 'memories'|'visited'|'wishlist'|'stamps';
  const [tab, setTab] = useState<Tab>('memories');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [story, setStory] = useState<{ group: number; slide: number } | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [storyNow, setStoryNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setStoryNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { setName(user?.name || ''); setBio(user?.bio || ''); setAvatar(user?.avatar || ''); }, [user]);
  useEffect(() => { if (!getToken()) return; api<{storyIds:string[]}>('/story-views').then(result => setSeen(result.storyIds || [])).catch(() => { /* keep an empty seen state if the API is unavailable */ }); }, []);
  const markSeen = (id: string) => { setSeen(prev => prev.includes(id) ? prev : [...prev, id]); if (backendReady) void api(`/story-views/${encodeURIComponent(id)}`, { method: 'POST' }).catch(() => undefined); };

  const visited = destinations.filter(d => stats.visitedIds.includes(d.id));
  const wishlist = destinations.filter(d => saved.includes(d.id));
  const directoryWishlist = allDirectoryPlaces.filter(place => savedDirectoryKeys.includes(place.key));
  const directoryVisited = allDirectoryPlaces.filter(place => visitedDirectoryKeys.includes(place.key));
  const totalWishlistCount = wishlist.length + directoryWishlist.length;
  const totalVisitedCount = new Set([...visited.map(d => `destination:${d.id}`), ...directoryVisited.map(p => `directory:${p.key}`)]).size;
  const visitedStateNames = [...new Set([...visited.map(d => d.state), ...directoryVisited.map(p => p.state)])];

  // ---- Stories: every diary album becomes a circle, plus auto "Visited" and "Wishlist" highlights ----
  const storyGroups = useMemo<StoryGroup[]>(() => {
    const diary: StoryGroup[] = memories.filter(m => !m.createdAt || storyNow - new Date(m.createdAt).getTime() < 24 * 60 * 60 * 1000).map((m, i) => {
      const photos = m.images?.length ? m.images : [m.image];
      const where = [m.destinationName || m.place, m.district, m.state].filter(Boolean).join(' · ');
      return { id: `m:${m.id || m.title + i}`, label: m.destinationName || m.title || m.place, cover: m.image, slides: photos.map((image, n) => ({ image, title: m.title, subtitle: [where, m.date].filter(Boolean).join(' · '), caption: n === 0 ? m.note : undefined })), stamp: stampFor(m) };
    });
    const asSlides = (ds: DestinationRecord[], ps: DirectoryPlaceRecord[]) => [
      ...ds.map(d => ({ image: d.image, title: d.name, subtitle: `${d.state} · ${d.category}`, caption: d.note })),
      ...ps.map(p => ({ image: p.image, title: p.name, subtitle: `${p.district}, ${p.state} · ${p.category}`, caption: p.note })),
    ].filter(sl => sl.image);
    const extra: StoryGroup[] = [];
    const v = asSlides(visited, directoryVisited); if (v.length) extra.push({ id: `visited:${v.length}`, label: 'Visited', cover: v[0].image, slides: v });
    const w = asSlides(wishlist, directoryWishlist); if (w.length) extra.push({ id: `wishlist:${w.length}`, label: 'Wishlist', cover: w[0].image, slides: w });
    return [...diary, ...extra];
  }, [memories, storyNow, visited, directoryVisited, wishlist, directoryWishlist]);
  const diaryCount = memories.filter(m => !m.createdAt || storyNow - new Date(m.createdAt).getTime() < 24 * 60 * 60 * 1000).length;
  const albumTiles = memories.map((m, gi) => { const imgs = m.images?.length ? m.images : [m.image]; return { gi, cover: imgs[0], count: imgs.length, title: m.title, place: m.destinationName || m.place, stamp: stampFor(m) }; });
  const [postIndex, setPostIndex] = useState<number | null>(null);
  const openPost = postIndex !== null ? memories[postIndex] : null;
  const allSeen = diaryCount > 0 && storyGroups.slice(0, diaryCount).every(gp => seen.includes(gp.id));

  // ---- Badges ----
  const badges = [
    { id: 'first', title: 'First Footprints', detail: 'Record your first visit', done: totalVisitedCount >= 1, icon: Stamp },
    { id: 'five', title: 'Curious Wanderer', detail: 'Record five visits', done: totalVisitedCount >= 5, icon: Compass },
    { id: 'states', title: 'State Collector', detail: 'Visit places in three states', done: visitedStateNames.length >= 3, icon: Map },
    { id: 'memory', title: 'Memory Keeper', detail: 'Save your first diary album', done: memories.length >= 1, icon: BookOpen },
    { id: 'story', title: 'Story Collector', detail: 'Save five diary albums', done: memories.length >= 5, icon: Camera },
  ];
  const earnedCount = badges.filter(b => b.done).length;

  const saveChanges = async () => { setSaving(true); setError(''); try { await updateProfile({name:name.trim(),bio:bio.trim(),avatar:avatar.trim()}); setEditing(false); } catch(e) { setError(e instanceof Error ? e.message : 'Could not update profile.'); } finally { setSaving(false); } };
  const pickAvatar = async (file?: File) => { if (!file) return; setError(''); try { setAvatar(await resizeImageToDataUrl(file)); } catch (e) { setError(e instanceof Error ? e.message : 'Could not use that image.'); } };
  const shareProfile = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard unavailable */ } };
  const displayName = user?.name || 'Traveler';
  const avatarSrc = user?.avatar || avatar || '';
  const since = user?.createdAt ? new Date(user.createdAt).getFullYear() : null;
  const achievementCount = totalVisitedCount;
  const medal = achievementCount >= 30 ? { name: 'Gold', icon: '🥇', className: 'gold' } : achievementCount >= 20 ? { name: 'Silver', icon: '🥈', className: 'silver' } : achievementCount >= 10 ? { name: 'Bronze', icon: '🥉', className: 'bronze' } : null;
  const activityCounts = [...visited.map(d => d.category), ...directoryVisited.map(p => p.category)].reduce((acc: Record<string, number>, category) => { acc[category] = (acc[category] || 0) + 1; return acc; }, {});
  const topActivity = Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0]?.[0]?.toLowerCase() || '';
  const travelTitle = /trek|hike/.test(topActivity) ? '🥾 Trekker' : /beach|coast|water/.test(topActivity) ? '🏖️ Beach Person' : /mountain|nature|hill/.test(topActivity) ? '🏔️ Mountain Lover' : '🌍 Curious Explorer';
  const openStory = (group: number, slide = 0) => setStory({ group, slide });
  const placeCards = (ds: DestinationRecord[], ps: DirectoryPlaceRecord[], mode: 'visited'|'wishlist') => <>
    {ds.length > 0 && <div className="profile-destination-grid">{ds.map(d => <ProfileDestinationCard key={d.id} d={d} visited={mode==='visited'} saved={saved.includes(d.id)} onSave={()=>toggleSaved(d.id)} onVisit={()=>markVisited(d.id)} onOpen={()=>openDestination(d)}/>)}</div>}
    {ps.length > 0 && <div className="profile-directory-wishlist-grid">{ps.map(place => <ProfileDirectoryPlaceCard key={place.key} place={place} visited={mode==='visited' || visitedDirectoryKeys.includes(place.key)} saved={savedDirectoryKeys.includes(place.key)} onVisit={()=>markDirectoryVisited(place.key)} onRemove={()=>toggleDirectorySaved(place.key)} onExplore={()=>setPage('Directory')}/>)}</div>}
  </>;

  return <div className="rl-page ig-profile">
    <header className="ig-head">
      <div className="ig-avatar-wrap">
        <button className={`ig-avatar ${diaryCount ? (allSeen ? 'seen' : 'live') : ''}`} onClick={() => diaryCount ? openStory(0) : setEditing(true)} aria-label={diaryCount ? 'Play your diary stories' : 'Add a profile photo'}>
          <span className="ig-avatar-inner">{avatarSrc ? <img src={avatarSrc} alt={`${displayName} profile`} /> : <b>{displayName.charAt(0).toUpperCase()}</b>}</span>
        </button>
        {medal && <span className={`ig-medal ${medal.className}`} title={`${medal.name} medal · ${achievementCount} achievements`} aria-label={`${medal.name} medal, ${achievementCount} achievements`}>{medal.icon}</span>}
      </div>
      <div className="ig-info">
        <div className="ig-name-row">
          <h1>{displayName}</h1>
          <span className="ig-travel-title">{travelTitle}</span>
          <div className="ig-actions">
            <button className="ig-btn primary" onClick={() => { setEditing(true); setError(''); }}>Edit profile</button>
            <button className="ig-btn" onClick={shareProfile}><Share2 size={15}/>{copied ? 'Link copied' : 'Share'}</button>
          </div>
        </div>
        <ul className="ig-stats" aria-label="Your travel statistics">
          <li><b>{memories.length}</b><span>memories</span></li>
          <li><b>{totalVisitedCount}</b><span>places</span></li>
          <li><b>{stats.states}</b><span>states</span></li>
          <li><b>{totalWishlistCount}</b><span>wishlist</span></li>
        </ul>
        <div className="ig-bio">
          {since && <span className="ig-since"><Compass size={13}/> Traveler since {since}</span>}
          <p>{user?.bio?.trim() || 'Add a line about the places you love and the stories you collect.'}</p>
        </div>
      </div>
    </header>

    <section className="ig-stories" aria-label="Diary stories">
      <button className="ig-story new" onClick={openMemory}><span className="ig-ring dashed"><span><Plus size={30}/></span></span><small>New</small></button>
      {storyGroups.map((gp, i) => {
        const isDiary = i < diaryCount;
        return <button key={gp.id} className="ig-story" onClick={() => openStory(i)} aria-label={`Open ${gp.label} story`}>
          <span className={`ig-ring ${seen.includes(gp.id) ? 'seen' : 'live'} ${isDiary ? '' : 'auto'}`}><span><img src={gp.cover} alt="" loading="lazy"/></span></span>
          {gp.stamp && <PassportStamp info={gp.stamp} size={50} className="story-stamp" />}
          <small>{gp.label}</small>
        </button>;
      })}
    </section>

    <nav className="ig-tabs" role="tablist" aria-label="Profile sections">
      {([{id:'memories',label:'Memories',icon:LayoutGrid},{id:'visited',label:'Visited',icon:PinIcon},{id:'wishlist',label:'Wishlist',icon:Heart},{id:'stamps',label:'Stamps',icon:StampToolIcon}] as const).map(t => { const Icon = t.icon; return <button key={t.id} role="tab" aria-selected={tab===t.id} className={tab===t.id?'active':''} onClick={()=>setTab(t.id)}><Icon size={18}/><span>{t.label}</span></button>; })}
    </nav>

    {tab==='memories' && (albumTiles.length ? <div className="ig-grid">{albumTiles.map(t => <button key={t.gi} className="ig-tile" onClick={() => setPostIndex(t.gi)} aria-label={`Open ${t.title}${t.count > 1 ? `, ${t.count} photos` : ''}`}><img src={t.cover} alt={t.title} loading="lazy"/>{t.count > 1 && <span className="ig-multi"><Images size={17}/></span>}<PassportStamp info={t.stamp} size={82} className="tile-stamp"/><span className="ig-tile-hover"><MapPin size={14}/>{t.place || t.title}</span></button>)}</div>
      : <div className="ig-empty"><span><Camera size={34}/></span><h2>Share your first memory</h2><p>Photos from your trips will appear here, and every diary album becomes a story circle above.</p><button className="btn-primary" onClick={openMemory}><Plus size={16}/> Add a memory</button></div>)}

    {tab==='visited' && ((visited.length + directoryVisited.length) ? <section className="profile-content-section">{placeCards(visited, directoryVisited, 'visited')}</section>
      : <ProfileEmpty icon={<Stamp size={25}/>} title="No visits recorded yet" text="Tap “I’ve been here” on a place and it appears here with a stamp." action="Browse places" onClick={()=>setPage('Directory')}/>)}

    {tab==='wishlist' && (totalWishlistCount ? <section className="profile-content-section">{placeCards(wishlist, directoryWishlist, 'wishlist')}</section>
      : <ProfileEmpty icon={<Heart size={25}/>} title="Your wishlist is empty" text="Tap the heart on any place to keep it for another day." action="Explore places" onClick={()=>setPage('Directory')}/>)}

    {tab==='stamps' && <section className="ig-stamps">
      <div className="ig-section-head"><div><span className="rl-eyebrow">Travel passport</span><h2>{visitedStateNames.length ? `${visitedStateNames.length} ${visitedStateNames.length===1?'stamp':'stamps'} collected` : 'No stamps yet'}</h2></div></div>
      {visitedStateNames.length ? <div className="ig-stamp-grid">{visitedStateNames.map((st, i) => { const n = new Set([...visited.filter(d=>d.state===st).map(d=>d.name), ...directoryVisited.filter(p=>p.state===st).map(p=>p.name)]).size; return <div key={st} className={`ig-stamp s${i%4}`}><MapPin size={18}/><strong>{st}</strong><small>{n} {n===1?'place':'places'}</small></div>; })}</div>
        : <p className="ig-muted">Visit a place in any state to earn its stamp.</p>}
      <div className="ig-section-head"><div><span className="rl-eyebrow">Badges</span><h2>{earnedCount} of {badges.length} unlocked</h2></div></div>
      <div className="ig-badges">{badges.map(b => { const Icon = b.icon; return <div key={b.id} className={`ig-badge ${b.done?'done':''}`}><span><Icon size={20}/></span><div><strong>{b.title}</strong><small>{b.detail}</small></div>{b.done && <Sparkles size={16} className="ig-badge-star"/>}</div>; })}</div>
    </section>}

    {openPost && postIndex !== null && <PostCarousel post={{ title: openPost.title, images: openPost.images?.length ? openPost.images : [openPost.image], place: [openPost.destinationName || openPost.place, openPost.district, openPost.state].filter(Boolean).join(' · '), date: openPost.date, note: openPost.note, stamp: stampFor(openPost) }} onClose={() => setPostIndex(null)} onPrevPost={postIndex > 0 ? () => setPostIndex(postIndex - 1) : undefined} onNextPost={postIndex < memories.length - 1 ? () => setPostIndex(postIndex + 1) : undefined}/>}
    {story && <StoryViewer groups={storyGroups} startGroup={story.group} startSlide={story.slide} onSeen={markSeen} onClose={() => setStory(null)}/>}

    {editing && <div className="modal-backdrop" onClick={()=>setEditing(false)}><section className="profile-edit-modal" onClick={e=>e.stopPropagation()}>
      <div className="modal-heading"><div><span className="eyebrow">YOUR TRAVEL IDENTITY</span><h2>Edit profile</h2></div><button className="icon-btn" onClick={()=>setEditing(false)} aria-label="Close edit profile"><X size={18}/></button></div>
      <div className="ig-edit-photo"><span className="ig-edit-avatar">{avatar ? <img src={avatar} alt=""/> : <b>{(name||'T').charAt(0).toUpperCase()}</b>}</span>
        <div><label className="btn-secondary ig-upload"><Camera size={15}/> Upload photo<input type="file" accept="image/*" onChange={e=>pickAvatar(e.target.files?.[0])}/></label>{avatar && <button className="ig-link-btn" onClick={()=>setAvatar('')}>Remove</button>}</div></div>
      <label className="field-label">Display name<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} placeholder="Your name"/></label>
      <label className="field-label">About your travels<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={280} rows={3} placeholder="What kind of places do you love?"/></label>
      {error&&<p className="profile-form-error">{error}</p>}
      <div className="modal-actions"><button className="btn-secondary" onClick={()=>setEditing(false)}>Cancel</button><button className="btn-primary" disabled={saving||!name.trim()} onClick={saveChanges}>{saving?'Saving…':'Save profile'}</button></div>
    </section></div>}
  </div>;
}

function ProfileDestinationCard({d,saved,visited,onSave,onVisit,onOpen}:{d:DestinationRecord;saved?:boolean;visited?:boolean;onSave:()=>void|Promise<void>;onVisit:()=>void|Promise<void>;onOpen:()=>void}) {
  return <article className="profile-destination-card"><button className="profile-destination-image" onClick={onOpen}><img src={d.image} alt={d.name}/><span>{d.category}</span></button><button className={`profile-heart ${saved?'is-saved':''}`} onClick={onSave} aria-label={saved?'Remove from wishlist':'Add to wishlist'}><Heart size={17} fill={saved?'currentColor':'none'}/></button><div className="profile-destination-copy"><h3>{d.name}</h3><p><MapPin size={13}/>{d.state}</p><span>{d.note}</span><div className="profile-destination-actions">{visited ? <span className="profile-visited-label"><Stamp size={13}/> Visit recorded</span> : <button onClick={onVisit}><Stamp size={13}/> I've been here</button>}<button onClick={onOpen}>Details <ArrowUpRight size={13}/></button></div></div></article>;
}
function ProfileDirectoryPlaceCard({place,onRemove,onExplore,visited,saved,onVisit}:{place:DirectoryPlaceRecord;onRemove:()=>void;onExplore:()=>void;visited?:boolean;saved?:boolean;onVisit?:()=>void|Promise<void>}) { return <article className="profile-directory-place-card"><div className="profile-directory-place-image"><img src={place.image} alt={place.name}/>{saved&&<button className="profile-heart is-saved" onClick={onRemove} aria-label={`Remove ${place.name} from wishlist`}><Heart size={17} fill="currentColor"/></button>}</div><div className="profile-destination-copy"><span className="place-category">{place.category}</span><h3>{place.name}</h3><p><MapPin size={13}/>{place.district}, {place.state}</p><span>{place.note}</span><div className="profile-destination-actions">{visited ? <span className="profile-visited-label"><Stamp size={13}/> Visit recorded</span> : onVisit ? <button onClick={onVisit}><Stamp size={13}/> I've been here</button> : null}<button onClick={onExplore}>Explore directory <ArrowUpRight size={13}/></button></div></div></article>; }

function ProfileEmpty({icon,title,text,action,onClick}:{icon:React.ReactNode;title:string;text:string;action:string;onClick:()=>void}) { return <div className="profile-empty-state"><span>{icon}</span><h3>{title}</h3><p>{text}</p><button className="btn-secondary" onClick={onClick}>{action}<ArrowRight size={14}/></button></div>; }

function MapPage({ theme, destinations, saved, savedDirectoryKeys, visitedDirectoryKeys, onOpenRoute }: { theme: 'dark' | 'light'; destinations: DestinationRecord[]; saved: number[]; savedDirectoryKeys: string[]; visitedDirectoryKeys: string[]; onOpenRoute?: (target: RouteTarget) => void }) {
  const [selectedState, setSelectedState] = useState('');
  const [placeFilter, setPlaceFilter] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All districts');
  const [mapMode, setMapMode] = useState<'discover' | 'journey'>('discover');
  const [surprisePlace, setSurprisePlace] = useState<DestinationRecord | null>(null);
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const stateHas = (key: string, name: string) => key.startsWith(`${name}::`);
  const visitedStates = new Set(visitedDirectoryKeys.map(k => k.split('::')[0]));
  const wishStates = new Set([...savedDirectoryKeys.map(k => k.split('::')[0]), ...destinations.filter(d => saved.includes(d.id)).map(d => d.state)]);
  const exploredCount = new Set([...visitedStates, ...destinations.filter(d => saved.includes(d.id)).map(d => d.state)]).size;
  const totalStates = INDIA_DIRECTORY.length || 36;
  const progress = Math.min(1, exploredCount / totalStates);
  const visitedPlaceCount = visitedDirectoryKeys.length;
  const wishCount = saved.length + savedDirectoryKeys.length;

  const journeyPlaces = destinations.filter(p => saved.includes(p.id) || visitedDirectoryKeys.some(k => stateHas(k, p.state))).slice(0, 6);
  const journeyStates = new Set(journeyPlaces.map(p => p.state));
  const categoryCounts = allDirectoryPlaces.reduce((acc: Record<string, number>, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc; }, {});
  const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const statesWithCategory = (cat: string) => new Set(allDirectoryPlaces.filter(p => p.category === cat).map(p => p.state));
  const filterStates = placeFilter !== 'All' ? statesWithCategory(placeFilter) : null;

  const selected = INDIA_DIRECTORY.find(item => item.name === selectedState);
  const statePlaces = allDirectoryPlaces.filter(place => place.state === selectedState);
  const filters = ['All', ...Array.from(new Set(statePlaces.map(place => place.category)))].slice(0, 6);
  const districtPlaces = selectedDistrict === 'All districts' ? statePlaces : statePlaces.filter(place => place.district === selectedDistrict);
  const visiblePlaces = placeFilter === 'All' ? districtPlaces : districtPlaces.filter(place => place.category === placeFilter);

  // Vintage-nautical palette: blue seas of unexplored states, gold for visited, brick red for wishlist.
  const dark = theme === 'dark';
  const MAP = { base: dark ? '#2a527f' : '#8fb2cf', places: dark ? '#3f7aa8' : '#5b8db8', visited: '#deb866', wish: '#c8472f', match: '#e6c675', dim: dark ? '#17365f' : '#cdd9e2', selected: dark ? '#fbf4e1' : '#0b2447' };
  const stateFill = (name: string) => {
    if (mapMode === 'journey') return journeyStates.has(name) ? MAP.match : MAP.dim;
    if (name === selectedState) return MAP.selected;
    if (visitedStates.has(name)) return MAP.visited;
    if (wishStates.has(name)) return MAP.wish;
    if (filterStates) return filterStates.has(name) ? MAP.match : MAP.dim;
    const state = INDIA_DIRECTORY.find(item => item.name === name);
    return state?.places?.length ? MAP.places : MAP.base;
  };
  const pickState = (name: string, district = 'All districts') => { setSelectedState(name); setSelectedDistrict(district); setPlaceFilter('All'); setQ(''); setSearchOpen(false); };
  const mapTooltip = (ctx: { name: string; kind: string }) => {
    const st = INDIA_DIRECTORY.find(item => item.name === ctx.name);
    const wl = [...destinations.filter(item => item.state === ctx.name && saved.includes(item.id)).map(item => item.name), ...savedDirectoryKeys.filter(k => stateHas(k, ctx.name)).map(k => k.split('::').pop() || '')].filter(Boolean);
    return <div className="am-tip-body"><strong>{ctx.name}</strong><span>{st ? `${st.districts.length} districts · ${allDirectoryPlaces.filter(p => p.state === ctx.name).length} places` : 'Tap to explore'}</span>{wl.length > 0 && <em>♥ {wl.slice(0, 3).join(', ')}</em>}</div>;
  };
  const pickSurprise = () => { const next = destinations[Math.floor(Math.random() * destinations.length)] || null; setSurprisePlace(next); };
  const ql = q.trim().toLowerCase();
  const stateHits = ql ? INDIA_DIRECTORY.filter(s => s.name.toLowerCase().includes(ql)).slice(0, 5) : [];
  const placeHits = ql ? allDirectoryPlaces.filter(p => p.name.toLowerCase().includes(ql) || p.district.toLowerCase().includes(ql)).slice(0, 5) : [];

  return <div className="rl-page am-page">
    <header className="am-head">
      <div className="am-title"><span className="am-script">Roamly atlas</span><h1>Explore India</h1><p>Tap any state to open its districts, hidden places and directions.</p></div>
      <div className="am-tools">
        <div className="am-search"><Search size={17}/><input value={q} onChange={e => { setQ(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} placeholder="Search a state, district or place…" aria-label="Search the atlas"/>
          {searchOpen && ql && <div className="am-suggest">{stateHits.map(s => <button key={s.name} onClick={() => pickState(s.name)}><MapPin size={14}/><span><strong>{s.name}</strong><small>State · {s.districts.length} districts</small></span></button>)}{placeHits.map(p => <button key={p.key} onClick={() => pickState(p.state, p.district)}><Compass size={14}/><span><strong>{p.name}</strong><small>{p.district}, {p.state}</small></span></button>)}{!stateHits.length && !placeHits.length && <p>No match for “{q}”.</p>}</div>}
        </div>
        <div className="am-mode"><button className={mapMode === 'discover' ? 'active' : ''} onClick={() => setMapMode('discover')}><Compass size={15}/> Discover</button><button className={mapMode === 'journey' ? 'active' : ''} onClick={() => setMapMode('journey')}><Plane size={15}/> My journey</button></div>
      </div>
    </header>

    <div className="am-grid">
      <aside className="am-col am-left">
        <section className="am-card am-passport">
          <div className="am-ring" style={{ ['--p' as any]: `${Math.round(progress * 360)}deg` }}><div><strong>{exploredCount}</strong><span>of {totalStates}</span></div></div>
          <div className="am-passport-copy"><span className="am-label">Passport</span><h3>States explored</h3><p>{exploredCount ? 'Keep filling your map.' : 'Save or visit a place to light up your first state.'}</p></div>
          <div className="am-mini"><span><b>{visitedPlaceCount}</b>Visited</span><span><b>{wishCount}</b>Wishlist</span><span><b>{journeyPlaces.length}</b>On route</span></div>
        </section>
        <section className="am-card">
          <div className="am-card-head"><span className="am-label">Colour the map by</span>{placeFilter !== 'All' && <button onClick={() => setPlaceFilter('All')}>Clear</button>}</div>
          <div className="am-cats">{topCategories.map(([cat, count]) => { const Icon = categoryIcons[cat] || PinIcon; return <button key={cat} className={placeFilter === cat ? 'active' : ''} onClick={() => { setMapMode('discover'); setPlaceFilter(placeFilter === cat ? 'All' : cat); }}><Icon size={15}/><span>{cat}</span><b>{count}</b></button>; })}</div>
        </section>
        <section className="am-card am-legend"><span className="am-label">Legend</span><div><span><i style={{ background: '#deb866' }}/>Visited</span><span><i style={{ background: '#c8472f' }}/>Wishlist</span><span><i style={{ background: '#5b8db8' }}/>Has places</span><span><i style={{ background: '#e6c675' }}/>{mapMode === 'journey' ? 'On your route' : 'Filter match'}</span></div></section>
        <button className="am-postcard" onClick={pickSurprise}><span className="am-stamp"><Sparkles size={18}/></span><span><strong>Surprise me</strong><small>Pull a random postcard</small></span><ArrowRight size={18}/></button>
      </aside>

      <section className="am-stage" aria-label="Map of India">
        <div className="am-stage-top"><span className="am-chip"><i/> {mapMode === 'journey' ? 'Journey view' : placeFilter !== 'All' ? `Showing ${placeFilter}` : 'Discover view'}</span><div className="am-compass" aria-hidden="true"><Compass size={20}/><b>N</b></div></div>
        <div className="am-map"><IndiaSvgMap level="state" resolution="high" tooltip={mapTooltip} tooltipClassName="am-tip" stateFill={stateFill} stateStyle={{ stroke: dark ? '#0a1b34' : '#f6ecd0', strokeWidth: 1 }} onStateClick={(name: string) => pickState(name)} /></div>
        <p className="am-hint">{selectedState ? <><MapPin size={14}/> {selectedState} selected</> : 'Tap a state to begin'}</p>
      </section>

      <aside className="am-col am-right">
        {mapMode === 'journey' ? <section className="am-card am-panel"><span className="am-label">Your route</span><h2>Your travel story</h2>
          {journeyPlaces.length ? <ol className="am-route">{journeyPlaces.map((p, i) => <li key={p.id}><b>{i + 1}</b><img src={p.image} alt=""/><span><strong>{p.name}</strong><small>{p.state} · {p.category}</small></span></li>)}</ol> : <div className="am-empty"><Plane size={26}/><p>Save places or record visits and your route will be drawn here, stop by stop.</p></div>}</section>
        : selected ? <section className="am-card am-panel">
          <div className="am-cover"><img src={stateCoverUrl(selected.name)} alt=""/><span/><button onClick={() => setSelectedState('')} aria-label="Close state guide"><X size={16}/></button><div><span className="am-label light">State guide</span><h2>{selected.name}</h2></div></div>
          <div className="am-facts"><span><b>{selected.districts.length}</b>Districts</span><span><b>{statePlaces.length}</b>Places</span><span><b>{statePlaces.filter(p => savedDirectoryKeys.includes(p.key)).length}</b>Saved</span></div>
          <div className="am-tabs">{filters.map(f => <button key={f} className={placeFilter === f ? 'active' : ''} onClick={() => setPlaceFilter(f)}>{f}</button>)}</div>
          <div className="am-places">{visiblePlaces.slice(0, 5).map(p => <article key={p.key}><img src={p.image} alt=""/><span><strong>{p.name}</strong><small>{p.district} · {p.category}</small></span>{onOpenRoute && Number.isFinite(p.lat) && Number.isFinite(p.lng) && <button aria-label={`Directions to ${p.name}`} onClick={() => onOpenRoute({ name: p.name, state: p.state, lat: p.lat as number, lng: p.lng as number })}><Navigation size={15}/></button>}</article>)}{!visiblePlaces.length && <p className="am-none">No {placeFilter === 'All' ? '' : placeFilter.toLowerCase() + ' '}places listed here yet.</p>}</div>
          <div className="am-card-head"><span className="am-label">Districts</span>{selectedDistrict !== 'All districts' && <button onClick={() => setSelectedDistrict('All districts')}>Show all</button>}</div>
          <div className="am-pills"><button className={selectedDistrict === 'All districts' ? 'active' : ''} onClick={() => setSelectedDistrict('All districts')}>All</button>{selected.districts.map(d => <button key={d} className={selectedDistrict === d ? 'active' : ''} onClick={() => setSelectedDistrict(d)}>{d}</button>)}</div>
        </section>
        : <section className="am-card am-panel am-start"><span className="am-stamp big"><MapPin size={26}/></span><h2>Pick a state</h2><p>Choose any state on the map. You’ll see its districts, best places and how to get there.</p>
          <div className="am-start-list"><span className="am-label">Good places to start</span>{INDIA_DIRECTORY.filter(s => s.places?.length).slice(0, 5).map(s => <button key={s.name} onClick={() => pickState(s.name)}><img src={stateCoverUrl(s.name)} alt=""/><span><strong>{s.name}</strong><small>{s.districts.length} districts</small></span><ArrowUpRight size={15}/></button>)}</div></section>}
      </aside>
    </div>

    {surprisePlace && <div className="modal-backdrop" onClick={() => setSurprisePlace(null)}><article className="am-surprise" onClick={e => e.stopPropagation()}><img src={surprisePlace.image} alt={surprisePlace.name}/><div><span className="am-label">Your next detour</span><h2>{surprisePlace.name}</h2><p>{surprisePlace.note}</p><small><MapPin size={13}/> {surprisePlace.state} · {surprisePlace.category}</small><div className="am-surprise-actions"><button className="btn-secondary" onClick={pickSurprise}>Another one</button><button className="btn-primary" onClick={() => { pickState(surprisePlace.state); setSurprisePlace(null); }}>Open {surprisePlace.state}</button></div></div><button className="am-x" onClick={() => setSurprisePlace(null)} aria-label="Close"><X size={16}/></button></article></div>}
  </div>;
}

export default App;
