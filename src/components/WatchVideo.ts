import { loadingScreen, queuelist, title } from "../lib/dom";
import { generateImageUrl } from "../lib/imageUtils";
import player from "../lib/player";
import { getSaved, store } from "../lib/store";
import { handleXtags, proxyHandler, save } from "../lib/utils";
import getStreamData from "../modules/getStreamData";
import Selector from "./Selector";
import { html, render } from 'uhtml';

export default async function(dialog: HTMLDialogElement) {

  loadingScreen.showModal();

  const media = {
    video: [] as string[][],
    captions: [] as Captions[]
  };
  let video!: HTMLVideoElement;
  const audio = new Audio();
  const savedQ = getSaved('watchMode');

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


  const data = await getStreamData(store.actionsMenu.id) as unknown as Piped & {
    captions: Captions[],
    videoStreams: Record<'url' | 'type' | 'resolution', string>[]
  };
  const hasAv1 = data.videoStreams.find(v => v.type.includes('av01'))?.url;
  const hasVp9 = data.videoStreams.find(v => v.type.includes('vp9'))?.url;
  const hasOpus = data.audioStreams.find(a => a.mimeType.includes('opus'))?.url;
  const useOpus = hasOpus && await store.player.supportsOpus;
  const audioArray = handleXtags(data.audioStreams)
    .filter(a => a.mimeType.includes(useOpus ? 'opus' : 'mp4a'))
    .sort((a, b) => parseInt(a.bitrate) - parseInt(b.bitrate));

  if (getSaved('hq')) audioArray.reverse();


  media.video = data.videoStreams
    .filter(f => {
      const av1 = hasAv1 && supportsAv1 && f.type.includes('av01');
      if (av1) return true;
      const vp9 = !hasAv1 && f.type.includes('vp9');
      if (vp9) return true;
      const avc = !hasVp9 && f.type.includes('avc1');
      if (avc) return true;
    })
    .map(f => ([f.resolution, f.url]));

  media.captions = data.captions


  function close() {
    audio.pause();
    video.pause();
    dialog.close();
    dialog.remove();
    title.textContent = store.stream.title || 'Now Playing';
  }

  const videoTemplate = html`

    <video
      ref=${(_: HTMLVideoElement) => video = _}
      controls
      poster=${generateImageUrl(store.actionsMenu.id, 'mq')}
      @play=${() => {
      audio.play();
      audio.currentTime = video.currentTime;
    }}
      @pause=${() => {
      audio.pause();
      audio.currentTime = video.currentTime;
    }}
      @ended=${() => {
      if (!queuelist.childElementCount) return;
      close();
      store.queue.firstChild()?.click();
    }}
      @waiting=${() => {
      if (!audio.paused)
        audio.pause();
    }}
      @timeupdate=${() => {
      const diff = audio.currentTime - video.currentTime;
      const vpr = video.playbackRate;
      const npr = vpr - diff;
      if (npr < 0) return;
      const rpr = Math.round(npr * 100) / 100;
      if (rpr !== audio.playbackRate)
        audio.playbackRate = rpr;

    }}
      @loadstart=${() => {
      if (!audio.paused)
        audio.pause();
    }}
      @playing=${() => {
      if (audio.paused)
        audio.play();
    }}
      @seeked=${() => {
      audio.currentTime = video.currentTime;
    }}
      @ratechange=${() => {
      audio.playbackRate = video.playbackRate;
    }}
      @error=${() => {
      if (video.src.endsWith('&fallback')) return;
      const origin = new URL(video.src).origin;

      if (store.api.index < store.api.invidious.length) {
        const proxy = store.api.invidious[store.api.index];
        video.src = video.src.replace(origin, proxy);
        audio.src = audio.src.replace(origin, proxy);

        store.api.index++;
      }
    }}

    >
      ${media.captions.length ?
      html`
          ${media.captions.map(v => html`
            <track
              src=${store.api.invidious[0] + v.url}
              srclang=${v.label}
            >
            </track>
          `)}
        `: ''
    }
    </video>

  `;

  const footerTemplate = html`

    <div>

      <button @click=${close}>Close</button>

      ${media.video.length ?
      Selector({
        id: 'videoCodecSelector',
        label: '',
        handler: (_) => {
          video.src = proxyHandler(_.target.value);
          video.currentTime = audio.currentTime;
          if (savedQ)
            save('watchMode', _.target.selectedOptions[0].textContent as string);
        },
        children: html`
              <option>Video</option>
              ${media.video.map(f => html`
                <option
                 value=${f[1]}
                 selected=${f[0] === savedQ}
                 >${f[0]}</option>
                `)
          }`,
        onmount: (_) => {
          if (savedQ)
            video.src = proxyHandler(_.value);
        }
      })
      : ''}
    
      <button @click=${() => {
      player(store.actionsMenu.id);
      close();
    }}>Listen</button>

      <br/> <br/>
      <i> Because video streaming consumes a lot of energy, contributing to carbon emissions, please try to watch only what's necessary. When you do stream, select the lowest resolution that meets your needs.</i>
    </div>
    `;

  render(dialog, html`
    ${videoTemplate}
    ${footerTemplate}
  `);

  audio.src = proxyHandler(audioArray[0].url);
  audio.currentTime = video.currentTime;
  loadingScreen.close();
}
