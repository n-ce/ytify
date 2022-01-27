const loader = document.querySelector('div');
let click = 0;
navigator.clipboard.readText().then(Cliplink => { link = Cliplink });
document.querySelector('p').onclick =
  function() {
    click++;
    var sound = new Howl({
      src: ["https://projectlounge.pw/ytdl/download?url=" + link + "&format=249"],
      html5: true,
      onend: function() {
        location.reload();
      }
    });
    if (click % 2 == 1) {
      sound.play();
    }
    else {
      location.reload();
    }
    loader.style.borderTopColor = "hotpink";
    setTimeout(animation, 20000);
    let re = /(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i;
    let id = link.match(re)[7];
    document.querySelector('img').src = "https://img.youtube.com/vi/" + id + "/maxresdefault.jpg";
  }

function animation() {
  loader.style.borderTopColor = "black";
}