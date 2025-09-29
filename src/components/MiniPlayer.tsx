import { lazy, Show } from "solid-js";
import './MiniPlayer.css';
import { config } from "@lib/utils/config";
import { LikeButton, MediaDetails, PlayButton, PlayNextButton } from "./MediaPartials";
import { playerStore, setNavStore } from "@lib/stores";
import { queueStore } from "@lib/stores/queue";
import { generateImageUrl } from "@lib/utils";


const MediaArtwork = lazy(() => import('./MediaPartials/MediaArtwork'))

export default function() {
  return (
    <footer onclick={(e) => {
      if (!e.target.matches('button'))
        setNavStore('player', 'state', true);
    }
    }>
      <progress value={(playerStore.currentTime / playerStore.fullDuration) || '0'}></progress>
      <Show when={config.loadImage}>
        <MediaArtwork src={
          generateImageUrl(playerStore.stream.id, 'mq', playerStore.isMusic)
        } />
      </Show>
      <MediaDetails />
      <PlayButton />
      <Show when={queueStore.list.length} fallback={<LikeButton />}>
        <PlayNextButton />
      </Show>
    </footer>
  )
}
