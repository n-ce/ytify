import { canvas, context, audio } from "../lib/dom";
import { generateImageUrl } from "../lib/imageUtils";
import { getSaved, params } from "../lib/utils";


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
  }
  /*,
  hide_seek: {
    bg: () => '#7b3f00',
    onBg: '#4b0082',
    text: '#000',
    borderColor: () => '#000',
    shadowColor: '#0004'
  },
  black: {
    bg: () => '#000',
    onBg: 'transparent',
    text: '#fff',
    borderColor: accentLightener,
    shadowColor: 'transparent'
  },
  sepia: {
    bg: () => '#704214',
    onBg: '#fff4',
    text: '#0007',
    borderColor: () => '#0003',
    shadowColor: '#0004'
  },
  whatsapp: {
    bg: () => 'linear-gradient(mediumseagreen,seagreen)',
    onBg: '#fffa',
    text: '#030',
    borderColor: () => '#030',
    shadowColor: '#0004'
  },
  sun: {
    bg: () => 'radial-gradient(red,yellow)',
    onBg: '#fff7',
    text: '#000',
    borderColor: () => '#000',
    shadowColor: '#0004'
  }*/
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



    const colorMap: { [index: string]: number } = {
      '0-0-0': 0
    };
    let color: number[] = [];
    let maxVal = 0;
    const accuracy = 80;

    for (let i = 0; i < len; i += accuracy) {

      const c = [data[i], data[i + 1], data[i + 2]];
      const prop = c.join('-');
      const cmp = prop in colorMap ? colorMap[prop] : 0;
      for (const key in colorMap) {
        const ka = key.split('-').map(s => parseInt(s));

        colorMap[prop] = (
          ka.every((v, j) => Math.abs(v - c[j]) > 10)
            ? cmp : 0) + 1;

        if (i + accuracy === len) {
          const val = colorMap[key];
          if (val > maxVal) {
            maxVal = val;
            color = ka
          }
        }
      }

    }


    /*
    for light theme 
    we must look for the most brightest dominant color group 
    
    check if it is light enough else lighten it up
    
    
    1. Brighest dominant color group extractor
    2. isLightEnough
    3. 
    */


    const [r, g, b] = color;

    const theme = getSaved('theme') || 'auto';
    const autoDark = systemDark.matches;


    const scheme = theme === 'auto' ?
      autoDark ? 'dark' : 'light' :
      theme === 'auto-hc' ?
        autoDark ? 'black' : 'white' : theme;



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



systemDark.addEventListener('change', themer);

export { themer, cssVar };






