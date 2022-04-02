import { colorBtn, bgColor, bgColor2, elementColor, img } from './constants.js';


colorBtn[1].addEventListener('click', function() {
  bgColor('#ffb88c');
  bgColor2('#de6262');
  elementColor('#000a');
});

colorBtn[2].addEventListener('click', function() {
  bgColor2('#2193b0');
  bgColor('#6dd5ed');
  elementColor('#000a');
});
colorBtn[3].addEventListener('click', function() {
  bgColor2('#56ab2f');
  bgColor('#a8e063');
  elementColor('#000a');
});
