import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ArrowUpRight, LocateFixed, MapPin, Navigation, Search, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

export type RouteTarget = {
  name: string;
  state?: string;
  lat?: number;
  lng?: number;
};

type Coordinate = { lat: number; lng: number; label: string };
type Props = { destination: RouteTarget; onClose: () => void; userLocation?: { lat: number; lng: number; label?: string } | null };
type RouteResult = { points: [number, number][]; distance: number; duration: number };

const destinationIcon = L.divIcon({
  className: 'dd-route-marker-wrap',
  html: '<span class="dd-route-marker dd-route-marker-destination"></span>',
  iconSize: [28, 36],
  iconAnchor: [14, 32],
});
const originIcon = L.divIcon({
  className: 'dd-route-marker-wrap',
  html: '<span class="dd-route-marker dd-route-marker-origin"></span>',
  iconSize: [24, 30],
  iconAnchor: [12, 26],
});

function FitRoute({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize();
      if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [42, 42], maxZoom: 14 });
      else if (points.length === 1) map.setView(points[0], 13);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [map, points]);
  return null;
}

function formatDistance(metres: number) {
  return metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`;
}
function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

export default function RouteMapModal({ destination, onClose, userLocation }: Props) {
  const destinationValid = Number.isFinite(destination.lat) && Number.isFinite(destination.lng);
  const destinationPoint = useMemo(() => destinationValid
    ? { lat: destination.lat as number, lng: destination.lng as number, label: destination.name }
    : null, [destinationValid, destination.lat, destination.lng, destination.name]);
  const [origin, setOrigin] = useState<Coordinate | null>(userLocation ? { lat: userLocation.lat, lng: userLocation.lng, label: userLocation.label ? `${userLocation.label} (your location)` : 'Your current location' } : null);
  const [originText, setOriginText] = useState(userLocation ? (userLocation.label || 'Your current location') : '');
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [message, setMessage] = useState('Use your current location or enter a starting place to draw a route.');

  const mapPoints = useMemo<[number, number][]>(() => {
    if (route?.points.length) return route.points;
    if (origin && destinationPoint) return [[origin.lat, origin.lng], [destinationPoint.lat, destinationPoint.lng]];
    if (destinationPoint) return [[destinationPoint.lat, destinationPoint.lng]];
    return [[20.5937, 78.9629]];
  }, [route, origin, destinationPoint]);

  useEffect(() => {
    if (!origin || !destinationPoint) {
      setRoute(null);
      setRouteLoading(false);
      return;
    }
    const controller = new AbortController();
    setRouteLoading(true);
    setRoute(null);
    setMessage('Finding a driving route…');
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destinationPoint.lng},${destinationPoint.lat}?overview=full&geometries=geojson&steps=false`;
    fetch(url, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('The routing service is temporarily unavailable.');
        return response.json();
      })
      .then(data => {
        const result = data?.routes?.[0];
        if (!result?.geometry?.coordinates?.length) throw new Error('No driving route was found between these locations.');
        setRoute({
          points: result.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]),
          distance: result.distance,
          duration: result.duration,
        });
        setMessage('');
      })
      .catch(error => {
        if (error?.name !== 'AbortError') setMessage(error instanceof Error ? error.message : 'Could not calculate the route.');
      })
      .finally(() => { if (!controller.signal.aborted) setRouteLoading(false); });
    return () => controller.abort();
  }, [origin, destinationPoint]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setMessage('This browser does not support location. Enter your starting place below instead.');
      return;
    }
    setLocating(true);
    setMessage('Waiting for location permission…');
    navigator.geolocation.getCurrentPosition(
      position => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude, label: 'Your current location' };
        setOrigin(point);
        setOriginText('Your current location');
        setLocating(false);
        setMessage('Location found. Calculating your driving route…');
      },
      error => {
        setLocating(false);
        const reason = error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Allow location access in your browser or enter a starting place manually.'
          : error.code === error.TIMEOUT ? 'Location lookup timed out. Try again or enter a starting place manually.'
          : 'Could not get your location. Enter a starting place manually.';
        setMessage(reason);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const searchOrigin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = originText.trim();
    if (!query) {
      setMessage('Enter a city, address, landmark, or postcode first.');
      return;
    }
    setSearching(true);
    setMessage('Searching for your starting place…');
    try {
      // Photon is an OpenStreetMap-based geocoder; no API key is required for this demo.
      const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`);
      if (!response.ok) throw new Error('Location search is temporarily unavailable.');
      const data = await response.json();
      const feature = data?.features?.[0];
      if (!feature?.geometry?.coordinates) throw new Error('We could not find that place. Try a nearby city or landmark.');
      const [lng, lat] = feature.geometry.coordinates as [number, number];
      const props = feature.properties || {};
      const label = [props.name, props.city, props.state, props.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ') || query;
      setOrigin({ lat, lng, label });
      setOriginText(label);
      setMessage('Starting place found. Calculating your driving route…');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not search for that place.');
    } finally {
      setSearching(false);
    }
  };

  const externalDirections = destinationPoint
    ? `https://www.google.com/maps/dir/?api=1&destination=${destinationPoint.lat},${destinationPoint.lng}${origin ? `&origin=${origin.lat},${origin.lng}` : ''}&travelmode=driving`
    : 'https://www.google.com/maps';

  return <div className="route-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="route-modal" role="dialog" aria-modal="true" aria-label={`Directions to ${destination.name}`}>
      <header className="route-modal-header">
        <div className="route-modal-title"><span className="eyebrow">Directions</span><h2>{destination.name}</h2><p>{destination.state ? `${destination.state}, India` : 'Destination route'}</p></div>
        <button className="icon-btn" aria-label="Close map" onClick={onClose}><X size={18}/></button>
      </header>
      <div className="route-modal-content">
        <aside className="route-sidebar">
          <div className="route-location-card"><span className="route-step-dot route-step-origin"/><div><small>STARTING POINT</small><strong>{origin?.label || 'Not selected yet'}</strong></div></div>
          <div className="route-location-card"><span className="route-step-dot route-step-destination"/><div><small>DESTINATION</small><strong>{destination.name}</strong><span>{destination.state || 'India'}</span></div></div>
          <button className="btn-primary route-location-btn" onClick={useMyLocation} disabled={locating}><LocateFixed size={16}/>{locating ? 'Finding location…' : 'Use my current location'}</button>
          <div className="route-or"><span>OR ENTER A STARTING PLACE</span></div>
          <form className="route-search-form" onSubmit={searchOrigin}>
            <label htmlFor="route-origin">City, address or landmark</label>
            <div><MapPin size={16}/><input id="route-origin" value={originText} onChange={event => setOriginText(event.target.value)} placeholder="e.g. Hyderabad" autoComplete="street-address"/><button type="submit" aria-label="Search starting place" disabled={searching}><Search size={16}/></button></div>
            <button type="submit" className="btn-secondary route-search-submit" disabled={searching}>{searching ? 'Searching…' : 'Use this starting place'}</button>
          </form>
          {route && <div className="route-summary"><div><span>DRIVING DISTANCE</span><strong>{formatDistance(route.distance)}</strong></div><div><span>ESTIMATED TIME</span><strong>{formatDuration(route.duration)}</strong></div></div>}
          <p className={`route-status ${route ? 'success' : ''}`} role="status">{routeLoading ? 'Finding a driving route…' : message}</p>
          <a className="route-external-link" href={externalDirections} target="_blank" rel="noreferrer">Open directions in Google Maps <ArrowUpRight size={14}/></a>
        </aside>
        <div className="route-map-panel">
          {destinationPoint ? <MapContainer key={`${destination.name}-${destinationPoint.lat}-${destinationPoint.lng}`} center={[destinationPoint.lat, destinationPoint.lng]} zoom={12} scrollWheelZoom className="route-leaflet-map">
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19}/>
            <Marker position={[destinationPoint.lat, destinationPoint.lng]} icon={destinationIcon}><Popup><strong>{destination.name}</strong><br/>{destination.state || 'India'}</Popup></Marker>
            {origin && <Marker position={[origin.lat, origin.lng]} icon={originIcon}><Popup><strong>{origin.label}</strong></Popup></Marker>}
            {route && <Polyline positions={route.points} pathOptions={{ color: '#8a2a7a', weight: 5, opacity: 0.88, lineCap: 'round', lineJoin: 'round' }}/>}
            <FitRoute points={mapPoints}/>
          </MapContainer> : <div className="route-map-unavailable"><MapPin size={26}/><strong>Coordinates are not available</strong><p>This attraction needs latitude and longitude before a route can be drawn.</p></div>}
          <div className="route-map-attribution">Live map · OpenStreetMap</div>
        </div>
      </div>
    </section>
  </div>;
}
