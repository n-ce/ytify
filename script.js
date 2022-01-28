document.querySelector('html').addEventListener("click", function() {
  alert('YTIFY 1.9\nHow To Use :\n1. Copy YT Video link to Clipboard.\n2. Click on Thumbnail to Restart or Start a New Playback.\n3. Reload Page If Not Working.\n\nQueue Support Coming Soon.')
});

const audio = document.querySelector('audio');
const thumb = document.querySelector('img');
const a1 = "https://projectlounge.pw/ytdl/download?url=https://youtu.be/";
const a2 = "&format=249";
const t1 = "https://img.youtube.com/vi/";
const t2 = "/maxresdefault.jpg";

function script() {
  navigator.clipboard.readText().then(link => {
    //UID Extractor
    let re = /(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i;
    let id = link.match(re)[7];
    //Playback
    audio.src = a1 + id + a2;
    audio.play();
    //Thumbnail
    thumb.src = t1 + id + t2;
  })
}

script();
thumb.onclick = (e) => { script() }