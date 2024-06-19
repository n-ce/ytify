import { extractColorsFromImageData } from "extract-colors";
import { canvas, context, audio } from "../lib/dom";
import { generateImageUrl } from "../lib/imageUtils";
import { getSaved, params } from "../lib/utils";
import { FinalColor } from "extract-colors/lib/types/Color";

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



function colorInjector(colorArray: FinalColor[]) {
  const autoDark = systemDark.matches;
  const theme = getSaved('theme') || 'auto';

  const scheme = theme === 'auto' ?
    autoDark ? 'dark' : 'light' :
    theme === 'auto-hc' ?
      autoDark ? 'black' : 'white' : theme;

  const c = colorArray
    .filter(v => v.saturation > 0.1)
    .sort((a, b) => (b.area / b.lightness) / b.saturation - (a.area / a.lightness))[0];

  const [r, g, b] = [
    c?.red || colorArray[0].red,
    c?.green || colorArray[0].green,
    c?.blue || colorArray[0].blue
  ];

  cssVar('--bg', palette[scheme].bg(r, g, b));
  cssVar('--onBg', palette[scheme].onBg);
  cssVar('--text', palette[scheme].text);
  cssVar('--borderColor', palette[scheme].borderColor(r, g, b));
  cssVar('--shadowColor', palette[scheme].shadowColor);
  tabColor.content = palette[scheme].bg(r, g, b);
}


function themer() {
  const id = audio.dataset.id || params.get('s');

  if (!id) {
    // intentional otherwise too fast to detect localStorage changes from events
    setTimeout(() => colorInjector([{
      'red': 127,
      'blue': 127,
      'green': 127,
      'hex': '',
      'area': 1,
      'hue': 0,
      'saturation': 1,
      'lightness': 1,
      'intensity': 1
    }]));
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


    colorInjector(
      extractColorsFromImageData(
        context.getImageData(
          0, 0, side, side
        )
      )
    );

  }
  canvasImg.crossOrigin = '';
  const temp = generateImageUrl(id);
  if (canvasImg.src !== temp) canvasImg.src = temp;


}



systemDark.addEventListener('change', themer);

export { themer, cssVar };






