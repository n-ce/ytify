import { JSX, Setter } from "solid-js";

export default function(_: {
  img: JSX.Element,
  playBtn: JSX.Element,
  playNext: JSX.Element,
  titleAuthor: JSX.Element,
  handleClick: Setter<boolean>
}) {
  return (
    <footer onclick={(e) => {
      if (!e.target.matches('button'))
        _.handleClick(true);
    }
    }>
      <progress value="0.35" ></progress>
      {_.img}
      <div class="info">
        {_.titleAuthor}
      </div>
      {_.playBtn}
      {_.playNext}
    </footer>
  )
}
