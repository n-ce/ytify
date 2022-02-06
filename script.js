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
let n = 1; // current queue playing
let c = 249; // quality value
let queue = false; // queue boolean
let error = "NotAllowedError: Read permission denied.";

if (navigator.userAgent.indexOf('Firefox') != -1) {
  input[0].classList.remove('d-none');
  input[1].classList.add('d-none');
  alert('Clipboard API Not Supported : Some Functions Might Not Work');
  error = true;
  clearInterval(interval);
}

// link to id converter
function caller(val) {
  return val.match(abstract)[7];
}

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

function save(name, key) {
  localStorage.setItem(name, key);
}

function skip(t) {
  audio.currentTime += t;
}

function algorithm(param) {
  //initial id value
  if (y == undefined) { atsrc(param); }
  //start playing if new id
  else if (y != param && queue == false) {
    atsrc(param);
  }
  // queue new id
  else if (y != param && queue == true) {
    m++;
    label.innerText = m - n + 1;
    array[m] = y = param;
    audio.onended = (e) => { next(); }
  }
}

function script() {
  navigator.clipboard.readText().then(link => { algorithm(caller(link)); }).catch(err => {
    // maybe user didn't grant access to read from clipboard
    if (err == error) {
      error = true;
      input[0].classList.remove('d-none');
      alert('Permissions Denied : Some Functions Might Not Work');
      clearInterval(interval);
    }
  });
}

// input text player
input[0].addEventListener("keyup", function(event) {
  if (event.keyCode === 13) {
    atsrc(caller(input[0].value));
  }
});

// store new id in queue
button[2].addEventListener("click", function() {
  if (error == true) {
    algorithm(caller(input[0].value));
  }
  else {
    script();
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
  script();
  button[2].classList.remove('d-none');
  button[3].classList.remove('d-none');
  label.classList.remove('d-none');
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
  script();
  button[2].classList.remove('d-none');
  button[3].classList.remove('d-none');
  label.classList.remove('d-none');
  save('play', "queue");
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
    atsrc(param);
    save('format', "yes");
  }
  else {
    c = 249;
    atsrc(param);
    save('format', "no");
  }
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