import { lazy, Show } from "solid-js";
import './MiniPlayer.css';
import { config } from "@lib/utils/config";
import { LikeButton, MediaDetails, PlayButton, PlayNextButton } from "./MediaPartials";
import { playerStore, setNavStore } from "@lib/stores";
import { queueStore } from "@lib/stores/queue";


const MediaArtwork = lazy(() => import('./MediaPartials/MediaArtwork'))

export default function() {

  return (
    <div class='miniplayer' onclick={(e) => {
      if (!e.target.matches('button'))
        setNavStore('player', 'state', true);
    }
    }>
      <progress value={((playerStore.currentTime / playerStore.fullDuration) || 0).toFixed(3)}></progress>
      <Show when={config.loadImage}>
        <MediaArtwork />
      </Show>
      <MediaDetails />
      <PlayButton />
      <Show when={queueStore.list.length} fallback={<LikeButton />}>
        <PlayNextButton />
      </Show>
    </div>
  )
}
