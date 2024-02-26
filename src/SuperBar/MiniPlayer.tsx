import { createSignal } from "solid-js";



export default function MiniPlayer() {

  const [isPlaying, setIsPlaying] = createSignal(true);


  return (
    <div id="MiniPlayer">
      <p>Now Playing</p>
      <button
        class={isPlaying() ? "ri-pause-circle-fill" : "ri-play-circle-fill"}
        onClick={() => setIsPlaying(!isPlaying())}></button>
    </div>
  );
}
