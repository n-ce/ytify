const playerBtn = document.querySelectorAll('#player button');
const footBtn = document.querySelectorAll('#playback i');
const input = document.querySelector('input[type="text]');
const audio = document.querySelector('audio');
const img = document.querySelector('img');
const array = []; // url storage
const play = localStorage.getItem('play');
const metadata = "https://noembed.com/embed?dataType=json&url=";
const title = document.querySelector('h3');

const root = document.querySelector(':root');
const colorBtn = document.querySelectorAll('#themes span');

const bgColor = (bgVal) => {
  root.style.setProperty('--background', bgVal);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", bgVal);
}
const bgColor2 = (bgVal2) => {
  root.style.setProperty('--background2', bgVal2);
}
const elementColor = (elementVal) => {
  root.style.setProperty('--element', elementVal);
}

const googleProxyURL = 'https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=2592000&url=';


export {playerBtn,footBtn,input,audio,img,array,play,metadata,title,root,colorBtn,bgColor,bgColor2,elementColor,googleProxyURL};
