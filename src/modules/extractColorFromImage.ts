import { $ } from '../lib/utils';

export async function extractColorFromImage(src: string, useOffscreenCanvas: boolean): Promise<number[]> {

  const canvas = useOffscreenCanvas ?
    new OffscreenCanvas(512, 512) :
    <HTMLCanvasElement>$('canvas');
  const context = <OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D>canvas.getContext('2d', { alpha: false });

  const canvasImg = new Image();

  await new Promise((resolve, reject) => {
    canvasImg.onload = resolve;
    canvasImg.onerror = reject;
    canvasImg.crossOrigin = '';
    canvasImg.src = src;
  });

  const height = canvasImg.height;
  const width = canvasImg.width;
  const side = Math.floor(Math.min(width, height));
  canvas.width = canvas.height = side;

  const offsetX = Math.floor((width - side) / 2);
  const offsetY = Math.floor((height - side) / 2);
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

  return [r, g, b];
}
