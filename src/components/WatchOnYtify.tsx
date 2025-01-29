import { createSignal, For, onMount, Show } from "solid-js";
import { generateImageUrl } from "../lib/imageUtils";
import { store } from "../lib/store";
import { getData } from "../modules/getStreamData";
import { Selector } from "./Settings";
import { proxyHandler } from "../lib/utils";
import { loadingScreen } from "../lib/dom";

export default function WatchOnYtify() {

  const [data, setData] = createSignal({
    video: [] as string[][],
    audio: [] as string[][],
    captions: [] as Captions[]
  });

  let dialog!: HTMLDialogElement;
  let video!: HTMLVideoElement;
  const audio = new Audio();

  onMount(async () => {
    loadingScreen.showModal();
    const data = await getData(store.actionsMenu.id) as unknown as Piped & {
      captions: Captions[],
      videoStreams: Record<'url' | 'type' | 'resolution', string>[]
    };
    loadingScreen.close();

    setData({
      video: data.videoStreams
        .map(f => {
          const codec =
            f.type.includes('avc1') ? 'AVC' :
              f.type.includes('av01') ? 'AV1' : 'VP9';
          return [`${f.resolution} ${codec}`, f.url];
        }),
      audio: data.audioStreams
        .filter(a => !a.url.includes('acont%3Ddubbed'))
        .map(f => {
          const codec =
            f.mimeType.includes('opus') ? 'opus' : 'M4A';
          return [`${f.quality} ${codec}`, f.url];
        }),
      captions: data.captions
    });
  });


  return (
    <dialog
      open
      class='watcher'
      ref={dialog}
    >
      <video
        ref={video}
        controls
        crossorigin="anonymous"
        poster={generateImageUrl(store.actionsMenu.id, 'mq')}
        onplay={() => {
          audio.play();
          audio.currentTime = video.currentTime;
        }}
        onpause={() => {
          audio.pause();
          audio.currentTime = video.currentTime;
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
          const origin = new URL(video.src).origin;

          if (store.api.index < store.api.invidious.length) {
            const proxy = store.api.invidious[store.api.index];
            video.src = video.src.replace(origin, proxy);
            audio.src = audio.src.replace(origin, proxy);

            store.api.index++;
          }
        }}

      >
        <Show when={data().captions.length}>
          <option>Captions</option>
          <For each={data().captions}>
            {(v) =>
              <track
                src={store.api.invidious[0] + v.url}
                srclang={v.label}
              >
              </track>
            }
          </For>
        </Show>

      </video>

      <div>

        <button onclick={() => {
          dialog.close();
          dialog.remove();

        }}>Close</button>

        <Selector

          id='videoCodecSelector'
          label=''
          onChange={_ => {
            video.src = proxyHandler(_.target.value);
            video.currentTime = audio.currentTime;
          }}
          onMount={() => undefined}
        >
          <option>Video</option>
          <For each={data().video}>
            {(f) =>
              <option value={f[1]}>
                {f[0]}
              </option>
            }
          </For>
        </Selector>

        <Selector
          id='audioCodecSelector'
          label=''
          onChange={_ => {
            audio.src = proxyHandler(_.target.value);
            audio.currentTime = video.currentTime;
          }}
          onMount={() => undefined}
        >
          <option>Audio</option>
          <For each={data().audio}>
            {(f) =>
              <option value={f[1]}>
                {f[0] + (f[1].includes('xtags=drc') ? ' DRC' : '')}
              </option>
            }
          </For>
        </Selector>


      </div>
    </dialog >

  );
}
