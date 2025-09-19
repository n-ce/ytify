import { createResource, For, Show, createSignal } from "solid-js";
import { getDB } from "../../lib/utils";
import './Hub.css';
import { MoodsGenresListResponse } from '../../../netlify/edge-functions/moods-genres-list';
import { MoodGenreDetailsFullResponse, PlaylistItem } from '../../../netlify/edge-functions/mood-genre-details';

const fetchJson = <T,>(url: string): Promise<T | undefined> => {
  return fetch(url)
    .then(res => {
      if (!res.ok) return undefined; // Return undefined on non-OK response
      return res.json() as T;
    })
    .catch(() => undefined); // Return undefined on error
};

export default function() {
  const { history } = getDB();
  const [moodsGenresData] = createResource<MoodsGenresListResponse | undefined>(() => fetchJson<MoodsGenresListResponse>('/moods-genres-list'));
  const [selectedPlaylistDetails, setSelectedPlaylistDetails] = createSignal<MoodGenreDetailsFullResponse | undefined>(undefined);

  const recents = history ? Object.values(history).reverse().slice(0, 5) : [];
  console.log(recents);

  const handleItemClick = (params: string) => {
    fetchJson<MoodGenreDetailsFullResponse>(`/mood-genre-details/${params}`)
      .then(data => {
        setSelectedPlaylistDetails(data);
      });
  };

  return (
    <>
      <article>
        <h3>Moods & Moments</h3>
        <Show when={moodsGenresData() && !moodsGenresData.loading} fallback={<div>Loading moods...</div>}>
          <ul class="hub-grid">
            <For each={Object.keys(moodsGenresData()!.moods || {})}>
              {(mood) => (
                <li onClick={() => handleItemClick(moodsGenresData()!.moods[mood])}>
                  {mood}
                </li>
              )}
            </For>
          </ul>
        </Show>
      </article>

      <article>
        <h3>Genres</h3>
        <Show when={moodsGenresData() && !moodsGenresData.loading} fallback={<div>Loading genres...</div>}>
          <ul class="hub-grid">
            <For each={Object.keys(moodsGenresData()!.genres || {})}>
              {(genre) => (
                <li onClick={() => handleItemClick(moodsGenresData()!.genres[genre])}>
                  {genre}
                </li>
              )}
            </For>
          </ul>
        </Show>
      </article>

      <Show when={selectedPlaylistDetails()}>
        <article>
          <For each={Object.keys(selectedPlaylistDetails() || {})}>
            {(header) => (
              <>
                <h3>{header}</h3>
                <ul class="hub-grid">
                  <For each={selectedPlaylistDetails()![header]}>
                    {(playlist: PlaylistItem) => (
                      <li>
                        <img src={playlist.thumbnail} alt={playlist.title} />
                        <h4>{playlist.title}</h4>
                      </li>
                    )}
                  </For>
                </ul>
              </>
            )}
          </For>
        </article>
      </Show>

      <article>
        <h3>Subscription Feed&nbsp;
          <i class="ri-arrow-right-s-line"></i>
        </h3>
        <ul></ul>
      </article>

      {
// Hub v1
      /*
      <article>
        <h3>Recently Listened</h3>
        <ul>
        </ul>
      </article>


      <article>
        <h3>You Might Like&nbsp;
          <i class="ri-arrow-right-s-line"></i>
        </h3>
        <ul></ul>
      </article>

      <article>
        <h3>Explore Artists</h3>
        <ul></ul>
      </article>
*/}
    </>
  );
}