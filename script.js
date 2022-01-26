const loader = document.querySelector('div');
const click = 0;

function call() {
  click++;
  if (click > 2){sound.stop();}
  navigator.clipboard.readText().then(Cliplink => { link = Cliplink });
  var sound = new Howl({
    src: ["https://projectlounge.pw/ytdl/download?url=" + link + "&format=249"],
    html5: true
  });
  sound.play();
  loader.style.animationName = "loading";
  setTimeout(animation, 20000);
  let re = /(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i;
  let id = link.match(re)[7];
  document.querySelector('img').src = "https://img.youtube.com/vi/" + id + "/maxresdefault.jpg";
}
document.body.addEventListener('click', call);

function about() {
  alert("Make sure you have copied the youtube link to clipboard before attempting to start the playback.")
}
document.querySelector('h1').addEventListener('click', about);

function animation() {
  loader.style.animationName = "removed";
}
