// backend/services/rapid_api.ts

import { shuffle } from '../utils.js'; // Assuming shuffle is in backend/utils.ts

const RAPID_API_HOST = 'yt-api.p.rapidapi.com';

export const fetchStreamData = async (cgeo: string, keys: string[], id: string): Promise<{
  title: string,
  channelTitle: string,
  authorId: string,
  lengthSeconds: number,
  isLiveContent: boolean,
  adaptiveFormats: {
    mimeType: string,
    url: string,
    bitrate: number,
    contentLength: string,
    qualityLabel: string
  }[]
}> => {
  // Shuffle keys here or before calling this function, based on preference.
  // For now, mirroring the original behavior where it's shuffled once per request.
  const shuffledKeys = [...keys]; // Create a copy to avoid modifying original array
  shuffle(shuffledKeys);

  return fetch(`https://${RAPID_API_HOST}/dl?id=${id}&cgeo=${cgeo}`, {
    headers: {
      'X-RapidAPI-Key': <string>shuffledKeys.shift(), // Use a key from the shuffled list
      'X-RapidAPI-Host': RAPID_API_HOST
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data && 'adaptiveFormats' in data && data.adaptiveFormats.length)
        return data;
      else throw new Error(data.message);
    })
    .catch(() => {
        // If the first key fails, try with the next one until keys run out
        if (shuffledKeys.length > 0) {
            return fetchStreamData(cgeo, shuffledKeys, id); // Recursive call with remaining keys
        }
        throw new Error('All RapidAPI keys failed or no data found.');
    });
};
