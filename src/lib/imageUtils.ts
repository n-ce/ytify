import { canvas, context, img } from "./dom";
import { getApi } from "./utils";



export const blankImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Generates both channel and stream thumbnails
export const generateImageUrl = (
  id: string,
  res: string = 'mq',
  proxy: string = getApi('image')
) => proxy + (id.startsWith('/') ?
  `${id}=s${res === 'maxres' ? 720 : 176}-c-k-c0x00ffffff-no-rj?host=yt3.googleusercontent.com` :
  `/vi_webp/${id}/${res}default.webp?host=i.ytimg.com`);

// Square Image Generator 
export function sqrThumb(src: string): Promise<string> {

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      const width = img.width;
      const height = img.height;
      const side = Math.min(width, height);
      canvas.width = side;
      canvas.height = side;
      const offsetX = (width - side) / 2;
      const offsetY = (height - side) / 2;
      context.drawImage(img, offsetX, offsetY, side, side, 0, 0, side, side);
      resolve(URL.createObjectURL(new Blob([await canvas.convertToBlob()])));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.crossOrigin = '';
    img.src = src;
  });
}


export function getThumbIdFromLink(url: string) {
  // for featured playlists
  if (url.startsWith('/') || url.length === 11) return url;

  const l = new URL(url);
  const p = l.pathname;

  return l.search.includes('ytimg') ?
    p.split('/')[2] :
    p.split('=')[0];
}



img.onload = () => img.naturalWidth === 120 ? img.src = img.src.replace('maxres', 'mq').replace('.webp', '.jpg').replace('vi_webp', 'vi') : '';

img.onerror = () => img.src.includes('max') ? img.src = img.src.replace('maxres', 'mq') : '';

img.src = blankImage;

