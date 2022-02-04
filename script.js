if (localStorage.getItem("2f") == null) {
  alert('YTIFY 2f\n\nCopy YT Video link to Clipboard to start playing automatically.\n\nHow To Queue :\nClick Queue, copy next track link and click on plus button.');
  localStorage.clear();
  localStorage.setItem("2f", "yes");
}

const button = document.getElementsByClassName('btn');
const theme = localStorage.getItem('data-theme');
const input = document.querySelectorAll('input');
const label = document.querySelector('.label');
const audio = document.querySelector('audio');
const thumb = document.querySelector('img');
const urlInput = document.querySelector(".url-input");
const body = document.body.classList;
const array = []; // id storage
const interval = setInterval(script, 2000);

let y; // store id
let m; // queue count 
let n = 1; // current queue playing
let c = 249; // quality value
let q = "low"; // quality boolean
let queue = false; // queue boolean

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
if (localStorage.getItem('format') == "yes") {
  input[3].checked = true;
  c = 251;
  q = "high";
}

function script() {
  if (navigator.clipboard.readText) {
    navigator.clipboard.readText().then(link => {
      //UID Extractor
      let re = /(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i;
      let id = link.match(re)[7];
      // HQ 128kbps
      if (input[3].checked == true && q == "low") {
        c = 251;
        atsrc(id);
        q = "high";
        localStorage.setItem('format', "yes");
      }
      else if (input[3].checked == false && q == "high") {
        c = 249;
        atsrc(id);
        q = "low";
        localStorage.setItem('format', "no");
      }
      //initial id value
      if (y == undefined) { atsrc(id); }
      //start playing if new id
      else if (y != id && queue == false) { atsrc(id); }
      // queue new id
      else if (y != id && queue == true) {
        m++;
        label.innerText = m;
        array[m] = y = id;
        audio.onended = (e) => {
          atsrc(array[n]);
          n++;

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
};

script();

// rewind & forward
button[0].addEventListener("click", function() {
  audio.currentTime += -10;
})
button[1].addEventListener("click", function() {
  audio.currentTime += 10;
})
// next track
button[3].addEventListener("click", function() {
  atsrc(array[n]);
  n++;
});
// store new id in queue
button[2].addEventListener("click", function() {
  script();
});

// Queue Loop Auto Save
if (localStorage.getItem('play') == "loop") {
  audio.onended = (e) => {
    audio.play();
  };
  input[1].checked = true;
}
else if (localStorage.getItem('play') == "queue") {
  m = 0;
  queue = true;
  clearInterval(interval);
  script();
  input[0].checked = true;
  button[2].classList.remove('d-none');
  button[3].classList.remove('d-none');
  label.classList.remove('d-none');
}
else {
  audio.onended = null;
  localStorage.setItem('play', "auto");
  input[2].checked = true;
}

// queue

input[0].addEventListener("click", function() {
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

input[1].addEventListener("click", function() {
  audio.onended = (e) => {
    audio.play();
  };
  localStorage.setItem('play', "loop");
  location.reload();
});

// auto
input[2].addEventListener("click", function() {
  localStorage.setItem('play', "auto");
  location.reload();
});

// Dark Mode

if (theme == "dark") {
  body.remove("bg-secondary");
  body.add("bg-dark");
}
  
input[4].checked = theme == "dark" ? true : false;
input[4].onchange = function() {
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
button[4].addEventListener("click", function()
{
  localStorage.clear();
  location.reload();
});
