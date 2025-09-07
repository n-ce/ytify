import { createSignal, For, onCleanup, onMount } from "solid-js";
import { closeFeature, openFeature, setStore, store } from "../../lib/stores";

export default function() {

  const [lrcMap, setLrcMap] = createSignal(['']);
  let lyricsSection!: HTMLElement;

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

          let active = -1;

          store.lrcSync = (d: number) => {
            const p = lyricsSection.firstElementChild!.children;
            const i = durarr.findIndex(da => Math.abs(da - d) < 1);

            if (i + 1 === durarr.length)
              return lyricsSection.click();

            if (i < 0 || active === i)
              return;

            lyricsSection.querySelectorAll('.active').forEach(el => { el.className = '' });
            p[i].scrollIntoView({
              block: 'center',
              behavior: 'smooth'
            });
            p[i].className = 'active';

            active = i;
          }

        }
        else {
          setStore('snackbar', JSON.stringify(data));
        }


      });
  });
  onCleanup(() => {
    store.lrcSync = () => '';
  })

  return (
    <section ref={lyricsSection} onclick={() => { closeFeature('lyrics') }}>
      <For each={lrcMap()}>
        {(item) => (<p>{item}</p>)}
      </For>
    </section>
  );

}
