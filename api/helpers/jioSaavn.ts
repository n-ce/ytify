import { DES } from 'crypto-es/dist/des.mjs';
import { Utf8, Base64 } from 'crypto-es/dist/core.mjs';
import { ECB } from 'crypto-es/dist/mode-ecb.mjs';
import { Pkcs7 } from 'crypto-es/dist/pad-pkcs7.mjs';

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
 * Decrypts JioSaavn media URLs using pure TypeScript (crypto-es).
 */
export const createDownloadLinks = (encryptedMediaUrl: string): string => {
  if (!encryptedMediaUrl) return "";

  const key = '38346591';

  try {
    // 1. Prepare key and ciphertext
    // Using named exports directly avoids the 'Namespace' missing property error
    const keyHex = enc.Utf8.parse(key);
    const cipherText = enc.Base64.parse(encryptedMediaUrl);

    // 2. Decrypt with DES-ECB
    // We cast the object as 'any' here specifically because the crypto-es 
    // internal types for CipherParams are incompatible with a simple object literal
    const decrypted = DES.decrypt(
      { ciphertext: cipherText } as any,
      keyHex,
      {
        mode: mode.ECB,
        padding: pad.Pkcs7,
      }
    );

    // 3. Convert result to UTF-8
    const decryptedText = decrypted.toString(enc.Utf8);
    if (!decryptedText) return "";

    const cleanLink = decryptedText.trim();
    
    // Ensure the link is served over HTTPS
    return cleanLink.startsWith('http') ? cleanLink.replace('http:', 'https:') : "";
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
