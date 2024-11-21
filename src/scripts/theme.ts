import type { FinalColor } from 'extract-colors/lib/types/Color';
import { generateImageUrl } from '../lib/imageUtils';
import { store, getSaved } from '../lib/store';

const style = document.documentElement.style;
const cssVar = style.setProperty.bind(style);
const tabColor = <HTMLMetaElement>document.head.children.namedItem('theme-color');
const systemDark = matchMedia('(prefers-color-scheme:dark)');

const translucent = (r: number, g: number, b: number) => `rgb(${r},${g},${b},${0.5})`;

const accentLightener = (r: number, g: number, b: number) => `rgb(${[r, g, b].map(v => v + (204 - Math.max(r, g, b))).join(',')})`;

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
    .then(() => getSaved('theme') || 'auto')
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



function themer() {
  const initColor = '127,127,127';
  const custom = getSaved('custom_theme') || (store.player.legacy ? initColor : '');

  store.stream.id && !custom ?

    import('extract-colors/lib/worker-wrapper').then(mod => mod.extractColors(
      generateImageUrl(store.stream.id, 'mq'),
      {
        crossOrigin: 'anonymous',
        distance: 0
      }
    )
      .then(array => (array as FinalColor[])
        .filter(c => c.saturation > 0.2 && c.saturation < 0.8)
        .sort((a, b) => b.area - a.area)[0]
      )
      .then(_ => colorInjector([
        _.red,
        _.green,
        _.blue
      ]))
      .catch(console.error)) :

    colorInjector(
      (custom || initColor)
        .split(',')
        .map(s => parseInt(s))
    );
}



systemDark.addEventListener('change', themer);

export { themer, cssVar };






