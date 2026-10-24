export type Destination = { id: number; name: string; state: string; category: string; image: string; distance?: string; note: string; lat?: number; lng?: number };
export const destinations: Destination[] = [
  { id: 1, name: 'Coorg', state: 'Karnataka', category: 'Nature', image: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=85', distance: 'Coffee country', note: 'Misty mornings and quiet coffee trails.', lat:12.3375, lng:75.8069 },
  { id: 2, name: 'Jog Falls', state: 'Karnataka', category: 'Waterfalls', image: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=900&q=85', distance: 'Monsoon favourite', note: 'A dramatic cascade wrapped in green.', lat:14.229, lng:74.812 },
  { id: 3, name: 'Ladakh', state: 'Ladakh', category: 'Mountains', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=85', distance: 'High altitude', note: 'Wide skies, quiet roads, endless horizons.', lat:34.1526, lng:77.5771 },
  { id: 4, name: 'Varkala', state: 'Kerala', category: 'Beaches', image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=85', distance: 'Coastal escape', note: 'Cliffside sunsets and the sound of waves.', lat:8.7379, lng:76.7163 },
  { id: 5, name: 'Hampi', state: 'Karnataka', category: 'Heritage', image: 'https://images.unsplash.com/photo-1600100397608-f0107c8a1d1b?auto=format&fit=crop&w=900&q=85', distance: 'Ancient kingdom', note: 'Stone-carved stories across a surreal landscape.', lat:15.335, lng:76.46 },
  { id: 6, name: 'Valley of Flowers', state: 'Uttarakhand', category: 'Trekking', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85', distance: 'Seasonal trek', note: 'A high-altitude walk through wildflower meadows.', lat:30.728, lng:79.605 },
  { id: 7, name: 'Munnar', state: 'Kerala', category: 'Nature', image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=900&q=85', distance: 'Tea country', note: 'Rolling tea gardens and misty mountain roads.', lat:10.0889, lng:77.0595 },
  { id: 8, name: 'Rishikesh', state: 'Uttarakhand', category: 'Trekking', image: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=900&q=85', distance: 'River and foothills', note: 'Riverside walks, forest trails, and mountain air.', lat:30.0869, lng:78.2676 },
  { id: 9, name: 'Goa', state: 'Goa', category: 'Beaches', image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=900&q=85', distance: 'Coastal escape', note: 'Golden beaches, old quarters, and slow evenings.', lat:15.2993, lng:74.124 },
  { id: 10, name: 'Jaipur', state: 'Rajasthan', category: 'Heritage', image: 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=900&q=85', distance: 'Pink City', note: 'Palaces, courtyards, and stories in rose-colored stone.', lat:26.9124, lng:75.7873 },
  { id: 11, name: 'Spiti Valley', state: 'Himachal Pradesh', category: 'Mountains', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85', distance: 'High desert', note: 'Remote villages and vast Himalayan horizons.', lat:32.246, lng:78.034 },
  { id: 12, name: 'Gokarna', state: 'Karnataka', category: 'Beaches', image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=85', distance: 'Quiet coastline', note: 'A slower stretch of coast, coves, and cliff paths.', lat:14.5479, lng:74.3188 }
];
export const categories = [
  { name: 'Trekking', icon: '⛰', image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=500&q=80' },
  { name: 'Waterfalls', icon: '◌', image: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=500&q=80' },
  { name: 'Beaches', icon: '≈', image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=500&q=80' },
  { name: 'Heritage', icon: '⌂', image: 'https://images.unsplash.com/photo-1600100397608-f0107c8a1d1b?auto=format&fit=crop&w=500&q=80' },
  { name: 'Mountains', icon: '△', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=500&q=80' },
  { name: 'Nature', icon: '✳', image: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=500&q=80' },
];
