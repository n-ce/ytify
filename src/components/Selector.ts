import { Hole, html } from "uhtml";
import { i18n } from "../lib/utils";

export default function Selector(_: {
  id: string,
  label: string,
  handler: (e: Event & {
    target: EventTarget & {
      value: string,
      selectedOptions: HTMLOptionsCollection
    }
  }) => void
  children: Hole,
  onmount?: (t: HTMLSelectElement) => void
}) {

  return html`
    <span>
      <label for=${_.id}>
        ${i18n(_.label as TranslationKeys)}
      </label>
      <select
        ref=${(s: HTMLSelectElement) => {
      if (_.onmount)
        Promise.resolve().then(() => {
          if (s.isConnected && _.onmount)
            _.onmount(s)
        });
    }}
        id = ${_.id}
        @change=${_.handler}
      > ${_.children} </select>
    </span>
    `;
}
