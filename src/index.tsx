/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web'
import SearchBar from './SuperBar/SearchBar';
import MiniPlayer from './SuperBar/MiniPlayer';
import Community from './Community';


render(
  () => (
    <>
      <Community />
      {/* Navigation Component */}
      <div id="superBar">
        <SearchBar />
        <MiniPlayer />
      </div>
      <dialog id="loadingScreen">
        <i class="ri-loader-3-line"></i>
      </dialog>
    </>
  ), document.body.firstElementChild as HTMLDivElement);
