const audio = document.querySelector('audio');

function script() {
  //copies from clipboard
  navigator.clipboard.readText().then(link => {

    audio.src = "https://projectlounge.pw/ytdl/download?url=" + link + "&format=249";
    audio.play();
    //Thumbnail
    let re = /(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i;
    id = link.match(re)[7];
    document.querySelector('img').src = "https://img.youtube.com/vi/" + id + "/maxresdefault.jpg";

  });
}

script();

document.querySelector('img').onclick = (e) => {
  script();
}