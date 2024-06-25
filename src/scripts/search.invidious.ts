import { getApi } from "../lib/utils";

export function fetchSearchResults(q: string, sortBy: string) {
  fetch(`${getApi('invidious')}/api/v1/search?q=${q}&sort_by=${sortBy}`)
    .then(res => res.json())
    .then(data => console.log(data))
}
