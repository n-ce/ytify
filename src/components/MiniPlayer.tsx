import { JSX, lazy, Show } from "solid-js";
import './miniPlayer.css';
import { state, store } from "../lib/store";
import LikeButton from "../components/LikeButton";
import PlayButton from "../components/PlayButton";
import MediaDetails from "../components/MediaDetails";

const MediaArtwork = lazy(() => import('../components/MediaArtwork'));

export default function(_: {
  playNextBtn: JSX.Element,
  handleClick: () => void
}) {
  return (
    <footer onclick={(e) => {
      if (!e.target.matches('button'))
        _.handleClick();
    }
    }>
      <progress value="0.35" ></progress>
      <Show when={state.loadImage}><MediaArtwork />
      </Show>
      <MediaDetails />
      <PlayButton />
      {store.queuelist.length ? _.playNextBtn : <LikeButton />}
    </footer>
  )
}
