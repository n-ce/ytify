import { createEffect, createSignal, Show } from "solid-js";
import { store } from "@stores";
import { rankFavoriteArtists } from "@utils";
import Carousel from "@components/Carousel";
import ListItem from "@components/ListItem";

/**
 * Favorites-only artist shelf. Kept in its own lazily imported module so the
 * ranking, cache and `/featured` enrichment code is never shipped to (or run
 * for) `history`, `liked`, custom collections, playlists or albums.
 */
export default function ArtistCarousel(props: { items: TrackItem[] }) {
  const [artists, setArtists] = createSignal<Channel[]>([]);
  let hasAttemptedFetch = false;

  createEffect(() => {
    const localArtists = rankFavoriteArtists(props.items);

    if (localArtists.length === 0) {
      setArtists([]);
      return;
    }

    const knownArtistIds = new Set(localArtists.map((artist) => artist.id));

    const mergeResolved = (resolved: Channel[]): Channel[] => {
      const byId = new Map(resolved.map((artist) => [artist.id, artist]));
      return localArtists.map((artist) => byId.get(artist.id) || artist);
    };

    // The session cache is shared with the Library hub and may have been
    // populated for a different favorites set, so drop anything that is not
    // one of this list's artists.
    let cachedArtists: Channel[] = [];
    try {
      const stored = sessionStorage.getItem("featured_artists");
      if (stored) cachedArtists = JSON.parse(stored);
    } catch {}
    cachedArtists = cachedArtists.filter(
      (artist) => artist?.id && knownArtistIds.has(artist.id),
    );

    setArtists(mergeResolved(cachedArtists));

    // Ask for avatars for the whole shelf in collection order. Only skip when
    // the cache already holds every artist we would ask about.
    const enrichIds = localArtists.map((artist) => artist.id);
    const cachedIds = new Set(cachedArtists.map((artist) => artist.id));
    if (hasAttemptedFetch || enrichIds.every((id) => cachedIds.has(id))) return;

    hasAttemptedFetch = true;
    fetch(
      `${store.api}/featured?artistIds=${encodeURIComponent(enrichIds.join(","))}`,
    )
      .then((res) => res.json())
      .then((data: any) => {
        const resolved: Channel[] = Array.isArray(data?.artists)
          ? data.artists.filter((artist: Channel) =>
              knownArtistIds.has(artist.id),
            )
          : [];

        if (resolved.length === 0) return;

        setArtists(mergeResolved(resolved));
        try {
          sessionStorage.setItem(
            "featured_artists",
            JSON.stringify(resolved),
          );
        } catch {}
      })
      .catch(() => {});
  });

  return (
    <Show when={artists().length > 0}>
      <div class="list-carousels">
        <Carousel
          items={artists()}
          renderItem={(artist) => (
            <ListItem
              name={artist.name}
              img={artist.img}
              id={artist.id}
              type="artist"
            />
          )}
        />
      </div>
    </Show>
  );
}
