import { For, onMount, Show } from "solid-js";
import { getSearchResults, getSearchSuggestions, playerStore, searchStore, setSearchStore, t } from "@lib/stores";
import { config, drawer, idFromURL, player } from "@lib/utils";

export default function() {

  let superInput!: HTMLInputElement;

  onMount(() => {
    if (searchStore.query)
      getSearchResults();
  });

  function textToSearch(text: string) {
    superInput.blur();
    setSearchStore('suggestions', 'data', []);
    setSearchStore('page', 1);
    setSearchStore('results', []);
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
        onpaste={async (e) => {
          const pastedText = e.clipboardData?.getData('text');
          const id = idFromURL(pastedText || '');
          const separators = ['\n', ' ', ','];
          const isBulk = separators.find(separator => pastedText?.includes(separator));

          if (!config.searchBarLinkCapture)
            return;

          if (!id && isBulk) {
            const array = pastedText?.split(isBulk).map(idFromURL).filter(s => s?.length === 11);
            superInput.value = '';
            if (array?.length)
              await import('@lib/modules/bulkCapture')
                .then(mod => mod.default(array as string[]));
            return;
          }

          if (id !== playerStore.stream.id) {
            player(id);
            return;
          }

        }}
        onblur={() => {
          setTimeout(() => {
            setSearchStore('suggestions', 'data', []);
          }, 100);
        }}
        onfocus={() => {
          if (searchStore.query)
            return;
          setSearchStore('suggestions', 'data', drawer.recentSearches);
        }}
        oninput={async (e) => {
          const { value } = e.target;
          setSearchStore('query', value);

          if (!value) {
            setSearchStore('suggestions', 'data', drawer.recentSearches);
            return;
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

            setSearchStore('suggestions', 'index', (index === -1) ? data.length - 1 : index - 1);
          }

          if (e.key === 'ArrowDown') {
            setSearchStore('suggestions', 'index', (index === data.length) ? -1 : index + 1);
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
