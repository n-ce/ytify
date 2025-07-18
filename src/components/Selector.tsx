import { onMount } from "solid-js";
import { i18n } from "../lib/utils";

export function Selector(_: Selector) {
  let target!: HTMLSelectElement;
  onMount(() => _.onmount(target));

  return (
    <span>
      <label for={_.id}>
        {i18n(_.label as TranslationKeys)}
      </label>
      <select
        id={_.id}
        onchange={_.onchange}
        ref={target}
      >{_.children}</select>
    </span>
  );
}
