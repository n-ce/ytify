const audio = document.querySelector('audio');
//copies from clipboard
function script() {
  navigator.clipboard.readText().then(link => {

    audio.src = "https://projectlounge.pw/ytdl/download?url=" + link + "&format=249";
    audio.play();

    //Thumbnail
    let re = /(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i;
    let id = link.match(re)[7];
    document.querySelector('img').src = "https://img.youtube.com/vi/" + id + "/maxresdefault.jpg";

  });
}

script();

function checker() {
  audio.onended = (e) => {
    audio.src = null;
    script();
  }
}
setInterval(checker, 1000);