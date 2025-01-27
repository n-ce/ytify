import { createSignal, For, onMount } from "solid-js";
import { generateImageUrl } from "../lib/imageUtils";
import { store } from "../lib/store";
import { getData } from "../modules/getStreamData";
import { Selector } from "./Settings";
import { proxyHandler } from "../lib/utils";
import { loadingScreen } from "../lib/dom";

export default function WatchOnYtify() {

  const [vFormats, setVF] = createSignal([] as string[][]);
  const [aFormats, setAF] = createSignal([] as string[][]);

  let dialog!: HTMLDialogElement;
  let video!: HTMLVideoElement;
  const audio = new Audio();

  onMount(async () => {
    loadingScreen.showModal();
    const data = await getData(store.actionsMenu.id) as unknown as Piped & {
      videoStreams: Record<'url' | 'type' | 'resolution', string>[]
    };
    loadingScreen.close();

    setVF(data.videoStreams
      .map(f => {
        const codec =
          f.type.includes('avc1') ? 'AVC' :
            f.type.includes('av01') ? 'AV1' : 'VP9';
        return [`${f.resolution} ${codec}`, f.url];
      }));

    setAF(
      data.audioStreams.map(f => {
        const codec =
          f.mimeType.includes('opus') ? 'opus' : 'M4A';
        return [`${f.quality} ${codec}`, f.url];
      })
    );

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
          audio.playbackRate = vpr - diff;
          // sync factor
          // console.log(audio.playbackRate - diff);

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

      ></video>

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
          <For each={vFormats()}>
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
          <For each={aFormats()}>
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
