import crypto from 'node:crypto';


export const createDownloadLinks = (encryptedMediaUrl: string) => {
  if (!encryptedMediaUrl) return '';

  const key = '38346591';
  // Node.js requires a 8-byte buffer for DES keys
  const keyBuffer = Buffer.from(key, 'utf8');

  const decipher = crypto.createDecipheriv('des-ecb', keyBuffer, null);

  // Set padding to true (default) because Saavn uses PKCS7 padding
  decipher.setAutoPadding(true);

  let decrypted = decipher.update(encryptedMediaUrl, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted.replace('http:', 'https:');
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
