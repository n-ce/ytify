import { canvas, context } from "../lib/dom";
import { generateImageUrl } from "../lib/imageUtils";
import { store, getSaved } from "../store";

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
    ${80}%)`;
}

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
  const theme = getSaved('theme') || 'auto';

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
}


function themer() {

  if (!store.stream.id) {
    // intentional otherwise too fast to detect localStorage changes from events
    setTimeout(() => colorInjector([127, 127, 127]));
    return;
  }

  const canvasImg = new Image();
  canvasImg.onload = () => {

    const height = canvasImg.height;
    const width = canvasImg.width;
    const side = Math.min(width, height);
    canvas.width = canvas.height = side;

    const offsetX = (width - side) / 2;
    const offsetY = (height - side) / 2;
    context.drawImage(canvasImg, offsetX, offsetY, side, side, 0, 0, side, side);

    const data = context.getImageData(0, 0, side, side).data;
    const len = data.length;
    let r = 0, g = 0, b = 0;

    for (let i = 0; i < len; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    const amount = len / 4;
    r = Math.floor(r / amount),
      g = Math.floor(g / amount),
      b = Math.floor(b / amount);

    colorInjector([r, g, b]);

  }
  canvasImg.crossOrigin = '';
  const temp = generateImageUrl(store.stream.id, 'mq');
  if (canvasImg.src !== temp) canvasImg.src = temp;


}



systemDark.addEventListener('change', themer);

export { themer, cssVar };






