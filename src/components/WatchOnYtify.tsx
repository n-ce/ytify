import { createSignal, For, onMount } from "solid-js";
import { generateImageUrl } from "../lib/imageUtils";
import { store } from "../lib/store";
import { getData } from "../modules/getStreamData";
import { Selector } from "./Settings";
import { proxyHandler } from "../lib/utils";

export default function WatchOnYtify() {

  const [vFormats, setVF] = createSignal([] as string[][]);
  const [aFormats, setAF] = createSignal([] as string[][]);
  const audio = new Audio();

  let dialog!: HTMLDialogElement;
  let video!: HTMLVideoElement;

  onMount(async () => {
    const data = await getData(store.actionsMenu.id) as unknown as Piped & {
      videoStreams: Record<'url' | 'type' | 'resolution', string>[]
    };

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
          video.currentTime = audio.currentTime;
          audio.play();
        }}
        onpause={() => {
          video.currentTime = audio.currentTime;
          audio.pause();
        }}
        onerror={() => {
          const origin = new URL(video.src).origin;

          if (store.api.index < store.api.invidious.length) {
            const proxy = store.api.invidious[store.api.index];
            video.src = video.src.replace(origin, proxy);
            store.api.index++;
          }
        }}

      ></video>

      <span>

        <button onclick={() => {
          dialog.close();
          dialog.remove();

        }}>Close </button>

        <Selector

          id='videoCodecSelector'
          label=''
          onChange={_ => {
            video.src = proxyHandler(_.target.value);
          }}
          onMount={() => undefined}
        >
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
            audio.src = proxyHandler(_.target.value)
          }}
          onMount={() => undefined}
        >
          <For each={aFormats()}>
            {(f) =>
              <option value={f[1]}>
                {f[0]}
              </option>
            }
          </For>
        </Selector>

      </span>
    </dialog >

  );
}
