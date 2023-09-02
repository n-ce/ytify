- To add to our repository, check out our issues or the [development list](https://github.com/n-ce/ytify/blob/main/CONTRIBUTING.md#development-list)
- To contribute, fork the repository, make a branch, commit your changes, and make a pull request. 
- Considering to fix a bug or add a new feature? Make sure to increment the version number in the sw.js file if you do so.

# Development List

- PlayPrevious button (requires globally storing streamHistory)
- Favorites button (saves favorites to localStorage as map)
- stream title topic/subject/data extraction to get better autoplay recommendations (maybe using compromise/one nlp library)
- Recommendations feed using indexedDB & related streams averages of favorites
- Material You colors with material color utilities using C++ / WASM
- rewrite cleaner / efficient CSS
- Github Actions
  - Vite : combine js and css files into one and minify it
  - Autoprefixer : removes need for manually adding css prefix

*Deployments for older versions : [v1](https://deploy-preview-8--ytify.netlify.app/) || [v2](https://deploy-preview-20--ytify.netlify.app/) || [v3](https://deploy-preview-32--ytify.netlify.app/) || [v4](https://deploy-preview-51--ytify.netlify.app/) || [v5](https://deploy-preview-60--ytify.netlify.app/)*

## Changelog

**v5.16**:
- Shuffle Queue
- Remove From Queue Button

**v5.15**:
- Volume Controls

**v5.14**:
- Tabbed Navigation
- Safari Playback Support

**v5.13**:
- Autoplay
- QueueListUI

**v5.12** :
- search suggestions

**v5.11** :
- search filters
- subtitle selector
- settingsMenu instead of list

**v5.10** :
- Search

**v5.9** :
- Subtitles
- Related Streams

**v5.8** :
- Settings inside Player container
- all DOM references with getElementByID ([why?](https://www.measurethat.net/Benchmarks/ShowResult/401327))
- avif images => webp to extend browsers support as well as less computationally expensive
- incorporated luuvdk's colorjs' image data processing algorithm directly into `themer()`
- replaced local storage with html data attributes for data binding
- new found optimizations and fixes which were previously unseen

**v5.7** :
- Share youtube link into ytify PWA
- m4a fallback when opus unavailable
- feedback button
- substantial performance gains

**v5.6** : Seek Backward && Forward buttons

**v5.5** :
- icons with labels below
- bitrate select menu

**v5.4** :
- Using Remix Iconset for quicker site load
- Removed Color.js dependency which was slowing down site with blazing fast 6 line code

**v5.3** : 
- query enhancement : playlist query && time query
- piped fetch error reporting
- dont depend on a single piped instance

**v5.2** : replace personal backend with piped api

**v5.1** : current and full duration info

**v5** :
- Newer and simpler UI
- A new theming engine
- Code Efficiency Increased
- Memory Consumption Decreased
- personal backend api
- 200+ lines of code removed
- code maintainence made easier


**v4** : 
- remove spectre css dependency
- code modulariztion
- color accents extraction from thumbnail for theming
- separate gradient themes
- functional ui design

**v3** : 
- current track title
- better thumbnail source
- thumbnail setting
- queue badge
- standardiztion
- optimization
- code reduction

**v2** : 
- removed howler.js depenency
- audio controls
- save settings support
- dark mode
- 128kbps hq button
- pwa support

**v1** : 
- input field to take url
- using howler js to handle audio
- using clipboard api to take url