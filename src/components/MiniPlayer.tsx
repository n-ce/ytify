import { lazy, Show } from "solid-js";
import './MiniPlayer.css';
import { config } from "../lib/utils/config";
import { LikeButton, MediaDetails, PlayButton, PlayNextButton } from "./MediaPartials";
import { playerStore, store } from "../lib/stores";


const MediaArtwork = lazy(() => import('./MediaPartials/MediaArtwork'))

export default function(_: {
  handleClick: () => void
}) {
  return (
    <footer onclick={(e) => {
      if (!e.target.matches('button'))
        _.handleClick();
    }
    }>
      <progress value={playerStore.currentTime / playerStore.fullDuration}></progress>
      <Show when={config.loadImage}>
        <MediaArtwork />
      </Show>
      <MediaDetails />
      <PlayButton />
      <Show when={store.queuelist.length} fallback={<LikeButton />}>
        <PlayNextButton />
      </Show>
    </footer>
  )
}
