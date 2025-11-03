/* @refresh reload */

import { render } from 'solid-js/web';
import { updateLang } from './lib/stores/i18n';
import App from './features';
import { themer } from './lib/utils';

updateLang().then(() => {
  themer();

  render(() => (
    <App />
  ), document.body);
});


