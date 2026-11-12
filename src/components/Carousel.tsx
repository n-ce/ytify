import { For, Show, JSXElement } from "solid-js";
import ListItem from "./ListItem";

export interface CarouselProps<T = any> {
  items: T[] | undefined;
  carouselClass?: string;
  itemType?: "album" | "playlist" | "channel" | "artist";
  renderItem?: (item: T) => JSXElement;
  /** Collapse items onto multiple rows instead of scrolling horizontally. */
  wrap?: boolean;
}

export default function <T = any>(props: CarouselProps<T>) {
  return (
    <Show when={props.items && props.items.length > 0}>
      <div
        class={`list-carousel ${props.wrap ? "wrap" : ""} ${props.carouselClass || ""}`.trim()}
      >
        <For each={props.items}>
          {(item) =>
            props.renderItem ? (
              props.renderItem(item)
            ) : (
              <ListItem
                {...({
                  ...(item as any),
                  type: props.itemType || (item as any).type,
                } as YTListItem)}
              />
            )
          }
        </For>
      </div>
    </Show>
  );
}
