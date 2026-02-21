import { createSignal, For, onMount, onCleanup } from "solid-js";
import { playerStore, setPlayerStore, setStore, t } from "@stores";

export default function(props: { onClose: () => void }) {

  const [lrcMap, setLrcMap] = createSignal([t('loading')]);
  const [activeLine, setActiveLine] = createSignal(-1);
  let lyricsSection!: HTMLDivElement;

  onMount(() => {
    const { title, author } = playerStore.stream;
    if (!author) {
      setStore('snackbar', t('lyrics_artist_not_available'));
      props.onClose();
      return;
    }
    fetch(
      `https://lrclib.net/api/get?track_name=${title}&artist_name=${author.slice(0, -8)}&duration=${playerStore.fullDuration}`,
      {
        headers: {
          'Lrclib-Client': `ytify ${Build} (https://github.com/n-ce/ytify)`
        }
      })
      .then(res => res.json())
      .then(data => {

        const lrc = data.syncedLyrics;
        const fetchedDuration = data.duration;
        const localDuration = playerStore.fullDuration;

        let offset = 0;
        if (fetchedDuration && localDuration) {
          offset = (localDuration - fetchedDuration) / 2;
        }

        if (lrc) {
          const durarr: number[] = [];
          const lrcMap: string[] = lrc
            .split('\n')
            .map((line: string) => {
              const [d, l] = line.split(']');
              if (!l) return '...';
              const [mm, ss] = d.substring(1).split(':');
              const s = (parseInt(mm) * 60) + parseFloat(ss);
              durarr.push(s - offset);
              return l;
            });
          setLrcMap(lrcMap);


          setPlayerStore({
            lrcSync: (d: number) => {
              let currentIndex = -1;
              const { length } = durarr;
              for (let i = 0; i < length; i++) {
                if (durarr[i] <= d) {
                  currentIndex = i;
                } else {
                  break;
                }
              }

              if (currentIndex !== activeLine()) {
                setActiveLine(currentIndex);

                if (currentIndex < 0) return;

                if (lyricsSection.children[currentIndex]) {
                  lyricsSection.children[currentIndex].scrollIntoView({
                    block: 'center',
                    behavior: 'smooth'
                  });
                }
              }
            }
          });

        }
        else {
          setStore('snackbar', t('lyrics_no_found'));
          props.onClose();
        }
      }).catch(() => {
        setStore('snackbar', t('lyrics_failed'));
        props.onClose();
      });
  });

  onCleanup(() => {
    setPlayerStore('lrcSync', undefined);
  });

  return (
    <div ref={lyricsSection} class="lyrics">
      <For each={lrcMap()}>
        {(item, i) => (
          <p
            classList={{ active: activeLine() === i() }}
          >{item}</p>)}
      </For>
    </div>
  );
}
