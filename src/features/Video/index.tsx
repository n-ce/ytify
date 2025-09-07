import { createSignal, For, onMount, Show } from "solid-js";
import { config, generateImageUrl, handleXtags, preferredStream, proxyHandler, setConfig, player } from "../../lib/utils";
import { closeFeature, openFeature, playerStore, setListStore, setPlayerStore, store } from "../../lib/stores";
import { Selector } from "../../components/Selector";
import { queueStore } from "../../lib/stores/queue";

export default function() {

  const [data, setData] = createSignal({
    video: [] as string[][],
    subtitles: [] as Record<'url' | 'name' | 'label', string>[]
  });
  let dialog!: HTMLDialogElement;
  let video!: HTMLVideoElement;
  const audio = new Audio();
  const savedQ = config.watchMode;

  onMount(async () => {
    openFeature('video', dialog);

    setListStore('isLoading', true);

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

    const data = await import('../../lib/modules/getStreamData').then(mod => mod.default(playerStore.stream.id) as unknown as Piped & {
      videoStreams: Record<'url' | 'codec' | 'resolution' | 'quality', string>[]
    });

    const hasAv1 = data.videoStreams.filter(v => v.codec?.includes('av01')).length === 4 ? data.videoStreams.find(v => v.codec?.includes('av01'))?.url : false;
    const hasVp9 = data.videoStreams.find(v => v.codec?.includes('vp9'))?.url;
    const hasOpus = data.audioStreams.find(a => a.mimeType.includes('webm'))?.url;
    const useOpus = hasOpus && await playerStore.supportsOpus;
    const audioArray = handleXtags(data.audioStreams)
      .filter(a => a.mimeType.includes(useOpus ? 'webm' : 'mp4a'))
      .sort((a, b) => parseInt(a.bitrate) - parseInt(b.bitrate));


    const audioStream = await preferredStream(handleXtags(audioArray));
    audio.src = proxyHandler(audioStream.url, true);
    audio.currentTime = video.currentTime;
    setListStore('isLoading', false);
    setData({
      video: data.videoStreams
        .filter(f => {
          const av1 = hasAv1 && supportsAv1 && f.codec?.includes('av01');
          if (av1) return true;
          const vp9 = !hasAv1 && f.codec?.includes('vp9');
          if (vp9) return true;
          const avc = !hasVp9 && f.codec?.includes('avc1');
          if (avc) return true;
        })
        .map(f => ([f.resolution || f.quality, f.url])),
      subtitles: data.subtitles
    });
  });

  function close() {
    audio.pause();
    video.pause();
    setPlayerStore('status', '');
    closeFeature('video');
  }

  return (
    <dialog
      open
      class='watcher'
      ref={dialog}
      closedby='closerequest'
    >
      <video
        ref={video}
        controls
        poster={generateImageUrl(playerStore.stream.id, 'mq')}
        onplay={() => {
          audio.play();
          audio.currentTime = video.currentTime;
        }}
        onpause={() => {
          audio.pause();
          audio.currentTime = video.currentTime;
        }}
        onended={() => {
          if (!queueStore.list.length) {
            close();
            // firstItemInQueue().click();
          }
        }}
        onwaiting={() => {
          if (!audio.paused)
            audio.pause();
        }}
        ontimeupdate={() => {
          const diff = audio.currentTime - video.currentTime;
          const vpr = video.playbackRate;
          const npr = vpr - diff;
          if (npr < 0) return;
          const rpr = Math.round(npr * 100) / 100;
          if (rpr !== audio.playbackRate)
            audio.playbackRate = rpr;

        }}
        onloadstart={() => {
          if (!audio.paused)
            audio.pause();
        }}
        onplaying={() => {
          if (audio.paused)
            audio.play();
        }}
        onseeked={() => {
          audio.currentTime = video.currentTime;
        }}
        onratechange={() => {
          audio.playbackRate = video.playbackRate;
        }}
        onerror={() => {
          if (video.src.endsWith('&fallback')) return;
          const origin = new URL(video.src).origin;


          if (store.api.index.invidious < store.api.invidious.length) {
            const proxy = store.api.invidious[store.api.index.invidious];
            video.src = video.src.replace(origin, proxy);
            audio.src = audio.src.replace(origin, proxy);

            store.api.index.invidious++;
          }
        }}

      >
        <Show when={data().subtitles.length}>
          <option>Captions</option>
          <For each={data().subtitles}>
            {(v) =>
              <track
                src={
                  (store.api.status === 'P' ? '' :
                    store.api.invidious[0]) + v.url}
                srclang={v.name || v.label}
              >
              </track>
            }
          </For>
        </Show>

      </video>

      <div>

        <button onclick={close}>Close</button>

        <Show when={data().video.length}>
          <Selector
            id='videoCodecSelector'
            label=''
            onchange={_ => {
              video.src = proxyHandler(_.target.value);
              video.currentTime = audio.currentTime;
              if (savedQ)
                setConfig('watchMode', _.target.selectedOptions[0].textContent as string);
            }}
            value={''}
          >
            <option>Video</option>
            <For each={data().video}>
              {(f) =>
                <option value={f[1]} selected={f[0] === savedQ}>
                  {f[0]}
                </option>
              }
            </For>
          </Selector>
        </Show>

        <button onclick={() => {
          player(playerStore.stream.id);
          close();
        }}>Listen</button>

        <br /><br />
        <i>Because video streaming consumes a lot of energy, contributing to carbon emissions, please try to watch only what's necessary. When you do stream, select the lowest resolution / bitrate that meets your needs.</i>
      </div>
    </dialog >

  );
}
