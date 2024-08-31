import './stylesheets/global.css';
import './scripts/router';
import './scripts/theme';
import './scripts/search';
import './scripts/list';
import './components/Settings';
import('./modules/start').then(mod => mod.default());
