import { onMount } from "solid-js";
import { t } from '../lib/stores';

export function Selector(_: Selector) {
  let target!: HTMLSelectElement;
  onMount(() => _.onmount(target));

  return (
    <span>
      <label for={_.id}>
        {t(_.label as TranslationKeys)}
      </label>
      <select
        id={_.id}
        onchange={_.onchange}
        ref={target}
      >{_.children}</select>
    </span>
  );
}
