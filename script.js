const button = document.getElementsByClassName('btn');
const input = document.querySelectorAll('input');
const label = document.querySelector('.label');
const audio = document.querySelector('audio');
const body = document.body.classList;
const array = []; // id storage
const interval = setInterval(script, 2000);
const play = localStorage.getItem('play');
const abstract = /(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i;

let y; // store id
let m; // queue count 
let param; // algorithm parameter
let n = 1; // current queue playing
let c = 249; // quality value
let queue; // queue boolean
let error = "NotAllowedError: Read permission denied.";

function er() {
  error = true;
  clearInterval(interval);
  input[0].classList.remove('d-none');
  alert('Error Detected : Some Functions Might Not Work');
}

if (navigator.userAgent.indexOf('Firefox') != -1) { er(); }

// link to id converter
function caller(val) { return val.match(abstract)[7]; }

function atsrc(x) {
  //Playback
  audio.src = "https://projectlounge.pw/ytdl/download?url=https://youtu.be/" + x + "&format=" + c;
  audio.play();
  //Thumbnail
  document.querySelector('iframe').src = "https://youtube.com/embed/" + x;
  y = x;
}

function next() {
  if ((m - n) > -1) {
    atsrc(array[n]);
    label.innerText = m - n;
    n++;
  }
}

function save(name, key) { localStorage.setItem(name, key); }

function skip(t) { audio.currentTime += t; }

function algorithm(param) {
  if (y != param) {
    // autoplay new id
    if (queue == undefined) { atsrc(param); }
    // queue new id
    else {
      m++;
      label.innerText = m - n + 1;
      array[m] = y = param;
      audio.onended = (e) => { next(); }
    }
  }
}

function script() { navigator.clipboard.readText().then(link => { algorithm(caller(link)) }).catch(err => { if (err == error) { er(); } }); }

function store() {
  if (error == true) { algorithm(caller(input[0].value)); }
  else { script(); }
}

// input text player
input[0].addEventListener("keyup", function(event) {
  if (event.keyCode === 13) {
    atsrc(caller(input[0].value));
  }
});

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
  label.classList.remove('d-none');
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
  label.classList.remove('d-none');
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
  input[5].checked = true;
}
input[5].onchange = function() {
  if (this.checked) {
    body.remove('bg-secondary');
    body.add('bg-dark');
    save('theme', "dark");
  } else {
    body.add('bg-secondary');
    body.remove('bg-dark');
    save('theme', "secondary");
  }
}

// Clear Settings
button[4].addEventListener("click", function()
{
  localStorage.clear();
  location.reload();
});