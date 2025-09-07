import { playerStore } from '../stores';
import { config } from './config';


// Generates both channel and stream thumbnails


export const generateImageUrl = (
  id: string,
  res: string,
  music: string = ''
) => 'https://wsrv.nl?url=https://' + (id.startsWith('/') ?
  `yt3.googleusercontent.com${id}=s720-c-k-c0x00ffffff-no-rj&output=webp&w=${res === 'mq' ? '180' : '360'}` :
  `i.ytimg.com/vi_webp/${id}/${res}default.webp${music}`);



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

const translucent = (r: number, g: number, b: number) => `rgb(${r},${g},${b},${0.5})`;

const accentLightener = (r: number, g: number, b: number) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const l = Math.max(r, g, b);
  const s = l - Math.min(r, g, b);
  const h = s
    ? l === r
      ? (g - b) / s
      : l === g
        ? 2 + (b - r) / s
        : 4 + (r - g) / s
    : 0;

  const hue = 60 * h < 0 ? 60 * h + 360 : 60 * h;
  const saturation = 100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0);
  return `hsl(
    ${Math.floor(hue)},
    ${Math.floor(saturation)}%,
    80%)`;
}
// previous algorithm
// `rgb(${[r, g, b].map(v => v + (204 - Math.max(r, g, b))).join(',')})`;




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

const palette: Scheme = {
  light: {
    bg: accentLightener,
    onBg: '#fff3',
    text: '#000b',
    borderColor: translucent,
    shadowColor: '#0002'
  },
  dark: {
    bg: accentDarkener,
    onBg: '#fff1',
    text: '#fffb',
    borderColor: translucent,
    shadowColor: 'transparent'
  },
  white: {
    bg: () => '#fff',
    onBg: 'transparent',
    text: '#000',
    borderColor: accentDarkener,
    shadowColor: '#0002'
  },
  black: {
    bg: () => '#000',
    onBg: 'transparent',
    text: '#fff',
    borderColor: accentLightener,
    shadowColor: 'transparent'
  }
};


function colorInjector(colorArray: number[]) {
  const autoDark = systemDark.matches;
  Promise.resolve()
    .then(() => config.theme || 'auto')
    .then(theme => {

      const scheme = theme === 'auto' ?
        autoDark ? 'dark' : 'light' :
        theme === 'auto-hc' ?
          autoDark ? 'black' : 'white' : theme;

      const [r, g, b] = colorArray;

      cssVar('--bg', palette[scheme].bg(r, g, b));
      cssVar('--onBg', palette[scheme].onBg);
      cssVar('--text', palette[scheme].text);
      cssVar('--borderColor', palette[scheme].borderColor(r, g, b));
      cssVar('--shadowColor', palette[scheme].shadowColor);
      tabColor.content = palette[scheme].bg(r, g, b);
    });
}



export function themer() {
  const initColor = '127,127,127';
  const { stream } = playerStore;
  const { customColor, loadImage } = config;
  if (loadImage && stream.id && !customColor)
    import('../modules/extractColorFromImage')
      .then(mod => mod.default)
      .then(e => e(generateImageUrl(stream.id, 'mq'), true))
      .then(colorInjector);
  else
    colorInjector(
      (customColor || initColor)
        .split(',')
        .map(s => parseInt(s))
    );

}

if (config.roundness !== '0.4rem')
  cssVar('--roundness', config.roundness);

if (config.font !== 'system-ui')
  cssVar('--font', `var(--font-${config.font})`);

systemDark.addEventListener('change', themer);

export { cssVar };

