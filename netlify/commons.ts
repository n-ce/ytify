
const host = 'ytstream-download-youtube-videos.p.rapidapi.com';
export const fetcher = (cgeo: string, keys: string[], id: string): Promise<{
  title: string,
  channelTitle: string,
  channelId: string,
  lengthSeconds: number,
  isLiveContent: boolean,
  adaptiveFormats: {
    mimeType: string,
    url: string,
    bitrate: number,
    contentLength: string
  }[]
}> => fetch(`https://${host}/dl?id=${id}&cgeo=${cgeo}`, {
  headers: {
    'X-RapidAPI-Key': <string>keys.shift(),
    'X-RapidAPI-Host': host
  }
})
  .then(res => res.json())
  .then(data => {
    if (data && 'adaptiveFormats' in data && data.adaptiveFormats.length)
      return data;
    else throw new Error(data.message);
  })
  .catch(() => fetcher(cgeo, keys, id));


export function convertSStoHHMMSS(seconds: number): string {
  if (seconds < 0) return '';
  const hh = Math.floor(seconds / 3600);
  seconds %= 3600;
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60);
  let mmStr = String(mm);
  let ssStr = String(ss);
  if (mm < 10) mmStr = '0' + mmStr;
  if (ss < 10) ssStr = '0' + ssStr;
  return (hh > 0 ?
    hh + ':' : '') + `${mmStr}:${ssStr}`;
}

export function shuffle(array: string[]) {
  let currentIndex = array.length;

  while (currentIndex != 0) {

    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}
