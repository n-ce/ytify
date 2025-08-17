import { createSignal, For, onCleanup, onMount } from "solid-js";
import { dialogState, openDialog, store } from "../../lib/stores";

export default function(_: {
  close: () => void
}) {

  const [lrcMap, setLrcMap] = createSignal(['']);
  let lyricsSection!: HTMLElement;

  onMount(() => {
    const { title, author } = dialogState.data as CollectionItem;
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
          openDialog('snackbar', JSON.stringify(data));
        }


      });
  });
  onCleanup(() => {
    store.lrcSync = () => '';
  })

  return (
    <section ref={lyricsSection} onclick={_.close}>
      <For each={lrcMap()}>
        {(item) => (<p>{item}</p>)}
      </For>
    </section>
  );

}
