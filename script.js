const button = document.getElementsByClassName('btn');
const input  = document.querySelectorAll('input');
const badge  = document.querySelector('.badge');
const audio  = document.querySelector('audio');
const img    = document.querySelector('img');
const body   = document.body.classList;
const array  = []; // id storage
const play   = localStorage.getItem('play');
const regex  = /(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i;
const url    = "https://noembed.com/embed?dataType=json&url=https://youtube.com/watch?v=";
const interval = setInterval(script, 2000);

let y; // store id for changes check
let m; // queue count 
let param; // algorithm parameter
let n = 1; // current queue playing
let c = 249; // quality codec value
let l = true; // thumbnail boolean
let queue; // queue boolean
let error = "NotAllowedError: Read permission denied.";

function er() {
  error = true;
  clearInterval(interval);
  input[0].classList.remove('d-none');
  button[2].style.display = 'none';
}

// Fallback for Firefox
if (navigator.userAgent.indexOf('Firefox') !== -1) { er(); }

// link uid extractor
function caller(val) { return val.match(regex)[7]; }

// audio thumbnail title src
function atsrc(x) {
  // Playback --- Needs changed to youtube dl exec module
  audio.src = `https://projectlounge.pw/ytdl/download?url=https://youtu.be/${x}&format=${c}`;
  audio.play();

  fetch(url + x).then(res => res.json())
    .then(data => {
      // Thumbnail
      if (l === true) { img.src = data.thumbnail_url; }
      // Title
      document.querySelector('h1').innerText = data.title;
    });
  // not to run again
  y = x;
}

// next track 
function next() {
  if ((m - n) > -1) {
    atsrc(array[n]);
    badge.setAttribute("data-badge", m - n);
    n++;
  }
}

// local storage saving shortcut
function save(name, key) { localStorage.setItem(name, key); }

// forward backward
function skip(t) { audio.currentTime += t; }

// proper link intercepting algorithm
function algorithm(param) {
  if (y != param) {
    // autoplay new id
    if (queue == undefined) { atsrc(param); }
    // queue new id
    else {
      fetch(url + param).then(res => res.json())
        .then(da => { queueList[m] = da.title; });
      m++;
      badge.setAttribute("data-badge", m - n + 1);
      array[m] = y = param;
      audio.onended = () => { next(); }
    }
  }
}

// clipboard copy
function script() {
  navigator.clipboard.readText()
    .then(link => { algorithm(caller(link)) })
    .catch(err => {
      if (err == error) {
        er();
      }
    });
}

// save current clipboard/input value to array storage
function store() {
  if (error == true) { algorithm(caller(input[0].value)); }
  else { script(); }
}

// input text player
input[0].oninput = () => { algorithm(caller(input[0].value)); }

// Queue Loop Auto
if (play == "loop") {
  audio.onended = (e) => { audio.play(); };
  input[2].checked = true;
}
else if (play == "queue") {
  m = 0;
  queue = input[1].checked = true;
  clearInterval(interval);
  button[2].classList.remove('d-none');
  button[3].classList.remove('d-none');
  store();
}
else {
  audio.onended = null;
  save('play', "auto");
  input[3].checked = true;
}

// Queue
input[1].addEventListener("click", function() {
  m = 0;
  queue = true;
  clearInterval(interval);
  button[2].classList.remove('d-none');
  button[3].classList.remove('d-none');
  save('play', "queue");
  store();
});

// Loop
input[2].addEventListener("click", function() {
  save('play', "loop");
  location.reload();
});

// Auto
input[3].addEventListener("click", function() {
  save('play', "auto");
  location.reload();
});

// HQ SETTING
if (localStorage.getItem('format') == "yes") {
  input[4].checked = true;
  c = 251;
}
input[4].onchange = function() {
  if (this.checked) {
    c = 251;
    save('format', "yes");
  }
  else {
    c = 249;
    save('format', "no");
  }
  atsrc(param);
}

// Dark Mode
if (localStorage.getItem('theme') == "dark") {
  body.remove('bg-secondary');
  body.add('bg-dark');
  for (w = 4; w < 7; w++)
    button[w].classList.add('text-secondary');
  input[5].checked = true;
}
input[5].onchange = () => {
  input[5].checked == true ? save('theme', "dark") : save('theme', "off");
  body.toggle('bg-secondary');
  body.toggle('bg-dark');
  for (w = 4; w < 7; w++)
    button[w].classList.toggle('text-secondary');
}

// Thumbnail
if (localStorage.getItem('thum') == "off") {
  l = false;
  img.classList.add('d-none');
  input[6].removeAttribute('checked');
}

input[6].onchange = () => {
  input[6].checked == true ? save('thum', "on") : save('thum', "off");
  img.classList.toggle('d-none');
}

// Clear Settings
button[4].addEventListener("click", () =>
{
  localStorage.clear();
  location.reload();
});