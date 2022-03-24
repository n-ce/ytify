import { colorBtn, bgColor, bgColor2, elementColor, colorThief, img } from './constants.js';

if (img.complete) {
  colorThief.getColor(img);
} else {
  image.addEventListener('load', function() {
    colorThief.getColor(img);
  });
}

const pker = colorThief.getColor(img);
const pcol = `rgb(${pker[0]},${pker[1]},${pker[2]})`;


function defaultColor() {
  bgColor(pcol);
  bgColor2(pcol);
  elementColor('black');
}
defaultColor();

colorBtn[0].addEventListener('click', function() {
  defaultColor();
});

colorBtn[1].addEventListener('click', function() {
  bgColor('orange');
  bgColor2('darkorange');
  elementColor('black');
});

colorBtn[2].addEventListener('click', function() {
  bgColor('lightskyblue');
  bgColor2('deepskyblue');
  elementColor('black');
});
colorBtn[3].addEventListener('click', function() {
  bgColor('mediumseagreen');
  bgColor2('seagreen');
  elementColor('black');
});
colorBtn[4].addEventListener('click', function() {
  bgColor('black');
  bgColor2('black');
  elementColor(pcol);
});
