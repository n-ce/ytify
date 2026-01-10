export const idFromURL = (link: string | null) => link?.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i)?.[7];

export const fetchJson = async <T>(
  url: string,
  signal?: AbortSignal
): Promise<T> => fetch(url, { signal })
  .then(res => {
    if (!res.ok)
      throw new Error(`Network response was not ok: ${res.statusText}`);
    return res.json() as Promise<T>;
  });

export async function fetchUma(): Promise<string[]> {
  return fetch('https://raw.githubusercontent.com/n-ce/Uma/main/iv.txt')
    .then(res => res.text())
    .then(text => {
      let decompressedString = text;
      const decodePairs: Record<string, string> = {
        '$': 'invidious',
        '&': 'inv',
        '#': 'iv',
        '~': 'com'
      }

      for (const code in decodePairs) {
        const safeCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(safeCode, 'g');
        decompressedString = decompressedString.replace(regex, decodePairs[code]);
      }
      return decompressedString.split(',').map(i => `https://${i}`);
    });
}

export function convertSStoHHMMSS(seconds: number): string {
  if (seconds < 0) return '';
  if (seconds === Infinity) return 'Emergency Mode';
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

export const numFormatter = (num: number): string => Intl.NumberFormat('en', { notation: 'compact' }).format(num);
