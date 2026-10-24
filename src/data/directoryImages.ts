// Curated image references for the Directory. Images are representative editorial photography,
// not official district boundary or location evidence. Replace with licensed, place-verified photos
// as the destination catalogue is enriched.
const photo = (id: string, width = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;

export const STATE_COVER_IDS: Record<string, string> = {"Andhra Pradesh": "photo-1519046904884-53103b34b206", "Arunachal Pradesh": "photo-1464822759023-fed622ff2c3b", "Assam": "photo-1470770841072-f978cf4d019e", "Bihar": "photo-1548013146-72479768bada", "Chhattisgarh": "photo-1448375240586-882707db888b", "Goa": "photo-1512343879784-a960bf40e7f2", "Gujarat": "photo-1470252649378-9c29740c9fa8", "Haryana": "photo-1500530855697-b586d89ba3ee", "Himachal Pradesh": "photo-1464822759023-fed622ff2c3b", "Jharkhand": "photo-1448375240586-882707db888b", "Karnataka": "photo-1511497584788-876760111969", "Kerala": "photo-1544735716-392fe2489ffa", "Madhya Pradesh": "photo-1500530855697-b586d89ba3ee", "Maharashtra": "photo-1470770841072-f978cf4d019e", "Manipur": "photo-1464822759023-fed622ff2c3b", "Meghalaya": "photo-1470770841072-f978cf4d019e", "Mizoram": "photo-1448375240586-882707db888b", "Nagaland": "photo-1464822759023-fed622ff2c3b", "Odisha": "photo-1519046904884-53103b34b206", "Punjab": "photo-1470252649378-9c29740c9fa8", "Rajasthan": "photo-1470252649378-9c29740c9fa8", "Sikkim": "photo-1464822759023-fed622ff2c3b", "Tamil Nadu": "photo-1464278533981-50106e6176b1", "Telangana": "photo-1548013146-72479768bada", "Tripura": "photo-1448375240586-882707db888b", "Uttar Pradesh": "photo-1548013146-72479768bada", "Uttarakhand": "photo-1470770841072-f978cf4d019e", "West Bengal": "photo-1470770841072-f978cf4d019e", "Andaman and Nicobar Islands": "photo-1519046904884-53103b34b206", "Chandigarh": "photo-1500530855697-b586d89ba3ee", "Dadra and Nagar Haveli and Daman and Diu": "photo-1519046904884-53103b34b206", "Delhi": "photo-1548013146-72479768bada", "Jammu and Kashmir": "photo-1464822759023-fed622ff2c3b", "Ladakh": "photo-1519681393784-d120267933ba", "Lakshadweep": "photo-1519046904884-53103b34b206", "Puducherry": "photo-1512343879784-a960bf40e7f2"};

export const ANDHRA_DISTRICT_COVER_IDS: Record<string, string> = {"Anantapur": "photo-1500530855697-b586d89ba3ee", "Chittoor": "photo-1548013146-72479768bada", "East Godavari": "photo-1470770841072-f978cf4d019e", "Guntur": "photo-1548013146-72479768bada", "Krishna": "photo-1470770841072-f978cf4d019e", "Kurnool": "photo-1500530855697-b586d89ba3ee", "Nellore": "photo-1519046904884-53103b34b206", "Prakasam": "photo-1519046904884-53103b34b206", "Srikakulam": "photo-1519046904884-53103b34b206", "Visakhapatnam": "photo-1511497584788-876760111969", "Vizianagaram": "photo-1548013146-72479768bada", "West Godavari": "photo-1470770841072-f978cf4d019e", "YSR Kadapa": "photo-1500530855697-b586d89ba3ee"};

const REGION_PHOTOS: Record<string, string[]> = {"mountains": ["photo-1464822759023-fed622ff2c3b", "photo-1519681393784-d120267933ba", "photo-1470770841072-f978cf4d019e"], "coast": ["photo-1519046904884-53103b34b206", "photo-1512343879784-a960bf40e7f2", "photo-1518837695005-2083093ee35b"], "forest": ["photo-1448375240586-882707db888b", "photo-1511497584788-876760111969", "photo-1470770841072-f978cf4d019e"], "heritage": ["photo-1548013146-72479768bada", "photo-1600100397608-f0107c8a1d1b", "photo-1470252649378-9c29740c9fa8"], "plains": ["photo-1470252649378-9c29740c9fa8", "photo-1500530855697-b586d89ba3ee", "photo-1548013146-72479768bada"]};
const REGION_BY_STATE: Record<string, keyof typeof REGION_PHOTOS> = {
  'Andhra Pradesh':'coast','Goa':'coast','Kerala':'coast','Odisha':'coast','Tamil Nadu':'coast','West Bengal':'plains',
  'Arunachal Pradesh':'mountains','Himachal Pradesh':'mountains','Jammu and Kashmir':'mountains','Ladakh':'mountains','Sikkim':'mountains','Uttarakhand':'mountains',
  'Assam':'forest','Chhattisgarh':'forest','Jharkhand':'forest','Karnataka':'forest','Meghalaya':'forest','Mizoram':'forest','Nagaland':'forest','Tripura':'forest','Manipur':'mountains',
  'Bihar':'heritage','Delhi':'heritage','Madhya Pradesh':'heritage','Maharashtra':'heritage','Rajasthan':'heritage','Telangana':'heritage','Uttar Pradesh':'heritage','Gujarat':'plains','Haryana':'plains','Punjab':'plains','Chandigarh':'plains'
};

export function stateCoverUrl(state: string, width = 1200): string {
  return photo(STATE_COVER_IDS[state] || 'photo-1470770841072-f978cf4d019e', width);
}

export function districtCoverUrl(state: string, district: string, width = 900): string {
  const specific = state === 'Andhra Pradesh' ? ANDHRA_DISTRICT_COVER_IDS[district] : undefined;
  if (specific) return photo(specific, width);
  const group = REGION_PHOTOS[REGION_BY_STATE[state] || 'plains'];
  const hash = [...`${state}:${district}`].reduce((n, ch) => n + ch.charCodeAt(0), 0);
  return photo(group[hash % group.length], width);
}
