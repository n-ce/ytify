/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import { Route, Router } from '@solidjs/router';
import Settings from './pages/Settings';
import Library from './pages/Library';
import Search from './pages/Search';
import SearchBar from './components/SearchBar';
import MiniPlayer from './components/MiniPlayer';
import NavBar from './components/NavBar';
import { createSignal } from 'solid-js';

const [searchResults, setSearchResults] = createSignal([]);

render(
  () => (
    <Router root={(props) =>
      <>
        <NavBar />
        {props.children}
        <div id="superBar">
          <SearchBar setSearchResults={setSearchResults} />
          <MiniPlayer />
        </div>
      </>
    }>
      <Route
        path={["/", "*404"]}
        component={Library}
      />
      <Route
        path="/settings"
        component={Settings}
      />
      {/*<Route path="/list" component={List} />*/}
      <Route path="/search"
        component={() =>
          <Search searchResults={searchResults} />
        }
      />
    </Router>
  ), document.body.firstElementChild as HTMLDivElement);
