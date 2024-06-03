import { canvas, context, audio } from "../lib/dom";
import { generateImageUrl } from "../lib/imageUtils";
import { getSaved, params, removeSaved, save } from "../lib/utils";


const style = document.documentElement.style;
const cssVar = style.setProperty.bind(style);
const tabColor = <HTMLMetaElement>document.head.children.namedItem('theme-color');
const themeSelector = <HTMLSelectElement>document.getElementById('themeSelector');
const systemDark = matchMedia('(prefers-color-scheme:dark)');

const translucent = (r: number, g: number, b: number) => `rgb(${r},${g},${b},${0.5})`;


function accentLightener(r: number, g: number, b: number) {

  const $ = (_: number) => _ + (204 - Math.max(r, g, b));

  return `rgb(${$(r)}, ${$(g)},${$(b)})`;
}

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



function themer() {
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

    const theme = themeSelector.selectedOptions[0].value;
    let light = 'light', dark = 'dark';
    if (getSaved('highContrast'))
      light = 'white', dark = 'black';

    const scheme = theme === 'auto' ?
      (systemDark.matches ? dark : light) :
      theme === 'light' ? light : dark;


    cssVar('--bg', palette[scheme].bg(r, g, b));
    cssVar('--onBg', palette[scheme].onBg);
    cssVar('--text', palette[scheme].text);
    cssVar('--borderColor', palette[scheme].borderColor(r, g, b));
    cssVar('--shadowColor', palette[scheme].shadowColor);
    tabColor.content = palette[scheme].bg(r, g, b);
  }
  canvasImg.crossOrigin = '';
  const temp = generateImageUrl(audio.dataset.id || params.get('s') || '1SLr62VBBjw');
  if (canvasImg.src !== temp) canvasImg.src = temp;

}


themeSelector.addEventListener('change', () => {
  themer();
  themeSelector.value === 'auto' ?
    removeSaved('theme') :
    save('theme', themeSelector.value);
});

const savedTheme = getSaved('theme');
if (savedTheme)
  themeSelector.value = savedTheme;

systemDark.addEventListener('change', themer);

export { themer, cssVar };






