import { createSignal, For, onMount } from "solid-js";
import { store } from "../lib/store";
import { notify } from "../lib/utils";
import { loadingScreen } from "../lib/dom";

export default function Lyrics() {

  const [lrcMap, setMap] = createSignal([]);
  const [active, setActive] = createSignal(-1);

  let dialog!: HTMLDialogElement;

  onMount(() => {
    loadingScreen.showModal();
    fetch(
      `https://lrclib.net/api/get?track_name=${store.actionsMenu.title}&artist_name=${store.actionsMenu.author.slice(0, -8)}`,
      {
        headers: {
          'Lrclib-Client': `ytify ${Version.substring(0, 3)} (https://github.com/n-ce/ytify)`
        }
      })
      .then(res => res.json())
      .then(data => {
        const lrc = data.syncedLyrics;
        if (lrc) {
          const durarr: number[] = [];
          setMap(
            lrc
              .split('\n')
              .map((line: string) => {
                const [d, l] = line.split(']');
                const [mm, ss] = d.substring(1).split(':');
                const s = (parseInt(mm) * 60) + parseFloat(ss);
                durarr.push(s);
                return l;
              })
          );
          store.lrcSync = (d: number) => {
            const i = durarr.findIndex(da => Math.abs(da - d) < 1);
            if (i + 1 === durarr.length)
              return dialog.click();

            if (i < 0 || active() === i)
              return;
            dialog
              .getElementsByTagName('p')[i + 1]
              .scrollIntoView({
                block: 'center',
                behavior: 'smooth'
              });
            setActive(i);
          }
          dialog.showModal();
        }
        else {
          notify(data.message);
          dialog.remove();
        }
      })
      .finally(() => loadingScreen.close());
  });

  return (
    <dialog
      ref={dialog}
      class="displayer"
      onclick={() => {
        dialog.close();
        dialog.remove();
        store.lrcSync = () => '';
      }}
    >
      <section>
        <For each={lrcMap()}>
          {(v: string, i) =>
            <p
              class={(active() === i() ? 'active' : '')}
            >{v}</p>
          }
        </For>
      </section>
    </dialog>
  );
}

