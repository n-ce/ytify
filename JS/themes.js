import { colorBtn, bgColor, bgColor2, elementColor, img } from './constants.js';


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