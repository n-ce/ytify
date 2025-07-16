import { JSX, Setter } from "solid-js";
import './miniPlayer.css';

export default function(_: {
  img: JSX.Element,
  track: JSX.Element,
  playBtn: JSX.Element,
  playNext: JSX.Element,
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
      {_.track}
      {_.playBtn}
      {_.playNext}
    </footer>
  )
}
