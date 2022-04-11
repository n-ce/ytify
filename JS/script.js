import { playerBtn, footBtn, input, audio, img, array, play, metadata, title, bgColor, bgColor2, elementColor, colorBtn, googleProxyURL, abstract, ytimg } from './constants.js';

const interval = setInterval(script, 2000);

// bottom bar values

let queueBool = false;
let thumbBool = true;
let loopBool = false;
let hqBool = false;

let y; // store url for changes check
let m; // queue count 
let param; // algorithm parameter
let n = 1; // current queue playing
let c = 249; // quality codec value
let error = "NotAllowedError: Read permission denied.";
let queueList = [];
let storeThumbURL;
let queueVal = 0;
let storeColor = ['#537895', '#09203F'];


// theme picker
colorBtn[0].addEventListener('click', function() {
  bgColor(storeColor[0]);
  bgColor2(storeColor[1]);
  elementColor('#fffc');
});

// dark mode
colorBtn[4].addEventListener('click', function() {
  bgColor('black');
  bgColor2('black');
  elementColor(storeColor[0]);
});


// activate fallback functions when error detected

function er() {
  error = true;
  clearInterval(interval);
  input.classList.toggle('hidden');
}

// Fallback for Firefox

if (navigator.userAgent.indexOf('Firefox') !== -1) {
  er();
}

// audio thumbnail title src

function atsrc(url) {
  fetch(metadata + url)
    .then(res => res.json())
    .then(data => {
      // check if link is valid
      if (data.title !== undefined) {
        // Playback
        audio.classList.remove('hidden');
        audio.src = `https://projectlounge.pw/ytdl/download?url=${data.url}&format=${c}`;
        audio.play();
        // Thumbnail
        if (thumbBool === true) {
          img.src = ytimg + url.match(abstract)[7] + "/maxresdefault.jpg";
            
            if (1==2) {
              img.src = data.thumbnail_url;
            }

          colorjs.prominent(`${googleProxyURL + encodeURIComponent(data.thumbnail_url)}`, {
            format: 'hex',
            group: 25,
            amount: 2,
            sample: 1
          }).then(cols => {
            storeColor = [cols[1], cols[0]];
            bgColor(cols[1]);
            bgColor2(cols[0]);
            elementColor('#fffc');
          });
        }
        else {
          storeThumbURL = data.thumbnail_url;
        }

        // Title
        title.innerHTML = data.title;
        document.querySelector('h5').innerText = data.author_name;
      }
    });
  // so that it does not run again for the same link
  y = url;
}

// next track 

function next() {
  if ((m - n) > -1) {
    atsrc(array[n]);
    document.getElementById('player').setAttribute('data-badge', m - n);
    n++;
  }
}

// local storage saving shortcut

function save(name, key) {
  localStorage.setItem(name, key);
}

// rewind
playerBtn[1].addEventListener('click', () => {
  audio.currentTime += -10;
});

// forward
playerBtn[2].addEventListener('click', () => {
  audio.currentTime += 10;
})

// next in queue
playerBtn[3].addEventListener('click', () => {
  next();
});


// proper link intercepting algorithm

function algorithm(param) {

  if (y != param) {

    // autoplay new id

    if (queueBool == false) {
      atsrc(param);
    }

    // queue new id

    else {

      fetch(metadata + param)
        .then(res => res.json())
        .then(da => {
          if (da.title !== undefined) {
            queueList[m] = da.title;
          }
        });

      m++;
      document.getElementById('player').setAttribute('data-badge', m - n + 1);
      array[m] = y = param;
      audio.onended = () => { next(); }
    }
  }
}

// clipboard copy

function script() {
  navigator.clipboard.readText()
    .then(
      link => {
        algorithm(link)
      }
    )
    .catch(
      err => {
        if (err == error) {
          er();
        }
      }
    );
}

// save current clipboard/input value to array storage

function store() {
  if (error == true) {
    algorithm(input.value);
  }
  else {
    script();
  }
}

playerBtn[0].addEventListener('click', function() {
  store();
});

// input text player

input.oninput = () => {
  algorithm(input.value);
}


// Queue

footBtn[0].addEventListener("click",
  function() {
    if (queueBool == false) {
      m = 0;
      clearInterval(interval);
      playerBtn[0].removeAttribute('disabled');
      playerBtn[3].removeAttribute('disabled');
      store();
      queueBool = true;
      footBtn[0].classList.add('on');
    }
    else {
      location.reload();
    }
  }
);

// Loop

footBtn[1].addEventListener("click",
  function() {
    this.classList.toggle('on');
    if (queueBool == true) {
      location.reload();
    }
    if (loopBool == false) {
      audio.onended = (e) => {
        audio.play();
      };
      loopBool = true;
    }
    else {
      audio.onended = null;
      loopBool = false;
    }
  }
);

// HQ SETTING

if (localStorage.getItem('format') == "yes") {
  footBtn[2].classList.add('on');
  c = 251;
  hqBool = true;
}

footBtn[2].onclick = function() {
  this.classList.toggle('on');
  if (hqBool == false) {
    c = 251;
    hqBool = true;
    save('format', "yes");
  }
  else {
    c = 249;
    hqBool = false;
    save('format', "no");
  }
  atsrc(param);
}


// Thumbnail

if (localStorage.getItem('thum') == "off") {
  thumbBool = false;
}
else {
  footBtn[3].classList.add('on');
  img.classList.remove('hidden');
}

footBtn[3].onclick = function() {
  this.classList.toggle('on');
  img.classList.toggle('hidden');
  if (thumbBool == true) {
    save('thum', "off");
    thumbBool = false;
    img.src = storeThumbURL;
  }
  else {
    save('thum', "on");
    thumbBool = true;
  }
}