import { notify, removeSaved, save } from "../lib/utils";
import { queuelist } from "../lib/dom";
import player from "../lib/player";
import StreamItem from "../components/StreamItem";
import { render, html } from "uhtml";
import { store, getSaved } from "../lib/store";
import Sortable, { type SortableEvent } from 'sortablejs';
import { i18n } from "./i18n";

const queuetools = document.getElementById('queuetools');
let allowDuplicatesBtn!: HTMLButtonElement;
let filterLT10Btn!: HTMLButtonElement;
let removeQBtn!: HTMLButtonElement;
let enqueueRelatedStreamsBtn!: HTMLButtonElement;

function isLongerThan10Min(duration: string): boolean {
  const hhmmss = duration.split(':');
  return !(
    hhmmss.length === 2 &&
    parseInt(hhmmss[0]) < 10
  );
}

function filterLT10() {
  if (removeQBtn.classList.contains('delete'))
    removeQBtn.click();

  const items = queuelist.querySelectorAll('.streamItem') as NodeListOf<HTMLElement>;
  items.forEach(el => {
    const duration = el.dataset.duration as string;
    if (!isLongerThan10Min(duration))
      return;
    el.classList.add('delete');
    el.click();
  });
}

const template = html`
  <li @click=${() => {
    for (let i = queuelist.children.length; i >= 0; i--)
      queuelist.appendChild(queuelist.children[Math.random() * i | 0]);

    store.queue.list.length = 0;

    for (const item of queuelist.children)
      store.queue.list.push((item as HTMLElement).dataset.id || '');
  }}>
    <i class="ri-shuffle-line"></i>${i18n('upcoming_shuffle')}
  </li>

  <li
    ref=${(el: HTMLButtonElement) => {
    removeQBtn = el;
  }}
    @click=${(e: MouseEvent) => {
    (e.currentTarget as HTMLElement).classList.toggle('on');
    queuelist.querySelectorAll('.streamItem')
      .forEach(el => {
        el.classList.toggle('delete');
      });
  }}
  >
    <i class="ri-subtract-line"></i>${i18n('upcoming_remove')}
  </li>

  <li
    ref=${(el: HTMLButtonElement) => {
    filterLT10Btn = el;
    if (getSaved('filterLT10') === 'on')
      filterLT10Btn.className = 'on';
  }}
    @click=${(e: MouseEvent) => {
    const btn = e.currentTarget as HTMLElement;
    const ls = 'filterLT10';

    if (btn.classList.contains('on'))
      removeSaved(ls);
    else
      save(ls, 'on');

    btn.classList.toggle('on');
    filterLT10();
  }}
  >
    <i class="ri-filter-2-line"></i>${i18n('upcoming_filter_lt10')}
  </li>

  <li
    ref=${(el: HTMLButtonElement) => {
    allowDuplicatesBtn = el;
    if (getSaved('allowDuplicates') === 'on') {
      allowDuplicatesBtn.className = 'on';
    }
  }}
    @click=${(e: MouseEvent) => {
    const btn = e.currentTarget as HTMLElement;
    const ls = 'allowDuplicates';

    if (btn.classList.contains('on'))
      removeSaved(ls);
    else
      save(ls, 'on');

    btn.classList.toggle('on');
    notify(i18n('upcoming_change'));
  }}
  >
    <i class="ri-file-copy-line"></i>${i18n('upcoming_allow_duplicates')}
  </li>

  <li
    ref=${(el: HTMLButtonElement) => {
    enqueueRelatedStreamsBtn = el;
    if (getSaved('enqueueRelatedStreams') === 'on') {
      enqueueRelatedStreamsBtn.className = 'on';
    }
  }}
    @click=${(e: MouseEvent) => {
    const btn = e.currentTarget as HTMLElement;
    const ls = 'enqueueRelatedStreams';

    if (btn.classList.contains('on'))
      removeSaved(ls);
    else
      save(ls, 'on');

    btn.classList.toggle('on');
    notify(i18n('upcoming_change'));
  }}
  >
    <i class="ri-list-check-2"></i>${i18n('upcoming_enqueue_related')}
  </li>

  <li @click=${() => {
    store.queue.list.length = 0;
    queuelist.innerHTML = '';
  }}>
    <i class="ri-close-line"></i>${i18n('upcoming_clear')}
  </li>
`;

render(queuetools, template);

store.queue.firstChild = () => queuelist.firstElementChild as HTMLElement;

store.queue.append = function(data: DOMStringMap | CollectionItem, prepend: boolean = false) {
  if (!data.id) return;

  const { list, firstChild } = store.queue;

  if (!allowDuplicatesBtn.classList.contains('on'))
    if (list.includes(data.id))
      return;

  if (filterLT10Btn.classList.contains('on'))
    if (isLongerThan10Min(data.duration as string))
      return;

  if (firstChild()?.matches('p')) firstChild()?.remove();

  if (removeQBtn.classList.contains('on'))
    removeQBtn.click();

  if (prepend)
    list.unshift(data.id);
  else
    list.push(data.id);

  const fragment = document.createDocumentFragment();

  render(fragment,
    StreamItem({
      id: data.id || '',
      title: data.title || '',
      author: data.author || '',
      duration: data.duration || '',
      draggable: true
    }));

  if (prepend)
    queuelist.prepend(fragment);
  else
    queuelist.appendChild(fragment);
};

queuelist.addEventListener('click', e => {
  e.preventDefault();

  const queueItem = e.target as HTMLAnchorElement & { dataset: CollectionItem };
  if (!queueItem.classList.contains('streamItem')) return;
  const id = queueItem.dataset.id || '';

  function addToTrash() {
    const current = sessionStorage.getItem('trashHistory') || '';
    if (!current?.includes(id))
      sessionStorage.setItem('trashHistory', current + id);
  }

  if (queueItem.classList.contains('delete'))
    addToTrash();
  else player(id);

  const { list } = store.queue;

  const index = list.indexOf(id);

  list.splice(index, 1);
  queuelist.children[index].remove();
});

new Sortable(queuelist, {
  handle: '.ri-draggable',
  onUpdate(e: SortableEvent) {
    if (e.oldIndex == null || e.newIndex == null) return;
    const queueArray = store.queue.list;
    queueArray.splice(e.newIndex, 0, queueArray.splice(e.oldIndex, 1)[0]);
  }
});
