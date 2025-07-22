import { Accessor, Setter } from "solid-js";
import { state, store } from "../../lib/store";
import { errorHandler, getApi, i18n, idFromURL } from "../../lib/utils";
import player from "../../lib/player";

export default function(_: {
  setSuggestions: Setter<string[]>,
  setInputVal: Setter<string>,
  value: Accessor<string>,
  setRef: (el: HTMLInputElement) => void,
  keydown: (e: KeyboardEvent) => void
}) {
  return (
    <input
      value={_.value()}
      placeholder={i18n("search_placeholder")}
      type="search"
      ref={_.setRef}
      class="superInput"
      autocomplete="off"
      onblur={() => {
        setTimeout(() => {
          _.setSuggestions([]);
        }, 500);
      }}
      oninput={async (e) => {
        const ref = e.target;
        const text = ref.value;
        _.setInputVal(text);

        const id = idFromURL(text);

        if (id && id !== store.stream.id) {
          player(id);
          return;
        }

        if (!state.searchSuggestions || text.length < 3) {
          _.setSuggestions([]);
          return;
        }

        const fetchSuggestions = async () => fetch(getApi('piped') + '/opensearch/suggestions/?query=' + text)
          .then(res => res.json())
          .catch(e => errorHandler(e.message, fetchSuggestions));

        const data = (await fetchSuggestions())[1];
        if (data.length)
          _.setSuggestions(data);

      }}
      onkeydown={_.keydown}

    />
  );
}
