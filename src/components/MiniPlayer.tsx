import { createSignal } from "solid-js";



export default function MiniPlayer() {

  const [isPlaying, setIsPlaying] = createSignal(true);


  return (
    <div id="MiniPlayer">
      <p>Now Playing</p>
      <button
        onClick={() => setIsPlaying(!isPlaying())}
        class={`ri-${isPlaying() ? 'pause' : 'play'}-circle-fill`}
      >
      </button>
    </div>
  );
}
