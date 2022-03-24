const i = document.querySelectorAll('i');
const input = document.querySelector('input');
const badge = document.querySelector('.fa-list-ul');
const audio = document.querySelector('audio');
const img = document.querySelector('img');
const body = document.body;
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
  input.classList.toggle('hidden');
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
        document.querySelector('p').innerText = data.title;
      }
    });
  // so that it does not run again for the same link
  y = url;
}

// next track 

function next() {
  if ((m - n) > -1) {
    atsrc(array[n]);
    badge.innerText = m - n;
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
      badge.innerText = m - n + 1;
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
    algorithm(input.value);
  }
  else {
    script();
  }
}

// input text player

input.oninput = () => {
  algorithm(input.value);
}


// player load saved data

if (play == "loop") {
  audio.onended = (e) => {
    audio.play();
  }
  i[14].style.color = 'red';
}
else if (play == "queue") {
  m = 0;
  queue = true;
  i[13].style.color = 'red';
  clearInterval(interval);
  i[9].classList.remove('disabled');
  i[12].classList.remove('disabled');
  store();
  k = true;
}
else {
  audio.onended = null;
}

// Queue

i[13].addEventListener("click",
  function() {
    m = 0;
    queue = true;
    clearInterval(interval);
    i[9].classList.remove('disabled');
    i[12].classList.remove('disabled');
    save('play', "queue");
    store();
    k = true;
  }
);

// Loop
let zPlus = 0;
i[14].addEventListener("click",
  function() {
    //only reload if coming from queue
    zPlus++;
    if (zPlus % 2 == 0) {
      if (k == true) {
        k = false;
        location.reload();
      }
      audio.onended = (e) => {
        audio.play();
      };
      save('play', "loop");
    }
    else {
      audio.onended = null;
      save('play', "auto");
    }
  }
);

// HQ SETTING

if (localStorage.getItem('format') == "yes") {
  i[15].style.color = 'red';
  c = 251;
}

let codec = 0;
i[15].onclick = function() {
  codec++;
  if (codec % 2 == 0) {
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



// Thumbnail

if (localStorage.getItem('thum') == "off") {
  thumb = false;
  img.style.display = 'none';
}


let thumbPlus = 0;
i[16].onclick = () => {
  thumbPlus++;
  img.classList.toggle('hidden');
  if (thumbPlus % 2 == 0) {
    save('thum', "on");
    thumb = true;
    img.style.display = 'block';
    img.src = storeThumbURL;
  }
  else {
    save('thum', "off");
    img.style.display = 'none';
    thumb = false;
    img.src = null;
  }
}


// Clear Settings

i[1].addEventListener("click",
  () =>
  {
    localStorage.clear();
    location.reload();
  }
);
i[0].addEventListener("click", () => {
  alert('about placeholder');
});
