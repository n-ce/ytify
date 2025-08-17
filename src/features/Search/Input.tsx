import { For, onMount, Show } from "solid-js";
import { getSearchResults, getSearchSuggestions, searchStore, setSearchStore, store, t } from "../../lib/stores";
import { config, idFromURL, player } from "../../lib/utils";

export default function() {

  let superInput!: HTMLInputElement;

  onMount(() => {

    setTimeout(() => {
      superInput.focus();
    }, 500);

    // CTRL + K focus search bar
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === "K")
        superInput.focus();
    });
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
          }, 500);
        }}
        oninput={async (e) => {
          const ref = e.target as HTMLInputElement;
          const text = ref.value;
          setSearchStore('query', text);

          const id = idFromURL(text);

          if (id && id !== store.stream.id) {
            player(id);
            return;
          }

          getSearchSuggestions(text);
        }}
        onkeydown={(e) => {
          const { data, index } = searchStore.suggestions;

          if (e.key === 'Enter') {
            e.preventDefault();
            textToSearch(
              data[index] ||
              searchStore.query
            );
            return;
          }

          if (e.key === 'ArrowUp') {
            setSearchStore('suggestions', 'index', (index <= 0) ? data.length - 1 : index - 1);
          }

          if (e.key === 'ArrowDown') {
            setSearchStore('suggestions', 'index', (index >= data.length - 1) ? 0 : index + 1);
          }

        }}
      />
      <Show when={config.searchSuggestions && searchStore.suggestions.data.length > 0}>
        <ul class="suggestions">
          <For each={searchStore.suggestions.data}>
            {(item, index) => (

              <li
                class={index() === searchStore.suggestions.index ? 'hover' : ''}
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
