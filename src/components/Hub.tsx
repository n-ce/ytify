import { getDB } from "../lib/libraryUtils";


export default function() {
  const { history } = getDB();

  const recents = history ? Object.values(history).reverse().slice(0, 5) : [];
  console.log(recents);

  return (
    <>

      <article>
        <h3>Subscription Feed&nbsp;
          <i class="ri-arrow-right-s-line"></i>
        </h3>
        <ul></ul>
      </article>

      {
// Hub v1
      /*
      <article>
        <h3>Recently Listened</h3>
        <ul>
        </ul>
      </article>


      <article>
        <h3>You Might Like&nbsp;
          <i class="ri-arrow-right-s-line"></i>
        </h3>
        <ul></ul>
      </article>

      <article>
        <h3>Explore Artists</h3>
        <ul></ul>
      </article>
*/}
    </>
  );
}
