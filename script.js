if (localStorage.getItem("1.9z") == null) {
  alert('YTIFY 1.9z\nCopy YT Video link to Clipboard to start playing automatically.\n\nComing Soon. :\nQueuing Support.\nFirefox Browser Support.');
  localStorage.setItem("1.9z", "yes");

}

const audio = document.querySelector('audio');
const thumb = document.querySelector('img');
const a1 = "https://projectlounge.pw/ytdl/download?url=https://youtu.be/";
const a2 = "&format=249";
const t1 = "https://img.youtube.com/vi/";
const t2 = "/maxresdefault.jpg";
let y = null;

function atsrc(x) {
  //Playback
  audio.src = a1 + x + a2;
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
    //initial id value
    if (y == null) { atsrc(id) }
    //start playing if new id
    else if (y != id) { atsrc(id) }
  })
}
script();
setInterval(script, 2000);

//Loop
const input = document.querySelector('input');
input.addEventListener("click", function() {
  if (input.checked == true) {
    audio.onended = (e) => {
      audio.play();
    }
  }
  else { audio.onended = null }
});
