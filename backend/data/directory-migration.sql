-- Directory records that were added after the original directory import.
-- This is data migration SQL; the application reads the final records from MySQL.
INSERT IGNORE INTO states (name, is_union_territory) VALUES ('Andhra Pradesh', FALSE);

INSERT IGNORE INTO districts (state_id, name)
SELECT s.id, d.name FROM states s
JOIN (
  SELECT 'Alluri Sitharama Raju' AS name UNION ALL SELECT 'Anakapalli' UNION ALL SELECT 'Ananthapuramu'
  UNION ALL SELECT 'Annamayya' UNION ALL SELECT 'Bapatla' UNION ALL SELECT 'Dr. B.R. Ambedkar Konaseema'
  UNION ALL SELECT 'Eluru' UNION ALL SELECT 'Kakinada' UNION ALL SELECT 'Nandyal' UNION ALL SELECT 'NTR'
  UNION ALL SELECT 'Palnadu' UNION ALL SELECT 'Parvathipuram Manyam' UNION ALL SELECT 'Sri Potti Sriramulu Nellore'
  UNION ALL SELECT 'Sri Sathya Sai' UNION ALL SELECT 'Tirupati'
) d ON 1 = 1 WHERE s.name = 'Andhra Pradesh';

INSERT IGNORE INTO places (state_id, district_id, name, category, image, note, lat, lng, source, verified)
SELECT s.id, d.id, p.name, p.category, p.image, p.note, p.lat, p.lng, p.source, FALSE
FROM states s JOIN districts d ON d.state_id = s.id
JOIN (
  SELECT 'Ramakrishna Beach (RK Beach)' AS name, 'Beaches' AS category, 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=85' AS image, 'A popular city beach and seafront promenade.' AS note, 17.7126 AS lat, 83.3224 AS lng, 'Tourism catalogue seed' AS source, 'Visakhapatnam' AS district
  UNION ALL SELECT 'Rushikonda Beach','Beaches','https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=85','A scenic beach north of the city, known for its golden sand and coastal views.',17.7829,83.3858,'Tourism catalogue seed','Visakhapatnam'
  UNION ALL SELECT 'Yarada Beach','Beaches','https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=85','A green headland and beach landscape south of the city.',17.6533,83.2686,'Tourism catalogue seed','Visakhapatnam'
  UNION ALL SELECT 'Gangavaram Beach','Beaches','https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1200&q=85','A coastal stretch near the southern edge of the city.',17.6258,83.2247,'Tourism catalogue seed','Visakhapatnam'
  UNION ALL SELECT 'Bheemunipatnam Beach','Beaches','https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85','A historic coastal town with a long shoreline.',17.8904,83.4520,'Tourism catalogue seed','Visakhapatnam'
  UNION ALL SELECT 'Simhachalam Temple','Temples','https://images.unsplash.com/photo-1600100397608-f0107c8a1d1b?auto=format&fit=crop&w=1200&q=85','A major hilltop temple dedicated to Sri Varaha Lakshmi Narasimha Swamy.',17.7651,83.2506,'Tourism catalogue seed','Visakhapatnam'
  UNION ALL SELECT 'Sri Kanaka Mahalakshmi Temple','Temples','https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=85','A well-known city temple dedicated to Goddess Kanaka Mahalakshmi.',17.7068,83.3031,'Tourism catalogue seed','Visakhapatnam'
  UNION ALL SELECT 'ISKCON Visakhapatnam','Temples','https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1200&q=85','A Krishna temple and spiritual visitor destination.',17.7565,83.3502,'Tourism catalogue seed','Visakhapatnam'
  UNION ALL SELECT 'Kailasagiri','Nature & Viewpoints','https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=85','A hilltop park with broad views over the city and coastline.',17.7494,83.3426,'Tourism catalogue seed','Visakhapatnam'
  UNION ALL SELECT 'Tenneti Park','Nature & Viewpoints','https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1200&q=85','A seaside park with cliffside views and coastal walking areas.',17.7477,83.3532,'Tourism catalogue seed','Visakhapatnam'
  UNION ALL SELECT 'Kambalakonda Eco-Tourism Park','Trekking & Nature','https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=85','A forested eco-tourism area with nature trails.',17.7750,83.2500,'Tourism catalogue seed','Visakhapatnam'
  UNION ALL SELECT 'Dolphin’s Nose Viewpoint','Nature & Viewpoints','https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85','A prominent coastal headland overlooking the Bay of Bengal.',17.6850,83.2890,'Tourism catalogue seed','Visakhapatnam'
  UNION ALL SELECT 'Thotlakonda Buddhist Complex','Heritage','https://images.unsplash.com/photo-1600100397608-f0107c8a1d1b?auto=format&fit=crop&w=1200&q=85','A Buddhist archaeological site on a hill overlooking the coast.',17.8280,83.3840,'Tourism catalogue seed','Visakhapatnam'
  UNION ALL SELECT 'Bavikonda Buddhist Complex','Heritage','https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=85','An archaeological site associated with ancient Buddhist remains.',17.8350,83.3850,'Tourism catalogue seed','Visakhapatnam'
  UNION ALL SELECT 'INS Kursura Submarine Museum','Museums & Heritage','https://images.unsplash.com/photo-1566127992631-137a642a90f4?auto=format&fit=crop&w=1200&q=85','A naval museum built around a decommissioned submarine.',17.7193,83.3310,'Tourism catalogue seed','Visakhapatnam'
  UNION ALL SELECT 'TU-142 Aircraft Museum','Museums & Heritage','https://images.unsplash.com/photo-1569629743817-70d8db6c323b?auto=format&fit=crop&w=1200&q=85','An aviation museum featuring a decommissioned naval aircraft.',17.7195,83.3318,'Tourism catalogue seed','Visakhapatnam'
) p ON p.district = d.name WHERE s.name = 'Andhra Pradesh' AND d.name = 'Visakhapatnam';
