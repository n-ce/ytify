// Library type definitions

export interface Meta {
  version: number;
  tracks: number;
  [collectionName: string]: number;
}

export interface Track {
  [key: string]: unknown;
}

export interface TrackMap {
  [id: string]: Track;
}

export interface LibrarySnapshot {
  meta?: Meta;
  tracks?: TrackMap;
  [collectionName: string]: unknown;
}

export interface DeltaPayload {
  meta: Meta;
  addedOrUpdatedTracks: TrackMap;
  deletedTrackIds: string[];
  updatedCollections: { [collectionName: string]: unknown };
  deletedCollectionNames: string[];
}

export interface LibraryWithMeta {
  data: LibrarySnapshot;
  etag: string;
}

export interface SyncPullResponse {
  serverMeta: Meta;
  delta: DeltaPayload | null;
  fullSyncRequired: boolean;
  isFullTrackSync: boolean;
}
