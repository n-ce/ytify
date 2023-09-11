export default function theme(
  img: HTMLImageElement,
  getSaved: (key: string) => string | null,
  save: (key: string, value: string) => void
) {


  // dynamic values

  const accent = (r: number, g: number, b: number) => `rgb(${r},${g},${b})`;
  const bgDark = (r: number, g: number, b: number) => {
    const [rd, gd, bd] = accentDarkener(r, g, b);
    return `rgb(${rd},${gd},${bd})`;
  }
  const accentDark = (r: number, g: number, b: number) => `rgb(${r},${g},${b},${0.5})`;

  // for now type:any due to complex type structure requirement
  const palette: any = {
    light: {
      bg: accent,
      onBg: '#fff4',
      text: '#000b',
      borderColor: () => '#000b',
      shadowColor: '#0002'
    },
    dark: {
      bg: bgDark,
      onBg: '#fff1',
      text: '#fffb',
      borderColor: accentDark,
      shadowColor: 'transparent'
    },
    white: {
      bg: () => '#fff',
      onBg: 'transparent',
      text: '#000',
      borderColor: accent,
      shadowColor: '#0002'
    },
    black: {
      bg: () => '#000',
      onBg: 'transparent',
      text: '#fff',
      borderColor: accent,
      shadowColor: 'transparent'
    }
  };

  const style = document.documentElement.style;
  const cssVar = style.setProperty.bind(style);
  const tabColor = <HTMLMetaElement>document.head.children.namedItem('theme-color');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const themeSelector = <HTMLSelectElement>document.getElementById('themeSelector');
  const highContrastSwitch = document.getElementById('highContrastSwitch');

  if (getSaved('highContrast'))
    highContrastSwitch?.toggleAttribute('checked');


  const lst = getSaved('theme');
  if (lst)
    themeSelector.options[['auto', 'light', 'dark'].indexOf(lst)].selected = true;

  function accentDarkener(
    r: number, g: number, b: number
  ): number[] {
    const min = Math.min(r, g, b);
    return [r - min, g - min, b - min]
  }

  function schemeResolver() {
    const theme = themeSelector.selectedOptions[0].value;
    let light = 'light', dark = 'dark';
    if (getSaved('highContrast'))
      light = 'white', dark = 'black'
    return theme === 'auto' ?
      (matchMedia('(prefers-color-scheme:dark') ? dark : light) :
      theme === 'light' ? light : dark;
  }

  function themer() {

    const scheme = schemeResolver();

    if (!context || !tabColor) return;

    const canvasImg = new Image();


    canvasImg.onload = () => {

      canvas.height = canvasImg.height;
      canvas.width = canvasImg.width;
      context.drawImage(canvasImg, 0, 0);

      const data = context.getImageData(0, 0, canvasImg.width, canvasImg.height).data;
      const len = data.length;
      const nthPixel = 40;

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


      // lighten color if too dark
      if ((r + g + b) < 85 || !r || !g || !b)
        r += 34, g += 34, b += 34;

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

  highContrastSwitch?.addEventListener('click', () => {
    getSaved('highContrast') ?
      localStorage.removeItem('highContrast') :
      save('highContrast', 'true');
    themer();
  })

  themeSelector.addEventListener('change', () => {
    themer();
    save('theme', themeSelector.value);
  });

  img.addEventListener('load', themer);

  themer();

}
