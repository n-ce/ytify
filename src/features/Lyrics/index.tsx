import { createSignal, For, onMount } from "solid-js";
import { closeFeature, openFeature, playerStore, setPlayerStore, setStore } from "../../lib/stores";

export default function() {

  const [lrcMap, setLrcMap] = createSignal(['Loading...']);
  const [activeLine, setActiveLine] = createSignal(-1);
  let lyricsSection!: HTMLElement;

  const pStyle = { 'margin-top': 'var(--size-3)' };
  const activePStyle = {
    ...pStyle,
    'font-weight': 'var(--font-weight-5)',
    'font-size': 'var(--font-size-3)'
  };

  onMount(() => {
    openFeature('lyrics', lyricsSection);
    fetch(`https://api-lyrics.simpmusic.org/v1/${playerStore.stream.id}?limit=1`)
      .then(res => res.json())
      .then(data => {

        if (data.success) {
          const lrc = data.data[0].syncedLyrics;

          const durarr: number[] = [];
          const lrcMap: string[] = lrc
            .split('\n')
            .map((line: string) => {
              const [d, l] = line.split(']');
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

              lyricsSection.children[i].scrollIntoView({
                block: 'center',
                behavior: 'smooth'
              });
            }
          });

        }
        else {
          setStore('snackbar', data.error.reason || JSON.stringify(data));
          closeFeature('lyrics');
        }


      });
  });

  return (
    <section ref={lyricsSection}>
      <header>
        <p style={{
          'margin-right': 'auto'
        }}>Lyrics</p>
        <i
          onclick={() => {
            closeFeature('lyrics');
            setPlayerStore('lrcSync', undefined);
          }}
          class="ri-close-large-line"
        ></i>
      </header>
      <For each={lrcMap()}>
        {(item, i) => (
          <p
            onclick={() => {
              playerStore.audio.pause();
            }}
            style={
              activeLine() === i() ?
                activePStyle : pStyle
            } >{item}</p>)}
      </For>
    </section>
  );

}
