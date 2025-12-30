import crypto from 'crypto';

// --- Interfaces ---

export interface SaavnArtist {
  id: string;
  name: string;
  role: string;
  type: string;
  perma_url: string;
}

export interface SaavnSong {
  id: string;
  title: string;
  more_info: {
    duration: string | number;
    encrypted_media_url: string;
    artistMap: {
      primary_artists: SaavnArtist[];
      featured_artists: SaavnArtist[];
      artists: SaavnArtist[];
    };
  };
}

export interface ArtistPayload {
  id: string;
  name: string;
  role: string;
  type: string;
  url: string;
}

export interface SongPayload {
  id: string;
  name: string;
  duration: number | null;
  artists: {
    primary: ArtistPayload[];
    featured: ArtistPayload[];
    all: ArtistPayload[];
  };
  downloadUrl: string;
}

// --- Logic ---

/**
 * Decrypts Saavn's DES-ECB encrypted media URL.
 * NOTE: Requires NODE_OPTIONS='--openssl-legacy-provider' on Node 17+
 */
export const createDownloadLinks = (encryptedMediaUrl: string): string => {
  if (!encryptedMediaUrl) return "";

  const key = '38346591';
  const algorithm = 'des-ecb';

  try {
    // ECB mode does not use an IV; an empty buffer is used to satisfy the API.
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'utf8'), Buffer.alloc(0));
    
    decipher.setAutoPadding(true);

    let decrypted = decipher.update(encryptedMediaUrl, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    // Remove null padding bytes (\0) and trim
    const cleanLink = decrypted.replace(/\0+$/, '').trim();

    if (!cleanLink.startsWith('http')) return "";
    
    return cleanLink.replace('http:', 'https:');
  } catch (error) {
    console.error("Decryption Error:", error);
    return "";
  }
};

export const createArtistMapPayload = (artist: SaavnArtist): ArtistPayload => ({
  id: artist.id,
  name: artist.name,
  role: artist.role,
  type: artist.type,
  url: artist.perma_url
});

export const createSongPayload = (song: SaavnSong): SongPayload => {
  const info = song.more_info;

  return {
    id: song.id,
    name: song.title,
    duration: info?.duration ? Number(info.duration) : null,
    artists: {
      primary: info?.artistMap?.primary_artists?.map(createArtistMapPayload) || [],
      featured: info?.artistMap?.featured_artists?.map(createArtistMapPayload) || [],
      all: info?.artistMap?.artists?.map(createArtistMapPayload) || []
    },
    downloadUrl: createDownloadLinks(info?.encrypted_media_url)
  };
};
