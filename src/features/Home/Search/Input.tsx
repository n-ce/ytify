import { For, onCleanup, onMount, Show } from "solid-js";
import { getSearchResults, getSearchSuggestions, playerStore, searchStore, setSearchStore, t } from "@lib/stores";
import { config, idFromURL, player } from "@lib/utils";

export default function() {

  let superInput!: HTMLInputElement;
  const ctrlk = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === "K")
      superInput.focus();
  }

  onMount(() => {

    setTimeout(() => {
      superInput.focus();
    }, 500);
    document.addEventListener('keydown', ctrlk);
    getSearchResults();

  });
  onCleanup(() => {
    document.removeEventListener('keydown', ctrlk);
  });


  function textToSearch(text: string) {
    superInput.blur();
    setSearchStore('suggestions', 'data', []);
    setSearchStore('query', text);
    getSearchResults();
  }

  return (
    <>
      <input
        value={searchStore.query}
        placeholder={t("search_placeholder")}
        type="search"
        ref={superInput}
        class="superInput"
        autocomplete="off"
        onblur={() => {
          setTimeout(() => {
            setSearchStore('suggestions', 'data', []);
          }, 100);
        }}
        oninput={async (e) => {
          const { value } = e.target;
          setSearchStore('query', value);

          if (config.searchBarLinkCapture) {
            const id = idFromURL(value);
            if (id && id !== playerStore.stream.id) {
              player(id);
              return;
            }
          }

          getSearchSuggestions(value);
        }}
        onkeydown={(e) => {
          const { data, index } = searchStore.suggestions;

          if (e.key === 'Enter') {
            e.preventDefault();
            textToSearch(
              data[index] ||
              superInput.value
            );
            return;
          }

          if (e.key === 'ArrowUp') {

            setSearchStore('suggestions', 'index', (index <= 0) ? - 1 : index - 1);
          }

          if (e.key === 'ArrowDown') {
            setSearchStore('suggestions', 'index', (index >= data.length - 1) ? -1 : index + 1);
          }

          document.querySelectorAll('li.hover')[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });

        }}
      />
      <Show
        when={config.searchSuggestions && searchStore.suggestions.data.length > 0}
      >
        <ul class="suggestions">
          <For each={searchStore.suggestions.data}>
            {(item, index) => (

              <li
                classList={{
                  hover: index() === searchStore.suggestions.index
                }}
                onclick={() => {
                  textToSearch(item);
                }}
              >{item}</li>
            )}
          </For>
        </ul>
      </Show>
    </>
  );
}
