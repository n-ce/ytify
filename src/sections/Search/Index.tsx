import { createSignal, For, onMount, Show } from "solid-js";
import './search.css';
import { i18n } from "../../lib/utils";
import StreamItem from "../../components/StreamItem";
import Input from "./Input";
import { state } from "../../lib/store";

export default function(_: {
  close: () => void,
}) {
  let searchSection!: HTMLDivElement;
  let superInput!: HTMLInputElement;
  const [suggestions, setSuggestions] = createSignal(['']);
  const [inputVal, setInputVal] = createSignal('');
  const [suggestionsIndex, setSuggestionsIndex] = createSignal(0);

  onMount(() => {
    searchSection.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      superInput.focus();
    }, 500);

    // CTRL + K focus search bar
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === "K")
        superInput.focus();
    });

  });


  return (
    <section
      ref={searchSection}
      class="searchSection"
    >
      <header>
        <p>{i18n('nav_search')}</p>
        <i
          class="ri-close-large-line"
          onclick={_.close}
        ></i>
      </header>
      <form class="superInputContainer">

        <Input
          setSuggestions={setSuggestions}
          setInputVal={setInputVal}
          value={inputVal}
          setRef={(el: HTMLInputElement) => { superInput = el; }}
          keydown={(e) => {

            if (e.key === 'Enter') {

            }
            if (e.key === 'Backspace' ||
              !state.searchSuggestions ||
              !suggestions()
            ) return;

            if (e.key === 'ArrowUp') {
              if (suggestionsIndex() === 0)
                setSuggestionsIndex(suggestions().length);


              setSuggestionsIndex(suggestionsIndex() - 1)
            }

            if (e.key === 'ArrowDown') {
              if (suggestionsIndex() === suggestions().length)
                setSuggestionsIndex(0);
              setSuggestionsIndex(suggestionsIndex() + 1);
            }


          }}
        />

        <select
          class="searchFilters"
          value={state.searchFilter || 'all'}
        >
          <optgroup label="YouTube">
            <option value="all">{i18n('search_filter_all')}</option>
            <option value="videos">{i18n('search_filter_videos')}</option>
            <option value="channels">{i18n('search_filter_channels')}</option>
            <option value="playlists">{i18n('search_filter_playlists')}</option>
          </optgroup>
          <optgroup label="YouTube Music">
            <option value="music_songs">{i18n('search_filter_music_songs')}</option>
            <option value="music_artists">{i18n('search_filter_music_artists')}</option>
            <option value="music_videos">{i18n('search_filter_music_videos')}</option>
            <option value="music_albums">{i18n('search_filter_music_albums')}</option>
            <option value="music_playlists">{i18n('search_filter_music_playlists')}</option>
          </optgroup>
          <optgroup label={i18n('search_filter_sort_by')}>
            <option value="date">{i18n('search_filter_date')}</option>
            <option value="views">{i18n('search_filter_views')}</option>
          </optgroup>
        </select>

      </form>

      <Show when={state.searchSuggestions && suggestions().length > 3}>
        <ul class="suggestions" >
          <For each={suggestions()}>
            {(item, index) => (
              <li
                onclick={() => setInputVal(item)}
                class={index() + 1 === suggestionsIndex() ? 'hover' : ''}
              >{item}</li>
            )}
          </For>
        </ul>
      </Show>

      <div class="searchlist">
        <StreamItem
          id="1DGSOZlbXxI"
          title="Ahead Of Us"
          author="Hidden Citizens - Topic"
          duration="03:12"
          channelUrl="/channel/UCNuVkMgSv8IMBIBQ858dVRw"
        />
      </div>

    </section>
  );
}
