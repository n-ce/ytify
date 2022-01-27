const loader = document.querySelector('div');


document.querySelector('p').onclick =
  function() {
    //copies from clipboard
    navigator.clipboard.readText().then(link => {

      document.querySelector('audio').src = "https://projectlounge.pw/ytdl/download?url=" + link + "&format=249";

      //Thumbnail
      let re = /(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i;
      let id = link.match(re)[7];
      document.querySelector('img').src = "https://img.youtube.com/vi/" + id + "/maxresdefault.jpg";

    });
    // Make the Loader Visible
    loader.style.borderTopColor = "hotpink";

    //Loading Animation Duration
    setTimeout(animation, 10000);
  }

function animation() {
  loader.style.borderTopColor = "black";
}