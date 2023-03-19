import {
  $,
  params,
  themer,
  getSaved,
  save,
  convertSStoHHMMSS
} from './constants.js';



// settings panel toggle

let settingsPanel = true;
let style;

$('settingsButton').addEventListener('click',
  () => {
    settingsPanel ?
      style = ['rotate(180deg) scale(0.9)', 'flex'] :
      style = ['rotate(0deg)', 'none'];
    $('settings_i').style.transform = style[0];
    $('settingsContainer').style.display = style[1];
    $('settings_i').classList.toggle('on');
    settingsPanel = !settingsPanel;
  });



// Theme toggle

if (getSaved('theme')) $('theme_i').classList.add('on');

$('themeButton').addEventListener('click', () => {
  getSaved('theme') ?
    localStorage.removeItem('theme') :
    save('theme', 'dark');
  $('theme_i').classList.toggle('on');
  themer();
});



// fullscreen

$('fullscreenButton').addEventListener('click',
  () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      $('fullscreen_i').classList.remove('on');
    } else {
      document.documentElement.requestFullscreen();
      $('fullscreen_i').classList.add('on');
    }
  });



// thumbnail toggle

let thumbnail = true;

$('thumbnailButton').addEventListener('click', () => {
  if (thumbnail) {
    save('thumbnail', $('img').src);
  } else {
    $('img').src = getSaved('thumbnail');
    localStorage.removeItem('thumbnail');
  }
  thumbnail = !thumbnail;
  $('thumbnail_i').classList.toggle('on');
  $('img').classList.toggle('hide');
});



// quality

if (getSaved('quality') == 'hq')
  $('quality_i').classList.add('on');

$('qualityButton').addEventListener('click', () => {

  $('quality_i').classList.toggle('on');

  getSaved('quality') ?
    localStorage.removeItem('quality') : // low
    save('quality', 'hq'); // high

  if (params.get('s'))
    location.href += '&t=' + Math.floor($('audio').currentTime);
});



// Feedback Button

$('feedbackButton').addEventListener('click', async () => {
  $('input[type="text"]').value = await prompt('Enter your feedback (bugs, feature requests) here:');
  if ($('input[type="text"]').value) document.forms[0].submit();
})



// bitrate selector

$('bitrateSelector').addEventListener('change', () => {
  const ct = $('audio').currentTime;
  $('audio').src = $('bitrateSelector').value;
  $('audio').currentTime = ct;
  $('audio').play();
});



// play button and events

let playback = true;

$('playButton').addEventListener('click', () => {
  playback ?
    $('audio').play() :
    $('audio').pause();
  playback = !playback;
});

$('audio').addEventListener('playing', () => {
  $('playButton').classList.replace($('playButton').classList[0], 'ri-pause-fill');
  playback = false;
});

$('audio').addEventListener('pause', () => {
  $('playButton').classList.replace('ri-pause-fill', 'ri-play-fill');
  playback = true;
});

$('audio').addEventListener('loadeddata', () => {
  $('playButton').classList.replace('spinner', 'ri-play-fill');
  $('playButton').classList.add('on');
  if ($('inputUrl').value) $('audio').play();
})


$('audio').addEventListener('loadeddata', () => {
  $('playButton').classList.replace('spinner', 'ri-play-fill');
  if ($('inputUrl').value) $('audio').play();
})

// PLAYBACK SPEED

$('playSpeed').addEventListener('change', () => {
  if ($('playSpeed').value < 0 || $('playSpeed').value > 4) {
    return;
  }
  $('audio').playbackRate = playSpeed.value;
  $('playSpeed').blur();
});



// Seek Forward && Backward

$('seekFwdButton').addEventListener('click', 
() => $('audio').currentTime += 10);

$('seekBwdButton').addEventListener('click',
() => $('audio').currentTime -= 10);



// PROGRESS Bar event

$('progress').addEventListener('change', () => {
  if ($('progress').value < 0 || $('progress').value > $('audio').duration) {
    return;
  }
  $('audio').currentTime = $('progress').value;
  $('progress').blur();
});

$('audio').addEventListener('timeupdate', () => {
  if ($('progress') === document.activeElement) return;

  $('progress').value = Math.floor($('audio').currentTime);
  $('currentDuration').textContent = convertSStoHHMMSS($('audio').currentTime);
});

$('audio').addEventListener('loadedmetadata', () => {
  $('progress').value = 0;
  $('progress').min = 0;
  $('progress').max = Math.floor($('audio').duration);
  $('fullDuration').textContent = convertSStoHHMMSS($('audio').duration);
});



// Loop

let loop = false;

$('audio').onended = () => {
  if (loop) $('audio').play();
  else {
    $('playButton').classList.replace('ri-play-fill', 'ri-stop-fill');
    playback = true;
  }
};

$('loopButton').addEventListener('click', () => {
  $('loop_i').classList.toggle('on');
  loop = !loop;
});
