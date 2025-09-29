import { createSignal, For, onMount, onCleanup } from "solid-js";
import { playerStore, setPlayerStore, setStore } from "../../lib/stores";

export default function(props: { onClose: () => void }) {

  const [lrcMap, setLrcMap] = createSignal(['Loading...']);
  const [activeLine, setActiveLine] = createSignal(-1);
  let lyricsSection!: HTMLDivElement;

  onMount(() => {
    fetch(`https://api-lyrics.simpmusic.org/v1/${playerStore.stream.id}?limit=1`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const { syncedLyrics, durationSeconds } = data.data[0];
          const diff = durationSeconds - playerStore.fullDuration;
          if (Math.abs(diff) > 5)
            throw new Error('Duration Mismatch');

          const durarr: number[] = [];
          const lrcMap: string[] = syncedLyrics
            .split('\n')
            .map((line: string) => {
              const [d, l] = line.split(']');
              if (!l) return '...';
              const [mm, ss] = d.substring(1).split(':');
              const s = (parseInt(mm) * 60) + parseFloat(ss);
              durarr.push(s);
              return l;
            });
          setLrcMap(lrcMap);

          setPlayerStore({
            lrcSync: (d: number) => {
              const i = durarr.findIndex(da => Math.abs(da - d) < 1);
              setActiveLine(i);
              if (i < 0) return;
              if (i + 1 === durarr.length)
                return lyricsSection.click();

              if (lyricsSection.children[i]) {
                lyricsSection.children[i].scrollIntoView({
                  block: 'center',
                  behavior: 'smooth'
                });
              }
            }
          });
        }
        else throw new Error(data.error.reason || 'Track Not Found');
      }).catch(e => {
        setStore('snackbar', e.message);
        props.onClose();
      })
  });

  onCleanup(() => {
    setPlayerStore('lrcSync', undefined);
  });

  return (
    <div ref={lyricsSection} class="lyrics">
      <For each={lrcMap()}>
        {(item, i) => (
          <p
            class="lyric-line"
            classList={{ active: activeLine() === i() }}
          >{item}</p>)}
      </For>
    </div>
  );
}

