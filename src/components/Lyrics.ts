import { html, render } from "uhtml";
import { store } from "../lib/store";
import { notify } from "../lib/utils";
import { loadingScreen } from "../lib/dom";


export default async function(dialog: HTMLDialogElement) {
  loadingScreen.showModal();

  const data = await fetch(
    `https://lrclib.net/api/get?track_name=${store.actionsMenu.title}&artist_name=${store.actionsMenu.author.slice(0, -8)}`,
    {
      headers: {
        'Lrclib-Client': `ytify ${Build} (https://github.com/n-ce/ytify)`
      }
    })
    .then(res => res.json())
    .finally(() => loadingScreen.close());

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

    let active = -1;

    store.lrcSync = (d: number) => {
      const p = dialog.firstElementChild!.children;
      const i = durarr.findIndex(da => Math.abs(da - d) < 1);

      if (i + 1 === durarr.length)
        return dialog.click();

      if (i < 0 || active === i)
        return;

      dialog.querySelectorAll('.active').forEach(el => { el.className = '' });
      p[i].scrollIntoView({
        block: 'center',
        behavior: 'smooth'
      });
      p[i].className = 'active';

      active = i;
    }

    render(dialog, html`
      <section>
      ${lrcMap.map(v => html`<p>${v}</p>`)}
      </section>
    `);
    dialog.showModal();
  }

  else {
    notify(data.message);
    dialog.remove();
  }

}
