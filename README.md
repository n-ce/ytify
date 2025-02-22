<div align="center">
 <a href="https://ytify.netlify.app"><img src="public/ytify_thumbnail_max.webp" width="70%"></a>

[![Netlify Status](https://api.netlify.com/api/v1/badges/fbbcc532-3ef6-41fc-b61e-26cb17cfb6ba/deploy-status)](https://app.netlify.com/sites/ytify/deploys)
[![Telegram Members](https://img.shields.io/endpoint?style=flat&url=https://mogyo.ro/quart-apis/tgmembercount?chat_id=ytifytg)](https://t.me/ytifytg)
[![Telegram Online](https://img.shields.io/endpoint?style=flat&url=https%3A%2F%2Ftg.sumanjay.workers.dev%2Fytifytg)](https://t.me/ytifytg)
[![Matrix](https://img.shields.io/matrix/ytify:matrix.org?label=Matrix)](https://matrix.to/#/#ytify:matrix.org)

</div>


> [**ytify**](https://ytify.pp.ua) is the fastest (56KB to load) and the lightest (7.5K LOC only) centralised audio streaming web application built with an unprecedented hybrid [HTML + SolidJS] approach for maximum efficiency.
>  Listen to **Podcasts**, **Audiobooks**, **Music**, **Livestreams** and other Audio focused YouTube Videos, even under the lowest network conditions.

> As covered in https://blog.csdn.net/gitblog_00024/article/details/139895018 and https://medevel.com/ytify-youtube/

## What else are you getting ?
- **Queuing Features** 🚦
- **ytify collections** 🎷: create your own playlists disconnected from YouTube, share it with the world with share link.
- **YouTube Playlists** 🎶: View them, queue them to the player. You can also both subscribe and import it into your own collections.
- **Theming** 🎨: Modern Autonomous themed UI based on stream thumbnail with High Contrast Mode for increased legibility.
- **PWA** 📱: Install as an app on your device which also allows you to play YouTube links with it from your OS share menu.
- **Radio** 📻: Fetches similar streams and creates a playlist for your stream, great for music listeners.
- **Library** 📚: Discover feed, history, favorites, Channels, YouTube playlists, custom playlists (collections) & Subscription Feed!
- **Download** ⬇️ : Download any audio stream using the button on the action menu.
- **Lyrics** 🎼 : Immersive Synced Lyrics using the button on the action menu.
- **For You** 🎻 : Get audio tailored specifically for you based on your Favorites, generated on device without any violation of privacy.
- **Parental Controls** 👨‍👦 : Disable Parts of the application according to your needs.

![1000012574](https://github.com/user-attachments/assets/450a1eed-0fb6-4fba-8d4a-c18431b935ad)
![1000012580](https://github.com/user-attachments/assets/4abcd09d-d2ef-4e26-8632-1a50cedfbab8)
![1000012579](https://github.com/user-attachments/assets/adf1254a-e565-4fb7-ab51-613bbe69e677)





## WHY / The story of ytify with [n-ce](https://github.com/n-ce)
- I was an avid [NewPipe](https://github.com/TeamNewPipe/NewPipe) user back in 2021, which I used for background playback.
- I noticed it wasn't able to stream under low network conditions.
- So i decided to create an [issue](https://github.com/TeamNewPipe/NewPipe/issues/5838).
- Upon finding no active resolution on the issue, I took it to myself and created this project on Jan 2022.


## Usage 👆
- Instance
  - [Official](https://ytify.pp.ua)
  - [Secondary](https://ytify.netlify.app)
  - [Testing](https://dev--ytify.netlify.app)
- Full Usage Guide is available at [wiki>usage](https://github.com/n-ce/ytify/wiki/usage)
- Join our Telegram Community [@ytifytg](https://t.me/ytifytg)
- Join our Matrix Community
[@ytify](https://matrix.to/#/#ytify:matrix.org)


## License 📝
> [Read More](https://github.com/n-ce/ytify/blob/main/LICENSE).

## Contributing 📋
> This project is actively seeking contributors, [Read More Here](https://github.com/n-ce/ytify/blob/main/CONTRIBUTING.md).

## Development 🔧
1. Prerequisites : Node.js , Beginner TypeScript Knowledge. 
2. Clone repository with
```
git clone https://github.com/n-ce/ytify --depth 1
```
or
```
 gh repo clone n-ce/ytify -- --depth 1
```
3. Move to Directory, Update & Install Dependencies
```
cd ytify ; npm run update; npm i
```
4. If you prefer using DevTools, you may disable eruda in [`vite.config.ts`](https://github.com/n-ce/ytify/blob/main/vite.config.ts)
`injectEruda(false),`

5. Start the development server and open localhost 
```
npm run dev -- --open
```
6. Learn More at our [wiki](https://github.com/n-ce/ytify/wiki).


#### Vite building the project on my entry-level phone.

```bash
vite v6.0.11 building for production...
✓ 56 modules transformed.
dist/manifest.webmanifest                          1.00 kB
dist/index.html                                   15.98 kB │ gzip:   4.12 kB
dist/assets/UpdatePrompt-BVWVWGFX.css              0.72 kB │ gzip:   0.40 kB
dist/assets/ActionsMenu-CZvdWJ42.css               0.91 kB │ gzip:   0.45 kB
dist/assets/Settings-tEADDnJ_.css                  2.25 kB │ gzip:   0.73 kB
dist/assets/index--EX9VXLN.css                    20.68 kB │ gzip:   5.01 kB
dist/assets/enqueueRelatedStreams-DdHTYd6g.js      0.35 kB │ gzip:   0.27 kB
dist/assets/extractColorFromImage-Cxdm9n2W.js      0.62 kB │ gzip:   0.42 kB
dist/assets/setAudioStreams-BVS_1Ljb.js            0.84 kB │ gzip:   0.56 kB
dist/assets/setDiscoveries-TaEtEbHx.js             0.93 kB │ gzip:   0.54 kB
dist/assets/virtual_pwa-register-CvOwgYno.js       0.96 kB │ gzip:   0.55 kB
dist/assets/UpdatePrompt-D5n4sX3r.js               1.09 kB │ gzip:   0.62 kB
dist/assets/supermix-BtwNGR11.js                   1.11 kB │ gzip:   0.68 kB
dist/assets/importPipedPlaylists-B2u7XIyS.js       1.24 kB │ gzip:   0.60 kB
dist/assets/Lyrics-zDQNW8E2.js                     1.24 kB │ gzip:   0.80 kB
dist/assets/start-BQEMUpCE.js                      1.95 kB │ gzip:   1.06 kB
dist/assets/partsManager-DmWC75D0.js               1.96 kB │ gzip:   0.67 kB
dist/assets/WatchOnYtify-LiGdckDA.js               2.84 kB │ gzip:   1.22 kB
dist/assets/ActionsMenu-BzqUfV6s.js                4.06 kB │ gzip:   1.72 kB
dist/assets/workbox-window.prod.es5-DL_hIMXg.js    5.72 kB │ gzip:   2.36 kB
dist/assets/en-D06fOH0-.js                        11.19 kB │ gzip:   3.67 kB
dist/assets/pl-D1p_NQ5j.js                        11.99 kB │ gzip:   4.26 kB
dist/assets/Settings-CBM8jAms.js                  13.25 kB │ gzip:   4.38 kB
dist/assets/index-pbIhJqLG.js                     89.34 kB │ gzip:  32.19 kB
dist/assets/hls-CySapf1N.js                      399.85 kB │ gzip: 123.78 kB
✓ built in 9.51s
```

## Translations 🗺️
[![Translation status](https://hosted.weblate.org/widget/ytify/multi-auto.svg)](https://hosted.weblate.org/engage/ytify/)
ytify is being translated into multiple languages using [Weblate](https://hosted.weblate.org/projects/ytify/web).
 
## Acknowledgements 🙏
- [Uma](https://github.com/n-ce/Uma) - Instances Manager
- [Piped](https://github.com/teampiped/piped) - YouTube Data API & Adaptive Streaming Proxy
- [Invidious](https://invidious.io) - YouTube Data API & Progressive Streaming Proxy
- [Hyperpipe](https://codeberg.org/Hyperpipe/hyperpipe-backend) - YT Music Artist Data API
- [Cobalt](https://github.com/wukko/cobalt) - YouTube Download API
- [LRCLIB](https://lrclib.net) - Synced Lyrics Provider
- [wsrv](https://wsrv.nl) - Image Proxy Provider
- [Solid](https://github.com/solidjs/solid) - Delightful JSX Library
- [HLS.js](https://github.com/video-dev/hls.js) - HLS Support Library
- [Netlify](https://www.netlify.com) - Hosting, PR Previews, User Feedback Forms, Edge Functions
- [Vite](https://vitejs.dev) - Development Server, Code Bundling, Project Scaffolding.
- [Autoprefixer](https://github.com/postcss/autoprefixer) - CSS Prefixes Solution.
- [Remix Icons](https://github.com/Remix-Design/RemixIcon) - Efficient Icon Solution.
- [Google Fonts](https://fonts.google.com) - NotoSans Font.

