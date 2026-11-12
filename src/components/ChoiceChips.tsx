import { For, createUniqueId } from "solid-js";
import "./ChoiceChips.css";

export interface ChoiceChipOption<T extends string = string> {
  value: T;
  label: string;
  icon?: string;
}

export interface ChoiceChipsProps<T extends string = string> {
  options: ChoiceChipOption<T>[];
  value: T;
  onSelect: (value: T) => void;
  name?: string;
  ariaLabel?: string;
  class?: string;
}

export default function ChoiceChips<T extends string = string>(
  props: ChoiceChipsProps<T>,
) {
  const fallbackName = createUniqueId();

  return (
    <div
      class={`choice-chips ${props.class || ""}`.trim()}
      role="radiogroup"
      aria-label={props.ariaLabel}
    >
      <For each={props.options}>
        {(option) => (
          <label
            class="choice-chip"
            classList={{ selected: props.value === option.value }}
          >
            <input
              type="radio"
              name={props.name || fallbackName}
              value={option.value}
              checked={props.value === option.value}
              onChange={() => props.onSelect(option.value)}
            />
            {option.icon && <i class={option.icon} aria-hidden="true" />}
            <span>{option.label}</span>
          </label>
        )}
      </For>
    </div>
  );
}
