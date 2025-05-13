import { createEffect, createSignal, For, Show } from "solid-js";
import { generateImageUrl, getThumbIdFromLink } from "../lib/imageUtils";
import { convertSStoHHMMSS, hostResolver, i18n } from "../lib/utils";
import ListItem from "./ListItem";
import StreamItem from "./StreamItem";

const numFormatter = (num: number): string => Intl.NumberFormat('en', { notation: 'compact' }).format(num);

const reservedCollections = {
  discover: ['ri-compass-3-line', 'library_discover'],
  history: ['ri-memories-line', 'library_history'],
  favorites: ['ri-heart-fill', 'library_favorites'],
  listenLater: ['ri-calendar-schedule-line', 'library_listen_later']
}

export default function ItemsLoader(data: { itemsArray: StreamItem[] }) {
  const [items, setItems] = createSignal(data.itemsArray);

  createEffect(() => {
    setItems(data.itemsArray);
  }, data.itemsArray);


  return (
    <Show when={Array.isArray(items())} fallback={items() as unknown as string}>
      <For each={items()} fallback={'No Data Found'}>
        {(item) =>

          item.type === 'collection' ?

            <a href={'./list?collection=' + item.name} class={'clxn_item'} >

              <Show when={item.name in reservedCollections} fallback={
                <>
                  <i class='ri-play-list-2-fill'></i>{item.name}
                </>
              }>
                <i class={reservedCollections[item.name as 'history'][0]
                }></i>
                {i18n(reservedCollections[item.name as 'history'][1] as 'library_history')}
              </Show>
            </a> :

            (item.type === 'stream' || item.type === 'video') ?

              <StreamItem
                id={item.videoId || item.url.substring(9)}
                href={hostResolver(item.url || ('/watch?v=' + item.videoId))}
                title={item.title}
                author={(item.uploaderName || item.author) + (location.search.endsWith('music_songs') ? ' - Topic' : '')}
                duration={(item.duration || item.lengthSeconds) > 0 ? convertSStoHHMMSS(item.duration || item.lengthSeconds) : 'LIVE'}
                uploaded={item.uploadedDate || item.publishedText}
                channelUrl={item.uploaderUrl || item.authorUrl}
                views={item.viewCountText || (item.views > 0 ? numFormatter(item.views) + ' views' : '')}
                img={getThumbIdFromLink(item.thumbnail || 'https://i.ytimg.com/vi_webp/' + item.videoId + '/mqdefault.webp?host=i.ytimg.com')}

              /> :

              <ListItem
                title={item.name}
                stats={item.subscribers > 0 ?
                  (numFormatter(item.subscribers) + ' subscribers') :
                  (item.videos > 0 ? item.videos + ' streams' : '')}
                thumbnail={generateImageUrl(
                  getThumbIdFromLink(
                    item.thumbnail
                  ), ''
                )}
                uploader_data={item.description || item.uploaderName}
                url={item.url}
              />
        }
      </For>
    </Show>
  )



}
