const playerBtn = document.querySelectorAll('button');
const footBtn = document.querySelectorAll('i');
const input = document.querySelector('input');
const badge = document.querySelector('.fa-list-ul');
const audio = document.querySelector('audio');
const img = document.querySelector('img');
const array = []; // url storage
const play = localStorage.getItem('play');
const metadata = "https://noembed.com/embed?dataType=json&url=";

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

export {playerBtn,footBtn,input,badge,audio,img,array,play,metadata,r,colorBtn,bgColor,bgColor2,elementColor,colorThief};
