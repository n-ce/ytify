const r = document.querySelector(':root');
const colorBtn = document.querySelectorAll('span');

const bgColor = (bgVal) => {
  r.style.setProperty('--background', bgVal);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", bgVal);
}
const bgColor2 = (bgVal2) => {
  r.style.setProperty('--background2', bgVal2);
}
const elementColor = (elementVal) => {
  r.style.setProperty('--element', elementVal);
}

const colorThief = new ColorThief();
let pker = colorThief.getColor(img);
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