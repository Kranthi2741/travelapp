import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Destination } from './data/destinations';

const pin = L.divIcon({ className: 'dd-map-pin-wrap', html: '<span class="dd-map-pin"></span>', iconSize: [22, 22], iconAnchor: [11, 11] });
type Props = { destinations: Destination[]; saved: number[]; onToggleSaved: (id:number)=>void; onOpen: (d:Destination)=>void };
export default function MapView({ destinations, saved, onToggleSaved, onOpen }: Props) {
  return <div className="interactive-map-wrap"><MapContainer center={[22.8,79.1]} zoom={4.6} scrollWheelZoom={false} className="interactive-map"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{destinations.map(d => d.lat && d.lng ? <Marker key={d.id} position={[d.lat,d.lng]} icon={pin}><Popup><div className="map-popup"><img src={d.image} alt=""/><strong>{d.name}</strong><span>{d.state} · {d.category}</span><button onClick={()=>onOpen(d)}>View destination</button><button className="map-save" onClick={()=>onToggleSaved(d.id)}>{saved.includes(d.id)?'Remove from wishlist':'Save to wishlist'}</button></div></Popup></Marker> : null)}</MapContainer><div className="map-legend"><span><i/> Destinations</span><strong>{destinations.length} places</strong></div></div>;
}
