import { canvas, context, img } from "./dom";



img.onload = () => img.naturalWidth === 120 ? img.src = img.src.replace('maxres', 'mq').replace('.webp', '.jpg').replace('vi_webp', 'vi') : '';

img.onerror = () => img.src.includes('max') ? img.src = img.src.replace('maxres', 'mq') : '';


export const blankImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Generates both channel and stream thumbnails
export const generateImageUrl = (
  id: string,
  res: string = 'mqdefault'
) => 'https://wsrv.nl/' + (id.startsWith('/') ?
  `yt3.googleusercontent.com${id}=s176-c-k-c0x00ffffff-no-rj` :
  `i.ytimg.com/vi_webp/${id}/${res}.webp`);

// Square Image Generator 
export function sqrThumb(canvasImg: HTMLImageElement) {
  const width = canvasImg.width;
  const height = canvasImg.height;
  const side = Math.min(width, height);
  canvas.width = side;
  canvas.height = side;
  // centre the selection
  const offsetX = (width - side) / 2;
  const offsetY = (height - side) / 2;
  context.drawImage(canvasImg, offsetX, offsetY, side, side, 0, 0, side, side);
  return canvas.toDataURL();
}
