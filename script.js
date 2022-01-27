const loader = document.querySelector('div');
const clicker = document.querySelector('p');
let click = 0;

function call() {
  click++;
  if (click > 2) { location.reload() }
  navigator.clipboard.readText().then(Cliplink => { link = Cliplink });
  var sound = new Howl({
    src: ["https://projectlounge.pw/ytdl/download?url=" + link + "&format=249"],
    html5: true,
    onend: function() {
      location.reload();
    }
  });
  sound.play();
  loader.style.borderTopColor = "hotpink";
  setTimeout(animation,20000);
  let re = /(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i;
  let id = link.match(re)[7];
  document.querySelector('img').src = "https://img.youtube.com/vi/" + id + "/maxresdefault.jpg";
}
clicker.addEventListener('click', call);

function about() {
  alert("Make sure you have copied the youtube link to clipboard before attempting to start the playback.")
}
clicker.addEventListener('click', about);

function animation() {
  loader.style.borderTopColor = "black";
}