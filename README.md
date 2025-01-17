<div align="center">
 <a href="https://ytify.netlify.app"><img src="public/ytify_thumbnail_max.webp" width="70%"></a>

[![Netlify Status](https://api.netlify.com/api/v1/badges/fbbcc532-3ef6-41fc-b61e-26cb17cfb6ba/deploy-status)](https://app.netlify.com/sites/ytify/deploys)
[![Telegram Members](https://img.shields.io/endpoint?style=flat&url=https://mogyo.ro/quart-apis/tgmembercount?chat_id=ytifytg)](https://t.me/ytifytg)
[![Matrix](https://img.shields.io/matrix/ytify:matrix.org?label=Matrix)](https://matrix.to/#/#ytify:matrix.org)

</div>


> [**ytify**](https://ytify.netlify.app) is a simple WebApp, built with vanilla TypeScript for maximum efficiency, that streams only audio from YouTube. Listen to **Podcasts**, **Audiobooks**, **Music**, **Livestreams** and other Audio focused YouTube Videos, even under the lowest network conditions.

> As covered in https://blog.csdn.net/gitblog_00024/article/details/139895018 and https://medevel.com/ytify-youtube/

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
- **Download** ⬇️ : Download any audio stream using the button on the 3 dot menu.

![1000012574](https://github.com/user-attachments/assets/450a1eed-0fb6-4fba-8d4a-c18431b935ad)
![1000012580](https://github.com/user-attachments/assets/4abcd09d-d2ef-4e26-8632-1a50cedfbab8)
![1000012579](https://github.com/user-attachments/assets/adf1254a-e565-4fb7-ab51-613bbe69e677)





## WHY / The story of ytify with [n-ce](https://github.com/n-ce)
- I was an avid [NewPipe](https://github.com/TeamNewPipe/NewPipe) user back in 2021, which I used for background playback.
- I noticed it wasn't able to stream under low network conditions.
- So i decided to create an [issue](https://github.com/TeamNewPipe/NewPipe/issues/5838).
- Upon finding no active resolution on the issue, I took it to myself and created this project on Jan 2022.


## Usage 👆
https://ytify.us.kg is the only official location that the main branch is directly connected to.
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

