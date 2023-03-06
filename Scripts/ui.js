

// constants

const convertSStoHHMMSS = (seconds) => {
  const hh = Math.floor(seconds / 3600);
  seconds %= 3600;
  let mm = Math.floor(seconds / 60);
  let ss = Math.floor(seconds % 60);
  if (mm < 10) mm = `0${mm}`;
  if (ss < 10) ss = `0${ss}`;
  if (hh > 0) return `${hh}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

const palette = {
  'light': {
    bg: 'none',
    accent: '#fff5',
    text: '#000b',
    border: '#000b'
  },
  'dark': {
    bg: '#000',
    accent: '#000',
    text: '#fff',
    border: 'none'
  }
};
let theme;

const themer = () => {

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width = $('img').width;
  canvas.height = $('img').height;
  context.drawImage($('img'), 0, 0, 1, 1);

  const [r,g,b] = context.getImageData(0, 0, 1, 1).data;

  getSaved('theme') ?
    theme = 'dark' :
    theme = 'light';

  if (r+g+b < 85 || r+g+b > 680) r = g = b = 127;

  palette['light'].bg = palette['dark'].border = `rgb(${r},${g},${b})`;

  $(':root').style.setProperty('--bg', palette[theme].bg);
  $(':root').style.setProperty('--accent', palette[theme].accent);
  $(':root').style.setProperty('--text', palette[theme].text);
  $(':root').style.setProperty('--border', palette[theme].border);
  $('meta[name="theme-color"]').setAttribute("content", palette[theme].bg);

}

$('img').addEventListener('load', themer);

if (!params.get('s') && !params.get('text'))
  $('img').src = 'Assets/default_thumbnail.avif';



// settings panel toggle

let settingsPanel = true;
let style;

$('#settingsButton').addEventListener('click',
  () => {
    settingsPanel ?
      style = ['rotate(180deg) scale(0.9)', 'flex'] :
      style = ['rotate(0deg)', 'none'];
    $('#settingsButton i').style.transform = style[0];
    $('#settingsContainer').style.display = style[1];
    $('#settingsButton i').classList.toggle('on');
    settingsPanel = !settingsPanel;
  });



// Theme toggle

if (getSaved('theme')) $('#themeButton i').classList.add('on');

$('#themeButton').addEventListener('click', () => {
  getSaved('theme') ?
    localStorage.removeItem('theme') :
    save('theme', 'dark');
  $('#themeButton i').classList.toggle('on');
  themer();
});



// fullscreen

$('#fullscreenButton').addEventListener('click',
  () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      $('#fullscreenButton i').classList.remove('on');
    } else {
      document.documentElement.requestFullscreen();
      $('#fullscreenButton i').classList.add('on');
    }
  });



// thumbnail toggle

let thumbnail = true;

if (getSaved('thumbnail')) localStorage.removeItem('thumbnail');

$('#thumbnailButton').addEventListener('click', () => {
  if (thumbnail) {
    save('thumbnail', $('img').src);
  } else {
    $('img').src = getSaved('thumbnail');
    localStorage.removeItem('thumbnail');
  }
  thumbnail = !thumbnail;
  $('#thumbnailButton i').classList.toggle('on');
  $('img').classList.toggle('hide');
});



// quality

if (getSaved('quality') == 'hq')
  $('#qualityButton i').classList.add('on');

$('#qualityButton').addEventListener('click', () => {

  $('#qualityButton i').classList.toggle('on');

  getSaved('quality') ?
    localStorage.removeItem('quality') : // low
    save('quality', 'hq'); // high

  if (params.get('s'))
    location.href += '&t=' + Math.floor($('audio').currentTime);
});

// Feedback Button

$('#feedbackButton').addEventListener('click', async () => {
  $('input[type="text"]').value = await prompt('Enter your feedback (bugs, feature requests) here:');
  if ($('input[type="text"]').value) document.forms[0].submit();
})



// bitrate selector

$('#bitrateSelector').addEventListener('change', () => {
  const ct = $('audio').currentTime;
  $('audio').src = $('#bitrateSelector').value;
  $('audio').currentTime = ct;
  $('audio').play();
});


// Feedback Button

$('#feedbackButton').addEventListener('click', async () => {
  $('input[type="text"]').value = await prompt('Enter your feedback (bugs, feature requests) here:');
  if ($('input[type="text"]').value) document.forms[0].submit();
})



// bitrate selector

$('#bitrateSelector').addEventListener('change', () => {
  const ct = $('audio').currentTime;
  $('audio').src = $('#bitrateSelector').value;
  $('audio').currentTime = ct;
  $('audio').play();
});



// play button and events

let playback = true;

$('#playButton').addEventListener('click', () => {
  playback ?
    $('audio').play() :
    $('audio').pause();
  playback = !playback;
});

$('audio').addEventListener('playing', () => {
  $('#playButton').classList.replace($('#playButton').classList[0], 'ri-pause-fill');
  playback = false;
});

$('audio').addEventListener('pause', () => {
  $('#playButton').classList.replace('ri-pause-fill', 'ri-play-fill');
  playback = true;
});

$('audio').addEventListener('loadeddata', () => {
  $('#playButton').classList.replace('spinner', 'ri-play-fill');
  $('#playButton').classList.add('on');
  if ($('input[type="url"]').value) $('audio').play();
})


$('audio').addEventListener('loadeddata', () => {
  $('#playButton').classList.replace('spinner', 'ri-play-fill');
  if ($('input[type="url"]').value) $('audio').play();
})

// PLAYBACK SPEED

$('#playSpeed').addEventListener('change', () => {
  if ($('#playSpeed').value < 0 || $('#playSpeed').value > 4) {
    return;
  }
  $('audio').playbackRate = playSpeed.value;
  $('#playSpeed').blur();
});



// Seek Forward && Backward

$('#seekFwdButton').addEventListener('click', 
() => $('audio').currentTime += 10);

$('#seekBwdButton').addEventListener('click',
() => $('audio').currentTime -= 10);



// PROGRESS Bar event

$('#progress').addEventListener('change', () => {
  if ($('#progress').value < 0 || $('#progress').value > $('audio').duration) {
    return;
  }
  $('audio').currentTime = $('#progress').value;
  $('#progress').blur();
});

$('audio').addEventListener('timeupdate', () => {
  if ($('#progress') === document.activeElement) return;

  $('#progress').value = Math.floor($('audio').currentTime);
  $('#currentDuration').innerText = convertSStoHHMMSS($('audio').currentTime);
});

$('audio').addEventListener('loadedmetadata', () => {
  $('#progress').value = 0;
  $('#progress').min = 0;
  $('#progress').max = Math.floor($('audio').duration);
  $('#fullDuration').innerText = convertSStoHHMMSS($('audio').duration);
});



// Loop

let loop = false;

$('audio').onended = () => {
  if (loop) $('audio').play();
  else {
    $('#playButton').classList.replace('ri-play-fill', 'ri-stop-fill');
    playback = true;
  }
};

$('#loopButton').addEventListener('click', () => {
  $('#loopButton i').classList.toggle('on');
  loop = !loop;
});