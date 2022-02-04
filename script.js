if (localStorage.getItem("2e") == null) {
  alert('YTIFY 2e\n\nCopy YT Video link to Clipboard to start playing automatically.\n\nHow To queue :\nEnable Enqueue, copy next track link and click on plus button.\n\nComing Soon :\nFirefox Browser Support.');
  localStorage.clear();
  localStorage.setItem("2e", "yes");
}

const button = document.getElementsByClassName('btn');
const theme = localStorage.getItem('data-theme');
const input = document.querySelectorAll('input');
const label = document.querySelector('.label');
const audio = document.querySelector('audio');
const thumb = document.querySelector('img');
const body = document.body.classList;
const array = []; // id storage
const interval = setInterval(script, 2000);

let y; // store id
let m; // queue count 
let n = 1; // current queue playing
let c = 249; // quality value
let q = "low"; // quality boolean
let queue = false; // queue boolean


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
  input[1].checked = true;
  c = 251;
  q = "high";
}


function script() {
  navigator.clipboard.readText().then(link => {
    //UID Extractor
    let re = /(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i;
    let id = link.match(re)[7];
    // HQ 128kbps
    if (input[1].checked == true && q == "low") {
      c = 251;
      atsrc(id);
      q = "high";
      localStorage.setItem('format', "yes");
    }
    else if (input[1].checked == false && q == "high") {
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
    }
  });
}

script();

// rewind & forward
button[0].addEventListener("click", function() {
  audio.currentTime += -10;
})
button[1].addEventListener("click", function() {
  audio.currentTime += 10;
})
// next track
button[4].addEventListener("click", function() {
  atsrc(array[n]);
  n++;
});

// enable queue

button[2].addEventListener("click", function() {
  button[2].classList.add('bg-primary');
  if (m == null) {
    button[3].classList.remove('disabled');
    button[4].classList.remove('disabled');
    input[0].disabled = queue = true;
    m = 0;
    clearInterval(interval);
    script();
  }
  else { location.reload(); }
});

button[3].addEventListener("click", function() {
  script();
});

//Loop

if (localStorage.getItem('loop') == "yes") {
  input[0].checked = true;
  audio.onended = (e) => {
    audio.play();
  };
  button[2].disabled = true;
}

input[0].addEventListener("click", function() {
  if (input[0].checked == true) {
    audio.onended = (e) => {
      audio.play();
    };
    button[2].disabled = true;
    localStorage.setItem('loop', "yes");
  }
  else {
    audio.onended = null;
    button[2].disabled = false;
    localStorage.setItem('loop', "no");
  }
});

// Dark Mode

if (theme == "dark") {
  body.remove('bg-secondary');
  body.add('bg-dark');
}
input[2].checked = theme == "dark" ? true : false;
input[2].onchange = function() {
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
button[5].addEventListener("click", function()
{
  localStorage.clear();
  location.reload();
});