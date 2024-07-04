<div align="center">
 <a href="https://ytify.netlify.app"><img src="public/ytify_thumbnail_max.webp" width="70%"></a>

[![Netlify Status](https://api.netlify.com/api/v1/badges/fbbcc532-3ef6-41fc-b61e-26cb17cfb6ba/deploy-status)](https://app.netlify.com/sites/ytify/deploys)
[![Tokei Lines Of Code](https://tokei.rs/b1/github/n-ce/ytify?style=flat&color=black)](https://github.com/n-ce/ytify)
[![Telegram Members](https://img.shields.io/endpoint?style=flat&url=https://mogyo.ro/quart-apis/tgmembercount?chat_id=ytifytg)](https://t.me/encetg)
[![Matrix](https://img.shields.io/matrix/ytify:matrix.org?label=Matrix)](https://matrix.to/#/!ytify:matrix.org)

</div>


> [**ytify**](https://ytify.netlify.app) is a simple WebApp, built with vanilla TypeScript for maximum efficiency, that streams only audio from YouTube. Listen to **Podcasts**, **Audiobooks**, **Music**, **Livestreams** and other Audio focused YouTube Videos, even under the lowest network conditions.

## What else are you getting ?
- **Queue** 🚦:
  - Add multiple streams to keep your audio streams going.
  - You can share your queue with anyone just by sharing the url.
  - Auto-Queue : automatically enqueues relevant streams.
- **Playlists** 🎶:
  - View YouTube playlists , queue them to the player. You can also both subscribe and import it into your own collection
  - ytify Collections : create your own playlists disconnected from YouTube, share it with the world with share link.
- **Theming** 🎨:
  - Modern Autonomous themed UI based on stream thumbnail.
  - High Contrast Mode for increased legibility.
- **PWA** 📱: Install as an app on your device which also allows you to play YouTube links with it from your OS share menu.
- **Radio** 📻: Fetches similar streams and creates a playlist for your stream, great for music listeners.
- **Library** 📚: Discover feed, history, favorites, Channels, YouTube playlists, custom playlists (collections) & Subscription Feed!

![ytify_7.0_landscape](https://github.com/n-ce/ytify/assets/69345507/b5a48633-9544-4f6c-b2d0-d11a1fa2efbc)



## WHY / The story of ytify with [n-ce](https://github.com/n-ce)
- I was an avid [NewPipe](https://github.com/TeamNewPipe/NewPipe) user back in 2021, which I used for background playback.
- I noticed it wasn't able to stream under low network conditions.
- So i decided to create an [issue](https://github.com/TeamNewPipe/NewPipe/issues/5838).
- Upon finding no active resolution on the issue, I took it to myself and created this project on Jan 2022.


## Usage 👆
https://ytify.netlify.app is the only official location that the main branch is directly connected to.
- Full Usage Guide is available at [wiki>usage](https://github.com/n-ce/ytify/wiki/usage)
- Join our Telegram Community [@ytifytg](https://t.me/ytifytg)
- Join our Matrix Community
[@ytify](https://matrix.to/#/!ytify:matrix.org)

## Privacy Policy 👁️
> We use [Beampipe](https://beampipe.io) Analytics for minimal site stats, only the browser user-agent data is collected anonymously for this. Everything else remains on your device only, which can also be cleared anytime.(Library>Clean, Settings>Restore Settings,Clear Caches)

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
 
## Acknowledgements 🙏
- [Piped](https://github.com/teampiped/piped) - YouTube Data API, Image Proxy & Adaptive Streaming Playback Proxy
- [Invidious](https://invidious.io) - YouTube Data API & Progressive Streaming Playback Proxy
- [Cobalt](https://github.com/wukko/cobalt) - YouTube Download API
- [Solid](https://github.com/solidjs/solid) - Delightful JSX Library
- [Netlify](https://www.netlify.com) - Hosting, PR Previews, User Feedback Forms, Edge Functions
- [Vite](https://vitejs.dev) - Development Server, Code Bundling, Project Scaffolding.
- [Autoprefixer](https://github.com/postcss/autoprefixer) - CSS Prefixes Solution.
- [Remix Icons](https://github.com/Remix-Design/RemixIcon) - Efficient Icon Solution.
- [Google Fonts](https://fonts.google.com) - NotoSans Font.

