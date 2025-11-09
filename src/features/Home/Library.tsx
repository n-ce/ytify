import { For } from "solid-js";
import Collections from "./Collections";
import SubLists from "./SubLists";

export default function() {
  return (
    <div class='library'>
      <Collections />
      <br />
      <br />
      <For each={['albums', 'playlists', 'channels']}>
        {(item) =>
          <SubLists flag={item as 'albums' | 'playlists' | 'channels'} />
        }
      </For>
    </div>
  );
}
