/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web'
import SearchBar from './SuperBar/SearchBar';
import MiniPlayer from './SuperBar/MiniPlayer';
import Community from './Community';
import { Route, Router } from '@solidjs/router';
import LibraryItem from './LibraryItem';


render(
  () => (
    <Router root={(props) =>
      <>
        {props.children}
        <div id="superBar">
          <SearchBar />
          <MiniPlayer />
        </div>
      </>
    }>
      <Route path="/settings" component={Community} />

      <Route path="/"
        component={() =>
          <>
            <dialog id="loadingScreen">
              <i class="ri-loader-3-line"></i>
            </dialog>
            <LibraryItem label="Top 100 Music Global" />
            <LibraryItem label="Top 100 Music Global" />
          </>}
      />
    </Router>
  ), document.body.firstElementChild as HTMLDivElement);
