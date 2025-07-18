import { html } from "uhtml";
import { i18n } from "../../scripts/i18n";

export default function(_: {
  id: string,
  name: TranslationKeys,
  checked: boolean,
  handler: (e: Event & { target: HTMLInputElement }) => void
}) {
  let inputEl!: HTMLInputElement;

  return html`
    <div class='toggleSwitch'>
      <label for=${_.id}>
        ${i18n(_.name)}
      </label>
      <input
        ref=${(el: HTMLInputElement) => { inputEl = el }}
        type='checkbox'
        id=${_.id}
        checked=${_.checked}
        @click=${_.handler}
      />
      <span @click=${() => {
      inputEl.click();
    }}></span>
    </div>
  `;
}
