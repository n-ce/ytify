const button = document.querySelectorAll('.btn');
const input = document.querySelectorAll('input');
const badge = document.querySelector('.badge');
const audio = document.querySelector('audio');
const img = document.querySelector('img');
const body = document.body.classList;
const array = []; // url storage
const play = localStorage.getItem('play');
const metadata = "https://noembed.com/embed?dataType=json&url=";
const interval = setInterval(script, 2000);

let k = false;
let y; // store url for changes check
let m; // queue count 
let param; // algorithm parameter
let n = 1; // current queue playing
let c = 249; // quality codec value
let thumb = true; // thumbnail boolean
let queue; // queue boolean
let error = "NotAllowedError: Read permission denied.";
let queueList = [];
let storeThumbURL;

// activate fallback functions when error detected

function er() {
  error = true;
  clearInterval(interval);
  input[0].classList.remove('d-none');
  button[2].style.display = 'none';
}

// Fallback for Firefox

if (navigator.userAgent.indexOf('Firefox') !== -1) {
  er();
}

// audio thumbnail title src

function atsrc(url) {
  fetch(metadata + url)
    .then(res => res.json())
    .then(data => {
      // check if link is valid
      if (data.title !== undefined) {
        // Playback
        audio.src = `https://projectlounge.pw/ytdl/download?url=${data.url}&format=${c}`;
        audio.play();

        // Thumbnail
        if (thumb === true) {
          img.src = data.thumbnail_url;
        }
        else {
          storeThumbURL = data.thumbnail_url;
        }

        // Title
        document.querySelector('h1').innerText = data.title;
      }
    });
  // so that it does not run again for the same link
  y = url;
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

function save(name, key) {
  localStorage.setItem(name, key);
}

// forward backward

function skip(t) {
  audio.currentTime += t;
}

// proper link intercepting algorithm

function algorithm(param) {

  if (y != param) {

    // autoplay new id

    if (queue == undefined) {
      atsrc(param);
    }

    // queue new id

    else {

      fetch(metadata + param)
        .then(res => res.json())
        .then(da => {
          if (da.title !== undefined) {
            queueList[m] = da.title;
          }
        });

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
    .then(
      link => {
        algorithm(link)
      }
    )
    .catch(
      err => {
        if (err == error) {
          er();
        }
      }
    );
}

// save current clipboard/input value to array storage

function store() {
  if (error == true) {
    algorithm(input[0].value);
  }
  else {
    script();
  }
}

// input text player

input[0].oninput = () => {
  algorithm(input[0].value);
}


// player load saved data

if (play == "loop") {
  audio.onended = (e) => {
    audio.play();
  }
  input[2].checked = true;
}
else if (play == "queue") {
  m = 0;
  queue = input[1].checked = true;
  clearInterval(interval);
  button[2].classList.remove('d-none');
  button[3].classList.remove('d-none');
  store();
  k = true;
}
else {
  audio.onended = null;
  input[3].checked = true;
}

// Queue

input[1].addEventListener("click",
  function() {
    m = 0;
    queue = true;
    clearInterval(interval);
    button[2].classList.remove('d-none');
    button[3].classList.remove('d-none');
    save('play', "queue");
    store();
    k = true;
  }
);

// Loop

input[2].addEventListener("click",
  function() {

    //only reload if coming from queue
    if (k == true) {
      k = false;
      location.reload();
    }
    audio.onended = (e) => {
      audio.play();
    };
    save('play', "loop");
  }
);

// Auto

input[3].addEventListener("click",
  function() {
    //only reload if coming from queue
    if (k == true) {
      k = false;
      location.reload();
    }
    audio.onended = null;
    save('play', "auto");
  }
);

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

let tabColor = (color) => {
  document.querySelector('meta[name="theme-color"]').setAttribute("content", color);
}

const z = 0; // light mode

if (localStorage.getItem('theme') == "dark") {
  body.remove('bg-secondary');
  body.add('bg-dark');
  tabColor('black');
  z = 1;
  for (w = 4; w < 7; w++)
    button[w].classList.add('text-secondary');

  input[5].checked = true;
}



input[5].onchange = () => {
  z++;
  z % 2 == 1 ? tabColor('black') : tabColor('#f1f1fc');
  input[5].checked == true ? save('theme', "dark") : save('theme', "off");
  body.toggle('bg-secondary');
  body.toggle('bg-dark');
  for (w = 4; w < 7; w++)
    button[w].classList.toggle('text-secondary');
}


// Thumbnail

if (localStorage.getItem('thum') == "off") {
  thumb = false;
  img.classList.add('d-none');
  input[6].removeAttribute('checked');
}

input[6].onchange = () => {
  if (input[6].checked == true) {
    save('thum', "on");
    thumb = true;
    img.src = storeThumbURL;
  }
  else {
    save('thum', "off");
    thumb = false;
    img.src = null;
  }
  img.classList.toggle('d-none');
}


// Clear Settings

button[4].addEventListener("click",
  () =>
  {
    localStorage.clear();
    location.reload();
  }
);