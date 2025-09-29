import { playerStore } from '@lib/stores';
import { config } from './config';


// Generates both channel and stream thumbnails


export function generateImageUrl(
  id: string,
  res: string,
  music?: boolean
) {
  const proxy = 'https://wsrv.nl?url=https://';
  let suffix = '';
  let prefix = '';
  if (id.startsWith('/')) {
    prefix = `yt3.googleusercontent.com${id}=s720-c-k-c0x00ffffff-no-rj`;
    suffix = `&output=webp&w=${res === 'mq' ? '180' : '360'}`;
  }
  else {
    prefix = `i.ytimg.com/vi_webp/${id}/${res}default.webp`;
    if (music) {
      const s = res === 'mq' ? '180' : '720';
      suffix = `&w=${s}&h=${s}&fit=cover`;
    }
  }
  return proxy + prefix + suffix;
}



export function getThumbIdFromLink(url: string) {

  if (url.startsWith('/vi_webp'))
    url = url.slice(9, 20);

  // for featured playlists
  if (url.startsWith('/') || url.length === 11) return url;
  // simplify url 
  if (url.includes('wsrv.nl'))
    url = url.replace('https://wsrv.nl?url=', '');

  const l = new URL(url);
  const p = l.pathname;

  return l.search.includes('ytimg') ?
    p.split('/')[2] :
    p.split('=')[0];
}

const style = document.documentElement.style;
const cssVar = style.setProperty.bind(style);
const tabColor = <HTMLMetaElement>document.head.children.namedItem('theme-color');
const systemDark = matchMedia('(prefers-color-scheme:dark)');


function accentDarkener(r: number, g: number, b: number) {

  let min = Math.min(r, g, b);

  if ((r + g + b) / min > 14) {
    r = Math.floor(r / 3);
    g = Math.floor(g / 3);
    b = Math.floor(b / 3);
    min = Math.floor(min / 3);
  }
  return `rgb(${r - min}, ${g - min},${b - min})`;

}


const palette = {
  light: {
    bg: '#fff',
    text: '#000',
    multiplier: '1.1',
  },
  dark: {
    bg: '#000',
    text: '#fff',
    multiplier: '0.9'
  }
};


function colorInjector(colorArray: number[]) {
  const autoDark = systemDark.matches;
  Promise.resolve()
    .then(() => {
      const { theme } = config;
      const scheme = theme === 'auto' ?
        autoDark ? 'dark' : 'light' : theme;

      const [r, g, b] = colorArray;
      // init color
      if (r + g + b !== 710)
        cssVar('--chroma', '1');

      cssVar('--trueBg', scheme === 'light' ? 'var(--scheme)' : 'var(--bg)');

      cssVar('--source', accentDarkener(r, g, b));
      cssVar('--bg', palette[scheme].bg);
      cssVar('--schemeMultiplier', palette[scheme].multiplier);
      cssVar('--text', palette[scheme].text);
      tabColor.content = palette[scheme].bg;
    });
}



export function themer() {
  const initColor = '245, 245, 220';
  const { stream } = playerStore;
  const { loadImage } = config;
  if (loadImage && stream.id)
    import('../modules/extractColorFromImage')
      .then(mod => mod.default)
      .then(e => e(generateImageUrl(stream.id, 'mq'), true))
      .then(colorInjector);
  else
    colorInjector(
      initColor
        .split(',')
        .map(s => parseInt(s))
    );

}

if (config.roundness !== '0.4rem')
  cssVar('--roundness', config.roundness);



systemDark.addEventListener('change', themer);

export { cssVar };

