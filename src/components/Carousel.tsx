import { For, Show, JSXElement } from "solid-js";
import ListItem from "./ListItem";

export interface CarouselProps<T = any> {
  items: T[] | undefined;
  title?: string;
  icon?: string;
  class?: string;
  shelfClass?: string;
  carouselClass?: string;
  actions?: JSXElement;
  itemType?: "album" | "playlist" | "channel" | "artist";
  renderItem?: (item: T) => JSXElement;
}

export default function <T = any>(props: CarouselProps<T>) {
  const carouselBody = () => (
    <div class={`list-carousel ${props.carouselClass || ""}`.trim()}>
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
  );

  const content = () =>
    props.shelfClass ? (
      <div class={props.shelfClass}>{carouselBody()}</div>
    ) : (
      carouselBody()
    );

  const hasHeader = () => Boolean(props.title || props.icon || props.actions);

  return (
    <Show when={props.items && props.items.length > 0}>
      <Show when={hasHeader()} fallback={content()}>
        <article class={props.class}>
          <Show when={props.title || props.icon}>
            <p>
              {props.icon && <i class={props.icon}></i>}
              {props.icon && props.title && "\u00A0"}
              {props.title}
            </p>
          </Show>
          <Show when={props.actions}>
            <div class="shelf">{props.actions}</div>
          </Show>
          {content()}
        </article>
      </Show>
    </Show>
  );
}
