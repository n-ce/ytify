import { Hole, html } from "uhtml";
import { i18n } from "../scripts/i18n";

export default function(_: {
  id: string,
  label: string,
  handler: (e: Event & {
    target: HTMLSelectElement
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
