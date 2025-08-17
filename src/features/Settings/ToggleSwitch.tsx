import { t } from '../../lib/stores';


export default function(_: ToggleSwitch) {
  let target!: HTMLInputElement;

  return (
    <div class='toggleSwitch'>
      <label for={_.id}>
        {t(_.name as TranslationKeys)}
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
