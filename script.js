const button = document.getElementsByClassName('btn');
const theme = localStorage.getItem('data-theme');
const input = document.querySelectorAll('input');
const label = document.querySelector('.label');
const audio = document.querySelector('audio');
const thumb = document.querySelector('img');
const body = document.body.classList;
const array = []; // id storage
const interval = setInterval(script, 2000);

const abstract = /(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i;

let y; // store id
let m; // queue count 
let link;
let param;
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

// UID EXTRACTOR
function caller(val) {
  return val.match(abstract)[7];
}

function atsrc(x) {
  //Playback
  audio.src = "https://projectlounge.pw/ytdl/download?url=https://youtu.be/" + x + "&format=" + c;
  audio.play();
  //Thumbnail
  thumb.src = "https://img.youtube.com/vi/" + x + "/maxresdefault.jpg";
  y = x;
}

// save hq setting
if (localStorage.getItem('format') == "yes") {
  input[4].checked = true;
  c = 251;
}

// HQ 128kbps

input[4].addEventListener("click", function() {
  if (input[4].checked == true) {
    c = 251;
    atsrc(param);
    localStorage.setItem('format', "yes");
  }
  else if (input[4].checked == false) {
    c = 249;
    atsrc(param);
    localStorage.setItem('format', "no");
  }
});

function algorithm(param) {
  //initial id value
  if (y == undefined) { atsrc(param); }
  //start playing if new id
  else if (y != param && queue == false) { atsrc(param);
  }
  // queue new id
  else if (y != param && queue == true) {
    m++;
    label.innerText = m - n + 1;
    array[m] = y = param;
    audio.onended = (e) => {
      atsrc(array[n]);
      label.innerText = m - n;
      n++;
    }
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

// rewind & forward
button[0].addEventListener("click", function() {
  audio.currentTime += -10;
});
button[1].addEventListener("click", function() {
  audio.currentTime += 10;
});
// next track
button[3].addEventListener("click", function() {
  atsrc(array[n]);
  label.innerText = m - n;
  n++;
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

// Queue Loop Auto Save

if (localStorage.getItem('play') == "loop") {
  audio.onended = (e) => {
    audio.play();
  };
  input[2].checked = true;
}
else if (localStorage.getItem('play') == "queue") {
  m = 0;
  queue = true;
  clearInterval(interval);
  script();
  input[1].checked = true;
  button[2].classList.remove('d-none');
  button[3].classList.remove('d-none');
  label.classList.remove('d-none');
}
else {
  audio.onended = null;
  localStorage.setItem('play', "auto");
  input[3].checked = true;
}

// queue

input[1].addEventListener("click", function() {
  m = 0;
  queue = true;
  clearInterval(interval);
  script();
  button[2].classList.remove('d-none');
  button[3].classList.remove('d-none');
  label.classList.remove('d-none');
  localStorage.setItem('play', "queue");
});

//Loop

input[2].addEventListener("click", function() {
  audio.onended = (e) => {
    audio.play();
  };
  localStorage.setItem('play', "loop");
  location.reload();
});

// auto
input[3].addEventListener("click", function() {
  localStorage.setItem('play', "auto");
  location.reload();
});


// Dark Mode

if (theme == "dark") {
  body.remove('bg-secondary');
  body.add('bg-dark');
}
input[5].checked = theme == "dark" ? true : false;
input[5].onchange = function() {
  if (this.checked) {
    body.remove('bg-secondary');
    body.add('bg-dark');
    window.localStorage.setItem('data-theme', "dark");
  } else {
    body.add('bg-secondary');
    body.remove('bg-dark');
    window.localStorage.setItem('data-theme', "secondary");
  }
}

// clear settings
button[4].addEventListener("click", function()
{
  localStorage.clear();
  location.reload();
});
