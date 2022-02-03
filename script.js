if (localStorage.getItem("2d") == null) {
  alert(
    "YTIFY 2d\n\nCopy YT Video link to Clipboard to start playing automatically.\n\nHow To queue :\nEnable Enqueue, copy next track link and click on plus button.\n\nComing Soon :\nFirefox Browser Support.",
  );
  localStorage.clear();
  localStorage.setItem("2d", "yes");
}

const button = document.getElementsByClassName("btn");
const theme = localStorage.getItem("data-theme");
const input = document.querySelectorAll("input");
const label = document.querySelector(".label");
const audio = document.querySelector("audio");
const thumb = document.querySelector("img");
const urlInput = document.querySelector(".url-input");
const scan = localStorage.getItem("scan");
const scanarr = ["a", "b", "c", "d", "e", "f"];
const i = document.querySelector("b");
const body = document.body.classList;
const array = [];

let y;
let m;
let n = 0;
let s = 2;
let c = 249;
let q = "low";
let queue = false;
let doesReadText;

function checkReadText() {
  if (navigator.clipboard.readText) {
    urlInput.classList.add("hidden");
    doesReadText = true;
  } else doesReadText = false;
}

checkReadText();

function atsrc(x) {
  //Playback
  audio.src =
    "https://projectlounge.pw/ytdl/download?url=https://youtu.be/" +
    x +
    "&format=" +
    c;
  audio.play();
  //Thumbnail
  thumb.src = "https://img.youtube.com/vi/" + x + "/maxresdefault.jpg";
  y = x;
}

// save hq setting
if (localStorage.getItem("format") == "yes") {
  input[2].checked = true;
  c = 251;
  q = "high";
}

function script() {
  if (navigator.clipboard.readText) {
    navigator.clipboard.readText().then((link) => {
      //UID Extractor
      let re =
        /(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i;
      let id = link.match(re)[7];
      // HQ 128kbps
      if (input[2].checked == true && q == "low") {
        c = 251;
        atsrc(id);
        q = "high";
        localStorage.setItem("format", "yes");
      } else if (input[2].checked == false && q == "high") {
        c = 249;
        atsrc(id);
        q = "low";
        localStorage.setItem("format", "no");
      }
      //initial id value
      if (y == undefined) {
        atsrc(id);
      }
      //start playing if new id
      else if (y != id && queue == false) {
        atsrc(id);
      }
      // queue new id
      else if (y != id && queue == true) {
        array[m] = y = id;
        audio.onended = (e) => {
          atsrc(array[n]);
          n++;
        };
      }
    });
  }
}

script();

// next track
button[3].addEventListener("click", function () {
  atsrc(array[n]);
  n++;
});

// scanning time interval

if (scan != null) {
  s = scanarr.indexOf(scan);
  i.innerText = s;
  const interval = setInterval(script, s * 1000);
} else {
  setInterval(script, 2000);
}

button[4].addEventListener("click", function () {
  if (s < 5) {
    s++;
    i.innerText = s;
    window.localStorage.setItem("scan", scanarr[s]);
    location.reload();
  }
});
button[5].addEventListener("click", function () {
  if (s > 0) {
    s--;
    i.innerText = s;
    window.localStorage.setItem("scan", scanarr[s]);
    location.reload();
  }
});

// enable queue

button[1].addEventListener("click", function () {
  if (m == null) {
    button[2].classList.remove("disabled");
    button[3].classList.remove("disabled");
    input[1].disabled = queue = true;
    m = 0;
    clearInterval(interval);
  } else {
    button[2].classList.add("disabled");
    button[3].classList.add("disabled");
    input[1].disabled = queue = false;
    m = null;
    label.innerText = 0;
    interval;
  }
});
button[2].addEventListener("click", function () {
  m++;
  label.innerText = m;
  script();
});

//Loop

if (localStorage.getItem("loop") == "yes") {
  input[1].checked = true;
  audio.onended = (e) => {
    audio.play();
  };
  button[1].disabled = true;
}

input[1].addEventListener("click", function () {
  if (input[1].checked == true) {
    audio.onended = (e) => {
      audio.play();
    };
    button[1].disabled = true;
    localStorage.setItem("loop", "yes");
  } else {
    audio.onended = null;
    button[1].disabled = false;
    localStorage.setItem("loop", "no");
  }
});

// Dark Mode

if (theme == "dark") {
  body.remove("bg-secondary");
  body.add("bg-dark");
}
input[3].checked = theme == "dark" ? true : false;
input[3].onchange = function () {
  if (this.checked) {
    body.remove("bg-secondary");
    body.add("bg-dark");
    window.localStorage.setItem("data-theme", "dark");
  } else {
    body.add("bg-secondary");
    body.remove("bg-dark");
    window.localStorage.setItem("data-theme", "secondary");
  }
};

// clear settings
button[6].addEventListener("click", function () {
  localStorage.clear();
  location.reload();
});
