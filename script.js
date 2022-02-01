if (localStorage.getItem("2c") == null) {
  alert('YTIFY 2c\n\nCopy YT Video link to Clipboard to start playing automatically.\n\nHow To queue :\nEnable Enqueue, copy next track link and click on plus button.\nComing Soon :\n\nFirefox Browser Support.\n100% options save support');
  localStorage.setItem("2c", "yes");
}

const button = document.getElementsByClassName('btn');
const theme = localStorage.getItem('data-theme');
const input = document.querySelectorAll('input');
const audio = document.querySelector('audio');
const thumb = document.querySelector('img');
const scan = localStorage.getItem('scan');
const scanarr = ["a", "b", "c", "d", "e", "f"];
const i = document.querySelector('b');
const body = document.body.classList;
const array = [];
const label = document.querySelector('.label');


let y;
let m;
let n = 0;
let s = 2;
let c = 249;
let q = "low";
let queue = false;


function atsrc(x) {
  //Playback
  audio.src = "https://projectlounge.pw/ytdl/download?url=https://youtu.be/" + x + "&format=" + c;
  audio.play();
  //Thumbnail
  thumb.src = "https://img.youtube.com/vi/" + x + "/maxresdefault.jpg";
  y = x;
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
    }
    else if (input[1].checked == false && q == "high") {
      c = 249;
      atsrc(id);
      q = "low";
    }
    //initial id value
    if (y == undefined) { atsrc(id); }
    //start playing if new id
    else if (y != id && queue == false) { atsrc(id); }
    // queue new id
    else if (y != id && queue == true) {
      array[m] = y = id;
      audio.onended = (e) => {
        atsrc(array[n]);
        n++;
        
      }
    }

  });
}

script();

// scanning time interval

if (scan != null) {
  s = scanarr.indexOf(scan);
  i.innerText = s;
  const interval = setInterval(script, s * 1000);
}
else { setInterval(script, 2000); }

button[2].addEventListener("click",
  function() {
    if (s < 5) {
      s++;
      i.innerText = s;
      window.localStorage.setItem('scan', scanarr[s]);
      location.reload();
    }
  });
button[3].addEventListener("click",
  function() {
    if (s > 0) {
      s--;
      i.innerText = s;
      window.localStorage.setItem('scan', scanarr[s]);
      location.reload();
    }
  });

// enable queue

button[0].addEventListener("click", function() {

  if (m == null) {
    button[1].classList.remove('disabled');
    input[0].disabled = queue = true;
    m = 0;
    clearInterval(interval);
  }
  else {
    button[1].classList.add('disabled');
    input[0].disabled = queue = false;
    m = null;
    label.innerText = 0;
    const interval = setInterval(script,s*1000);
  }
});
button[1].addEventListener("click", function() {
  m++;
  label.innerText = m;
  script();
});

//Loop

input[0].addEventListener("click", function() {
  if (input[0].checked == true) {
    audio.onended = (e) => {
      audio.play();
    };
    button[0].disabled = true;
  }
  else {
    audio.onended = null;
    button[0].disabled = false;
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
button[4].addEventListener("click", function()
{
  localStorage.clear();
  location.reload();
});