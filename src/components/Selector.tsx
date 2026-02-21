import type { JSXElement } from 'solid-js';
import { t } from '@stores';

type Selector = {
  label: TranslationKeys | string,
  id: string,
  onchange: (e: { target: HTMLSelectElement }) => void,
  value: string,
  children: JSXElement
}

export function Selector(_: Selector) {
  let target!: HTMLSelectElement;
  return (
    <span>
      <label for={_.id}>
        {t(_.label as TranslationKeys)}
      </label>
      <select
        id={_.id}
        onchange={_.onchange}
        ref={target}
        value={_.value}
      >{_.children}</select>
    </span>
  );
}
