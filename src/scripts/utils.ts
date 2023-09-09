export const params = (new URL(location.href)).searchParams;

export const save = localStorage.setItem.bind(localStorage);

export const getSaved = localStorage.getItem.bind(localStorage);

export function convertSStoHHMMSS(seconds: number): string {
  const hh = Math.floor(seconds / 3600);
  seconds %= 3600;
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60);
  let mmStr = String(mm);
  let ssStr = String(ss);
  if (mm < 10) mmStr = '0' + mmStr;
  if (ss < 10) ssStr = '0' + ssStr;
  return hh > 0 ?
    `${hh}:${mmStr}:${ssStr}` :
    `${mmStr}:${ssStr}`;
}

export const viewsFormatter = (views: number): string => Intl.NumberFormat('en', { notation: 'compact' }).format(views) + ' views';

export function unixTsFMT(timestamp: number): string {
  const seconds = (+new Date() - +new Date(timestamp)) / 1000;

  const string =
    seconds < 3600 ?
      `${Math.floor(seconds / 60)} minute` :
      seconds < 86400 ?
        `${Math.floor(seconds / 3600)} hour` :
        seconds < 604800 ?
          `${Math.floor(seconds / 86400)} day` :
          seconds < 2628000 ?
            `${Math.floor(seconds / 604800)} week` :
            seconds < 31536000 ?
              `${Math.floor(seconds / 2628000)} month` :
              `${Math.floor(seconds / 31536000)} year`;

  return `${string}${string.startsWith('1 ') ? ' ' : 's'} ago`;
}

