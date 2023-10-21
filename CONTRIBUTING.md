# Development List

- Bottom Navigation for Portrait Orientation. (@owencz1998)
- Scrollable Navigation like a carousel, horizontal for portrait & vertical for landscape.
- Mini Player By default & transfering Home tab to the  Expanded Player, making Library the default tab.(@owencz1998)
- custom anchor element for stream-item.

*Deployments for older versions : [v1](https://deploy-preview-8--ytify.netlify.app/) || [v2](https://deploy-preview-20--ytify.netlify.app/) || [v3](https://deploy-preview-32--ytify.netlify.app/) || [v4](https://deploy-preview-51--ytify.netlify.app/) || [v5](https://deploy-preview-60--ytify.netlify.app/) || [v5.final](https://deploy-preview-118--ytify.netlify.app/)* 

## Changelog

**v6.3**:
- Library (Discover, History, Favorites, Playlists)
- Channel Support

**v6.2**:
- Search sorting by Time Uploaded

**v6.1**:
- Download Functionality

**v6.0**:
- [Full Changelog](https://github.com/n-ce/ytify/discussions/125)

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
