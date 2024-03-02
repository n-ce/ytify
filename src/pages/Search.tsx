import { For } from "solid-js";

type StreamItem = {
  title: string
}


export default function Search({ searchResults }: { searchResults: () => StreamItem[] }) {
  return (
    <div>
      <For each={searchResults()} fallback={<h1>Search Results Appear Here</h1>}>
        {item => <li>{item.title}</li>}
      </For>
    </div>
  )
}
