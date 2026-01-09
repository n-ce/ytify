import { t } from '@lib/stores';
import '../../styles/ToggleSwitch.css';

type ToggleSwitch = {
  name: TranslationKeys | string,
  id: string,
  checked: boolean,
  onclick: (e: MouseEvent) => void
}

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
        aria-checked={_.checked}
        checked={_.checked}
        onclick={_.onclick}
      />
      <span onclick={() => target.click()}></span>
    </div>
  );
}
