import crypto from 'node-forge';

export const createDownloadLinks = (encryptedMediaUrl: string) => {
  if (!encryptedMediaUrl) return [];

  const key = '38346591';
  const iv = '00000000';

  const encrypted = crypto.util.decode64(encryptedMediaUrl);
  const decipher = crypto.cipher.createDecipher('DES-ECB', crypto.util.createBuffer(key));
  decipher.start({ iv: crypto.util.createBuffer(iv) });
  decipher.update(crypto.util.createBuffer(encrypted));
  decipher.finish();
  const decryptedLink = decipher.output.getBytes();

  return decryptedLink.replace('http:', 'https:'); // Ensure https
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