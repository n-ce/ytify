import { createSignal, For, onCleanup, createEffect } from "solid-js";
import { playerStore, setPlayerStore, setStore, t } from "@stores";

export default function (props: { onClose: () => void }) {
  const [lrcMap, setLrcMap] = createSignal<{ time?: number; text: string }[]>([
    { text: t("loading") },
  ]);
  const [activeLine, setActiveLine] = createSignal(-1);
  let lyricsSection!: HTMLDivElement;

  createEffect(() => {
    const { title, author, id } = playerStore.stream;
    if (!id) return;
    if (!author) {
      setStore("snackbar", t("lyrics_artist_not_available"));
      props.onClose();
      return;
    }

    const controller = new AbortController();
    let active = true;

    onCleanup(() => {
      active = false;
      controller.abort();
      setPlayerStore("lrcSync", undefined);
    });

    setLrcMap([{ text: t("loading") }]);
    setActiveLine(-1);
    setPlayerStore("lrcSync", undefined);

    const params = new URLSearchParams({
      track_name: title,
      artist_name: author.slice(0, -8),
      duration: (playerStore.fullDuration ?? "").toString(),
    });

    fetch(`https://lrclib.net/api/get?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        "Lrclib-Client": `ytify ${Build} (https://github.com/n-ce/ytify)`,
      },
    })
      .then((res) => {
        if (!active) return;
        return res.json();
      })
      .then((data?: { syncedLyrics?: string; duration?: number }) => {
        if (!active || !data) return;
        const lrc = data.syncedLyrics;
        const fetchedDuration = data.duration;
        const localDuration = playerStore.fullDuration;

        let offset = 0;
        if (fetchedDuration && localDuration) {
          offset = (localDuration - fetchedDuration) / 2;
        }

        if (lrc) {
          const parsedLines: { time: number; text: string }[] = [];
          for (const line of lrc.split("\n")) {
            const match = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
            if (!match) continue;
            const text = match[3].trim();
            if (!text) continue;
            const mm = parseFloat(match[1]);
            const ss = parseFloat(match[2]);
            parsedLines.push({
              time: mm * 60 + ss - offset,
              text,
            });
          }

          if (parsedLines.length === 0) {
            setStore("snackbar", t("lyrics_no_found"));
            props.onClose();
            return;
          }

          setLrcMap(parsedLines);

          setPlayerStore({
            lrcSync: (d: number) => {
              if (!active) return;
              let currentIndex = -1;
              const { length } = parsedLines;
              for (let i = 0; i < length; i++) {
                if (parsedLines[i].time <= d) {
                  currentIndex = i;
                } else {
                  break;
                }
              }

              if (currentIndex !== activeLine()) {
                setActiveLine(currentIndex);

                if (currentIndex < 0) return;

                if (lyricsSection.children[currentIndex]) {
                  lyricsSection.children[currentIndex].scrollIntoView({
                    block: "center",
                    behavior: "smooth",
                  });
                }
              }
            },
          });
        } else {
          setStore("snackbar", t("lyrics_no_found"));
          props.onClose();
        }
      })
      .catch((err) => {
        if (!active || (err as any)?.name === "AbortError") return;
        setStore("snackbar", t("lyrics_failed"));
        props.onClose();
      });
  });

  onCleanup(() => {
    setPlayerStore("lrcSync", undefined);
  });

  return (
    <div ref={lyricsSection} class="lyrics">
      <For each={lrcMap()}>
        {(item, i) => (
          <p classList={{ active: activeLine() === i() }}>{item.text}</p>
        )}
      </For>
    </div>
  );
}
