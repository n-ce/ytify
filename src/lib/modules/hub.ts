
type Hublist = List & {
  frequency?: number;
}

type Hub = {
  discovery: { [index: string]: CollectionItem & { frequency: number } };
  playlists: { [index: string]: Hublist & { uploader: string } };
  artists: { [index: string]: Hublist };
  foryou: { [index: string]: CollectionItem & { frequency: number } };
  catchup: { [index: string]: CollectionItem };
};

const HUB_STORAGE_KEY = 'hub';

const initialHub: Hub = {
  discovery: {},
  playlists: {},
  artists: {},
  foryou: {},
  catchup: {},
};

export function getHub(): Hub {
  const hubData = localStorage.getItem(HUB_STORAGE_KEY);
  return hubData ? JSON.parse(hubData) : initialHub;
}

export function updateHub(data: Hub): void {
  localStorage.setItem(HUB_STORAGE_KEY, JSON.stringify(data));
}

export function getHubSection<K extends keyof Hub>(sectionName: K): Hub[K] {
  const hub = getHub();
  return hub[sectionName];
}

export function updateHubSection<K extends keyof Hub>(sectionName: K, data: Hub[K]): void {
  const hub = getHub();
  hub[sectionName] = data;
  updateHub(hub);
}

export function clearHubSection(sectionName: keyof Hub): void {
  const hub = getHub();
  const newSection = initialHub[sectionName];
  const newHub: Hub = {
    ...hub,
    [sectionName]: newSection,
  };
  updateHub(newHub);
}
