import '../stylesheets/style.css';
import './router';
import './theme';
import './search';
import './superModal';
import './queue';
import './list';
import './settings';
import './library';
import './audioEvents';
import '../components/streamItem';
import '../components/listItem';
import '../components/toggleSwitch';
import { instance } from '../lib/dom';
import { getSaved, removeSaved, save } from '../lib/utils';

instance.addEventListener('input', () => {
  if (instance.value === 'https://pipedapi.kavin.rocks')
    removeSaved('api');
  else
    save('api', instance.value);
});
addEventListener('DOMContentLoaded', () => {
  const savedApi = getSaved('api');
  if (savedApi)
    instance.value = savedApi;
});

