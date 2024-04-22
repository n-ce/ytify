import { img, canvas, context } from "../lib/dom";
import { blankImage } from "../lib/imageUtils";
import player from "../lib/player";
import { getSaved, idFromURL, params, removeSaved, save } from "../lib/utils";


const style = document.documentElement.style;
const cssVar = style.setProperty.bind(style);
const tabColor = <HTMLMetaElement>document.head.children.namedItem('theme-color');
const themeSelector = <HTMLSelectElement>document.getElementById('themeSelector');
const systemDark = matchMedia('(prefers-color-scheme:dark)');
const highContrastSwitch = <HTMLSelectElement>document.getElementById('highContrastSwitch');

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
    if (canvasImg.width === 120) return;
    canvas.height = canvasImg.height;
    canvas.width = canvasImg.width;
    context.drawImage(canvasImg, 0, 0);

    const data = context.getImageData(0, 0, canvasImg.width, canvasImg.height).data;
    const len = data.length;

    const nthPixel = 40; // sweet spot for getting high performance and accuracy

    let r = 0, g = 0, b = 0;

    for (let i = 0; i < len; i += nthPixel) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    const amount = len / nthPixel;
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
  canvasImg.src = img.src;
}

highContrastSwitch.addEventListener('click', () => {
  getSaved('highContrast') ?
    removeSaved('highContrast') :
    save('highContrast', 'true');
  themer();
})

if (getSaved('highContrast'))
  highContrastSwitch.toggleAttribute('checked');



themeSelector.addEventListener('change', () => {
  themer();
  themeSelector.value === 'auto' ?
    removeSaved('theme') :
    save('theme', themeSelector.value);
});


themeSelector.value = getSaved('theme') || 'auto';

img.addEventListener('load', themer);

systemDark.addEventListener('change', themer);



const roundnessChanger = <HTMLSelectElement>document.getElementById('roundnessChanger');
if (getSaved('roundness')) {
  roundnessChanger.value = getSaved('roundness') || '2vmin';
  cssVar('--roundness', roundnessChanger.value);
}

roundnessChanger.addEventListener('change', () => {
  cssVar('--roundness', roundnessChanger.value);
  roundnessChanger.value === '2vmin' ?
    removeSaved('roundness') :
    save('roundness', roundnessChanger.value)
})


const streamQuery = params.get('s') || idFromURL(params.get('url') || params.get('text'));

streamQuery ? player(streamQuery) : getSaved('img') ? img.src = blankImage : themer();
