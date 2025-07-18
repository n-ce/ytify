import { i18n } from "../../lib/utils";

export default function(_: ToggleSwitch) {
  let target!: HTMLInputElement;

  return (
    <div class='toggleSwitch'>
      <label for={_.id}>
        {i18n(_.name as TranslationKeys)}
      </label>
      <input
        ref={target}
        type='checkbox'
        id={_.id}
        checked={_.checked}
        onclick={_.onclick}
      />
      <span onclick={() => target.click()}></span>
    </div>
  );
}
