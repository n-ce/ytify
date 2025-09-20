import { getDB } from "../../lib/utils";
import './Hub.css';

export default function() {
  const { history } = getDB();


  const recents = history ? Object.values(history).reverse().slice(0, 5) : [];
  console.log(recents);

  return (
    <>
      <article>
        <p>Catch Up with your channels</p>
        <ul></ul>
      </article>

      <article>
        <p>Recently Listened To</p>
        <ul>
        </ul>
      </article>

      <article>
        <p>Streams For You</p>
        <ul></ul>
      </article>

      <article>
        <p>Featured Playlists</p>
        <ul></ul>
      </article>

      <article>
        <p>Related to Artists you listen to</p>
        <ul></ul>
      </article>

    </>
  );
}
