const playerBtn = document.querySelectorAll('#player button');
const footBtn = document.querySelectorAll('#playback button');
const controls = document.getElementById('controls');
const controlBtn = document.querySelectorAll('#controls button');
const volume = document.getElementById('volume');
const progress = document.getElementById('progress');
const playbackSpeed = document.getElementById('playback-speed');
const input = document.querySelector('input[type="text"]');
const audio = document.querySelector('audio');
const img = document.querySelector('img');
const array = []; // url storage
//const play = localStorage.getItem('play');
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
const abstract = /(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i;
const ytimg = "https://img.youtube.com/vi_webp/";

export { playerBtn, footBtn, controls, controlBtn, volume, progress, playbackSpeed, input, audio, img, array, /*play,*/ metadata, title, root, colorBtn, bgColor, bgColor2, elementColor, googleProxyURL, abstract, ytimg };