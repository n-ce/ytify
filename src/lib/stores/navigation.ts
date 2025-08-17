import { createStore } from "solid-js/store";

export const params = (new URL(location.href)).searchParams;

export const [navStore, setNavStore] = createStore({
  features: [] as HTMLElement[]
});

export function goto(ref: HTMLElement) {
  ref.scrollIntoView({ behavior: 'smooth' });
  setNavStore('features', history => [...history, ref]);
}
