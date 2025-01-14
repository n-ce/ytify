import { createSignal, onMount } from "solid-js";
import './UpdatePrompt.css';

export default function UpdatePrompt(handleUpdate: () => void) {

  const [list, setList] = createSignal([<li>Loading Update</li>]);
  const [fullList, setFullList] = createSignal(['']);
  let dialog!: HTMLDialogElement;

  onMount(async () => {
    const data = await fetch('https://api.github.com/repos/n-ce/ytify/commits/main').then(res => res.json());
    const list = data.commit.message.split('-');
    const e = list.map((text: string) => (<li>{text}</li>))
    setList(e);
  });

  const handleFullList = () =>
    fetch('https://raw.githubusercontent.com/wiki/n-ce/ytify/Changelog.md')
      .then(res => res.text())
      .then(text => text.split('\n'))
      .then(e => setFullList(e));


  return (
    <dialog
      id="changelog"
      ref={dialog}
      open
    >
      <ul>
        {list()}
        <hr />
        {fullList().length > 2 ?
          fullList().map((text: string) => (<li>{text}</li>))
          :
          <li onclick={handleFullList}>Read all previous changes</li>
        }
      </ul>
      <span>
        <button onclick={handleUpdate} autofocus> Update</button>
        <button onclick={() => {
          dialog.close();
          dialog.remove();
        }}>Later</button>
      </span>
    </dialog>
  );

}
