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

export const instanceArray: string[] = [
  'https://invidious.jing.rocks/api/v1/videos/',
  'https://inv.nadeko.net/api/v1/videos/',
  'https://yt.drgnz.club/api/v1/videos/',
  'https://invidious.privacyredirect.com/api/v1/videos/',
  'https://invidious.catspeed.cc/api/v1/videos',
  'https://inv.qilk.de/api/v1/videos',
  'https://invi.susurrando.com/api/v1/videos'
];

