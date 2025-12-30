import CryptoJS from 'crypto-es';

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
 * Decrypts Saavn's encrypted media URL using pure TypeScript (crypto-es).
 */
export const createDownloadLinks = (encryptedMediaUrl: string): string => {
  if (!encryptedMediaUrl) return "";

  const key = '38346591';

  try {
    // 1. Prepare the key as a WordArray using CryptoJS.enc
    const keyHex = CryptoJS.enc.Utf8.parse(key);

    // 2. Decrypt using DES-ECB with PKCS7 padding
    const decrypted = CryptoJS.DES.decrypt(
      { 
        // @ts-ignore - crypto-es types can be finicky with CipherParams
        ciphertext: CryptoJS.enc.Base64.parse(encryptedMediaUrl) 
      },
      keyHex,
      {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    // 3. Convert result to UTF-8 string
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

    // 4. Clean and return the URL
    const cleanLink = decryptedText.trim();
    if (!cleanLink.startsWith('http')) return "";
    
    return cleanLink.replace('http:', 'https:');
  } catch (error) {
    console.error("TypeScript Decryption Error:", error);
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
