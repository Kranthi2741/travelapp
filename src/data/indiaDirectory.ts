export type DirectoryPlace = {
  name: string;
  district: string;
  category: string;
  image: string;
  note: string;
  lat?: number;
  lng?: number;
  source?: string;
  verified?: boolean;
};

export type DirectoryState = {
  name: string;
  districts: string[];
  places: DirectoryPlace[];
  isUnionTerritory?: boolean;
};

// Directory content is loaded from MySQL through GET /api/directory.
export let INDIA_DIRECTORY: DirectoryState[] = [];
export const directoryCounts = () => ({ states: INDIA_DIRECTORY.length, districts: INDIA_DIRECTORY.reduce((count, state) => count + state.districts.length, 0), samplePlaces: INDIA_DIRECTORY.reduce((count, state) => count + state.places.length, 0) });
export const setIndiaDirectory = (directory: DirectoryState[]) => { INDIA_DIRECTORY = directory; };
