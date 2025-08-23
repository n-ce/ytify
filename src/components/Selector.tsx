import { t } from '../lib/stores';

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
