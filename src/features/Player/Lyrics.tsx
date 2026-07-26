import { createSignal, createEffect, onCleanup } from "solid-js";
import { playerStore, setPlayerStore, setStore, t } from "@stores";
import '@uimaxbai/am-lyrics/am-lyrics.js';

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      'am-lyrics': any;
    }
  }
}

function formatMsToTTML(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(3);
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${seconds}`;
}

function jsonToTTML(lyricsList: any[]): string {
  let ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:itunes="http://music.apple.com/lyrics">
  <body>
    <div>\n`;

  lyricsList.forEach((line: any, index: number) => {
    const beginMs = line.time || 0;
    let endMs = beginMs + (line.duration || 0);
    
    if (!line.duration) {
      if (index < lyricsList.length - 1) {
        endMs = lyricsList[index + 1].time || (beginMs + 3000);
      } else {
        endMs = beginMs + 5000;
      }
    }

    const begin = formatMsToTTML(beginMs);
    const end = formatMsToTTML(endMs);

    ttml += `      <p begin="${begin}" end="${end}">\n`;
    if (Array.isArray(line.syllabus) && line.syllabus.length > 0) {
      line.syllabus.forEach((word: any) => {
        const wBegin = formatMsToTTML(word.time || 0);
        const wEnd = formatMsToTTML((word.time || 0) + (word.duration || 0));
        ttml += `        <span begin="${wBegin}" end="${wEnd}">${word.text}</span>\n`;
      });
    } else {
      ttml += `        ${line.text || ''}\n`;
    }
    ttml += `      </p>\n`;
  });

  ttml += `    </div>
  </body>
</tt>`;
  return ttml;
}

function lrcToTTML(lrcString: string): string {
  const lines = lrcString.split('\n');
  const parsedLines: { time: number; text: string }[] = [];

  lines.forEach((line) => {
    const match = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const timeMs = Math.round((minutes * 60 + seconds) * 1000);
      const text = match[3].trim();
      parsedLines.push({ time: timeMs, text });
    }
  });

  return jsonToTTML(parsedLines);
}

function plainToTTML(plainString: string): string {
  const lines = plainString.split('\n');
  let ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:itunes="http://music.apple.com/lyrics">
  <body>
    <div>\n`;
  lines.forEach((line) => {
    ttml += `      <p>${line.trim()}</p>\n`;
  });
  ttml += `    </div>
  </body>
</tt>`;
  return ttml;
}

export default function(props: { onClose: () => void }) {
  const [ttml, setTtml] = createSignal<string>("");
  const [currentTime, setCurrentTime] = createSignal(0);

  createEffect(() => {
    const { title, author, id } = playerStore.stream;
    if (!id) return;
    if (!author) {
      setStore('snackbar', t('lyrics_artist_not_available'));
      props.onClose();
      return;
    }

    setTtml("");
    setCurrentTime(0);
    setPlayerStore('lrcSync', undefined);

    const artistName = author.endsWith(' - Topic') ? author.slice(0, -8) : author;
    fetch(
      `https://mlc-ytify.kouzu.in/api/lyrics/${id}?name=${encodeURIComponent(title)}&artist=${encodeURIComponent(artistName)}`
    )
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.lyrics) && data.lyrics.length > 0) {
          const generatedTtml = jsonToTTML(data.lyrics);
          setTtml(generatedTtml);
        } else if (data.syncedLyrics) {
          const generatedTtml = lrcToTTML(data.syncedLyrics);
          setTtml(generatedTtml);
        } else if (data.plainLyrics) {
          const generatedTtml = plainToTTML(data.plainLyrics);
          setTtml(generatedTtml);
        } else {
          setStore('snackbar', t('lyrics_no_found'));
          props.onClose();
        }
      }).catch(() => {
        setStore('snackbar', t('lyrics_failed'));
        props.onClose();
      });
  });

  createEffect(() => {
    if (!ttml()) return;

    const audio = playerStore.audio;
    if (!audio) return;

    let frameId: number;

    const update = () => {
      setCurrentTime(audio.currentTime * 1000);
      frameId = requestAnimationFrame(update);
    };

    const onPlay = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(update);
    };

    const onPause = () => {
      cancelAnimationFrame(frameId);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('seeking', update);
    audio.addEventListener('seeked', update);

    if (!audio.paused) {
      onPlay();
    } else {
      update();
    }

    onCleanup(() => {
      cancelAnimationFrame(frameId);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('seeking', update);
      audio.removeEventListener('seeked', update);
    });
  });

  onCleanup(() => {
    setPlayerStore('lrcSync', undefined);
  });

  const handleLineClick = (e: any) => {
    const seekMs = e.detail?.timestamp;
    if (typeof seekMs === 'number') {
      const audioEl = document.querySelector('audio');
      if (audioEl) {
        audioEl.currentTime = seekMs / 1000;
        audioEl.play().catch(() => {});
      }
    }
  };

  return (
    <div class="lyrics" style={{
      display: "flex",
      "flex-direction": "column",
      background: "transparent",
      padding: "0",
      overflow: "hidden"
    }}>
      {ttml() ? (
        <am-lyrics
          prop:ttml={ttml()}
          prop:currentTime={currentTime()}
          prop:songTitle={playerStore.stream.title}
          prop:songArtist={playerStore.stream.author}
          prop:fontFamily="var(--font)"
          autoscroll
          interpolate
          on:line-click={handleLineClick}
          style={{
            height: "100%",
            width: "100%",
            "--highlight-color": "var(--text)",
            "--am-lyrics-highlight-color": "var(--text)",
            "--lyplus-lyrics-palette": "var(--text)",
            "--lyplus-text-primary": "var(--text)",
            "--lyplus-text-secondary": "var(--text2)"
          }}
        />
      ) : (
        <p style={{ "text-align": "center", "margin-top": "2rem", "color": "var(--text2)" }}>{t('loading')}</p>
      )}
    </div>
  );
}
