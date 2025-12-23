import { createSignal, For, createEffect, Show } from "solid-js";
import { config, generateImageUrl, getApi, proxyHandler, setConfig } from "@lib/utils";
import { playerStore, playNext, setPlayerStore, setStore, store, t } from "@lib/stores";
import { queueStore } from "@lib/stores/queue";

export default function() {

  const [data, setData] = createSignal({
    video: [] as string[][],
    captions: [] as Invidious['captions']
  });
  let video!: HTMLVideoElement;
  let selector!: HTMLSelectElement;


  const savedQ = config.watchMode || { worst: '144p', low: '240', medium: '360p', high: '720p' }[config.quality];

  createEffect(async () => {
    if (!playerStore.stream.id) return;
    playerStore.audio.pause();

    const supportsAv1 = await navigator.mediaCapabilities
      .decodingInfo({
        type: 'file',
        video: {
          contentType: 'video/mp4; codecs="av01.0.00M.08"',
          bitrate: 1e7,
          framerate: 22,
          height: 720,
          width: 1280
        }
      })
      .then(result => result.supported);


    const data = playerStore.data as Invidious;

    const hasAv1 = data.adaptiveFormats.filter(v => v.type?.includes('av01')).length === 4 ? data.adaptiveFormats.find(v => v.type?.includes('av01'))?.url : false;
    const hasVp9 = data.adaptiveFormats.find(v => v.type?.includes('vp9'))?.url;

    video.currentTime = playerStore.audio.currentTime;
    setData({
      video: data.adaptiveFormats
        .filter(f => {
          if (!f.type.startsWith('video')) return false;
          const av1 = hasAv1 && supportsAv1 && f.type?.includes('av01');
          if (av1) return true;
          const vp9 = !hasAv1 && f.type?.includes('vp9');
          if (vp9) return true;
          const avc = !hasVp9 && f.type?.includes('avc1');
          if (avc) return true;
          return false;
        })
        .map(f => ([f.resolution || f.quality, f.url])),
      captions: data.captions.map(c => ({
        ...c,
        url: getApi() + c.url
      }))
    });

    if (video.src) {
      video.src = '';
      video.pause();
    }
    if (savedQ)
      video.src = proxyHandler(selector.value, true);

  });

  function close() {
    video.pause();
    setPlayerStore('status', '');
    setPlayerStore('isWatching', false);
  }

  return (
    <div class='watcher'>
      <video
        ref={video}
        controls
        crossorigin="anonymous"
        poster={generateImageUrl(playerStore.stream.id, 'mq')}
        onplay={() => {
          video.currentTime = playerStore.audio.currentTime;
          playerStore.audio.play();
        }}
        onpause={() => {
          if (playerStore.isWatching)
            playerStore.audio.pause();
          playerStore.audio.currentTime = video.currentTime;
        }}
        onended={() => {
          if (!queueStore.list.length) {
            close();
            playNext();
          }
        }}
        onwaiting={() => {
          if (!playerStore.audio.paused)
            playerStore.audio.pause();
        }}
        ontimeupdate={() => {
          const diff = playerStore.audio.currentTime - video.currentTime;
          const vpr = video.playbackRate;
          const npr = vpr - diff;
          if (npr < 0) return;
          const rpr = Math.round(npr * 100) / 100;
          if (rpr !== playerStore.audio.playbackRate)
            playerStore.audio.playbackRate = rpr;

        }}
        onloadstart={() => {
          video.currentTime = playerStore.audio.currentTime;
          video.play();
        }}
        onplaying={() => {
          if (playerStore.audio.paused)
            playerStore.audio.play();
        }}
        onseeked={() => {
          playerStore.audio.currentTime = video.currentTime;
        }}
        onratechange={() => {
          playerStore.audio.playbackRate = video.playbackRate;
        }}
        onerror={() => {
          if (video.src.endsWith('&fallback')) return;
          const origin = new URL(video.src).origin;
          const { invidious, index } = store;


          if (index < invidious.length) {

            const proxy = invidious[index];
            video.src = video.src.replace(origin, proxy);
            playerStore.audio.src = playerStore.audio.src.replace(origin, proxy);

            setStore('index', index + 1);
          }
        }}

      >
        <Show when={data().captions.length}>
          <For each={data().captions}>
            {(v) =>
              <track
                kind="subtitles"
                src={v.url}
                srclang={v.language_code}
                label={v.label}
              >
              </track>
            }
          </For>
        </Show>

      </video>

      <div>

        <button onclick={close}>{t('close')}</button>

        <select
          ref={selector}
          onchange={_ => {
            video.src = proxyHandler(_.target.value, true);
            video.currentTime = playerStore.audio.currentTime;
            if (config.watchMode)
              setConfig('watchMode', _.target.selectedOptions[0].textContent as string);
          }}
        >

          <option>{t('player_video_resolution')}</option>
          <For each={data().video}>
            {(f) =>
              <option value={f[1]} selected={f[0] === savedQ}>
                {f[0]}
              </option>
            }
          </For>
        </select>
      </div>
    </div>

  );
}
