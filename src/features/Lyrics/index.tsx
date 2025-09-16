import { createSignal, For, onMount } from "solid-js";
import { closeFeature, openFeature, setPlayerStore, setStore, store } from "../../lib/stores";

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
    const { title, author } = store.actionsMenu;
    fetch(
      `https://lrclib.net/api/get?track_name=${title}&artist_name=${author.slice(0, -8)}`,
      {
        headers: {
          'Lrclib-Client': `ytify ${Build} (https://github.com/n-ce/ytify)`
        }
      })
      .then(res => res.json())
      .then(data => {

        const lrc = data.syncedLyrics;

        if (lrc) {
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
          setStore('snackbar', JSON.stringify(data));
          closeFeature('lyrics');
        }


      });
  });

  return (
    <section
      ref={lyricsSection}
      onclick={() => {
        closeFeature('lyrics');
        setPlayerStore('lrcSync', undefined);
      }}
    >
      <For each={lrcMap()}>
        {(item, i) => (
          <p style={
            activeLine() === i() ?
              activePStyle : pStyle
          } >{item}</p>)}
      </For>
    </section>
  );

}
