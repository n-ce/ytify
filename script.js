if (localStorage.getItem("2") == null) {
  alert('YTIFY 2.310122\n\nCopy YT Video link to Clipboard to start playing automatically.\n\nComing Soon :\nQueuing Support.\nFirefox Browser Support.\n100% options save support');
  localStorage.setItem("2", "yes");
}

const audio = document.querySelector('audio');
const thumb = document.querySelector('img');
const input = document.querySelectorAll('input');

const a1 = "https://projectlounge.pw/ytdl/download?url=https://youtu.be/";
const a2 = "&format=";
const t1 = "https://img.youtube.com/vi/";
const t2 = "/maxresdefault.jpg";
let y;
let c = 249;
let q = "low";

function atsrc(x) {
  //Playback
  audio.src = a1 + x + a2 + c;
  audio.play();
  //Thumbnail
  thumb.src = t1 + x + t2;
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
    if (y == undefined) { atsrc(id) }
    //start playing if new id
    else if (y != id) { atsrc(id) }
  })
}

script();
setInterval(script, 2000);

//Loop

input[0].addEventListener("click", function() {
  if (input[0].checked == true) {
    audio.onended = (e) => {
      audio.play();
    }
  }
  else { audio.onended = null }
});


// Dark Mode
const theme = window.localStorage.getItem('data-theme');
const body = document.body.classList;

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
document.querySelector('.btn').addEventListener("click", function()
{
  localStorage.clear();
});