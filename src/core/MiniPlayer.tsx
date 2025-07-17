import { JSX } from "solid-js";
import './miniPlayer.css';

export default function(_: {
  img: JSX.Element,
  track: JSX.Element,
  playBtn: JSX.Element,
  playNext: JSX.Element,
  handleClick: () => void
}) {
  return (
    <footer onclick={(e) => {
      if (!e.target.matches('button'))
        _.handleClick();
    }
    }>
      <progress value="0.35" ></progress>
      {_.img}
      {_.track}
      {_.playBtn}
      {_.playNext}
    </footer>
  )
}
