import { createDecipheriv } from 'crypto';

export const createDownloadLinks = (encryptedMediaUrl: string): string => {
  if (!encryptedMediaUrl) return '';

  const key = '38346591';
  
  try {
    const decipher = createDecipheriv('des-ecb', key, '');
    let decrypted = decipher.update(encryptedMediaUrl, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted.replace('http:', 'https:');
  } catch (e) {
    console.error("Decryption failed:", e);
    return '';
  }
};

export const createArtistMapPayload = (artist: any) => ({
  id: artist.id,
  name: artist.name,
  role: artist.role,
  type: artist.type,
  url: artist.perma_url
});

export const createSongPayload = (song: any) => ({
  id: song.id,
  name: song.title,
  duration: song.more_info?.duration ? Number(song.more_info?.duration) : null,
  artists: {
    primary: song.more_info?.artistMap?.primary_artists?.map(createArtistMapPayload),
    featured: song.more_info?.artistMap?.featured_artists?.map(createArtistMapPayload),
    all: song.more_info?.artistMap?.artists?.map(createArtistMapPayload)
  },
  downloadUrl: createDownloadLinks(song.more_info?.encrypted_media_url)
});
