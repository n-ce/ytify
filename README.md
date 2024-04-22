<div align="center">
 <a href="https://ytify.netlify.app"><img src="public/ytify_thumbnail_max.webp" width="70%"></a>

[![Netlify Status](https://api.netlify.com/api/v1/badges/fbbcc532-3ef6-41fc-b61e-26cb17cfb6ba/deploy-status)](https://app.netlify.com/sites/ytify/deploys)
[![Tokei Lines Of Code](https://tokei.rs/b1/github/n-ce/ytify?style=flat&color=black)](https://github.com/n-ce/ytify)
[![Telegram Members](https://img.shields.io/endpoint?style=flat&url=https://mogyo.ro/quart-apis/tgmembercount?chat_id=ytifytg)](https://t.me/encetg)
[![Matrix](https://img.shields.io/matrix/ytify:matrix.org?label=Matrix)](https://matrix.to/#/!ytify:matrix.org)

</div>


> [**ytify**](https://ytify.netlify.app) is a simple WebApp, built with vanilla TypeScript for maximum efficiency, that streams only audio from YouTube. Listen to **Podcasts**, **Audiobooks**, **Music** and other Audio focused YouTube Videos, even under the lowest network conditions.

## What else are you getting ?
- **Queue** 🚦: Add multiple streams to keep your audio streams going. 
- **Playlists** 🎶: View YouTube playlists and queue them to the player. 
- **Theming** 🎨: Modern Autonomous themed UI based on stream thumbnail. 
- **PWA** 📱: Install as an app on your device which also allows you to play YouTube links with it from your OS share menu.
- **Radio** 📻: Fetches similar streams and creates a playlist for your stream, great for music listeners. 
- **Library** 📚: Discover feed, history, favorites & custom playlists. 

![ytify_6.7_landscape](https://github.com/n-ce/ytify/assets/69345507/e8854300-8caf-49a4-befa-6bfc659e86b6)



## WHY / The story of ytify with [n-ce](https://github.com/n-ce)
- I was an avid [NewPipe](https://github.com/TeamNewPipe/NewPipe) user back in 2021, which I used for background playback.
- I noticed it wasn't able to stream under low network conditions.
- So i decided to create an [issue](https://github.com/TeamNewPipe/NewPipe/issues/5838).
- Upon finding no active resolution on the issue, I took it to myself and created this project on Jan 2022.

## Development 🔧
1. Prerequisites : Node.js , Beginner TypeScript Knowledge. 
2. Clone repository with
```
git clone https://github.com/n-ce/ytify
```
or
```
 gh repo clone n-ce/ytify
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
 
## Usage 👆
1. Visit the [Production Deployment](https://ytify.netlify.app/), or if you've installed the project, wherever you're hosting it.
2. Change the bitrate of the content while you're streaming it on the `Home` tab.
3. Use the `Search` tab to search for streams with keywords or a direct URL.
4. Click on a stream to open a menu to either play, enqueue, or start a Radio of similar tracks and various other actions.
5. Enjoy listening to music, podcast episodes, or other forms of audio even under low network conditions.
6. Finding something new? Head over to `Discover` on the Library Tab.
7. Want the Highest Quality Output always? Just turn on `Highest Quality` in Settings.
8. Want to save more data or speed up ux? Just turn off `Load Thumbnails` in Settings.

## Privacy Policy 👁️
> We use [Beampipe](https://beampipe.io) Analytics for minimal site stats, only the browser user-agent data is collected anonymously for this. Everything else remains on your device only, which can also be cleared anytime using the clear data option in settings.

## License 📝
> [Read More](https://github.com/n-ce/ytify/blob/main/LICENSE).

## Contributing 📋
> This project is actively seeking contributors, [Read More Here](https://github.com/n-ce/ytify/blob/main/CONTRIBUTING.md).

## Acknowledgements 🙏
- [Piped](https://github.com/teampiped/piped) - YouTube Data API & Image Proxy
- [Invidious](https://invidious.io) - YouTube Playback Proxy
- [Cobalt](https://github.com/wukko/cobalt) - YouTube Download API
- [Lit](https://lit.dev) - Exceptional Web Component Library
- [Netlify](https://www.netlify.com) - Hosting, PR Previews, User Feedback Forms.
- [Vite](https://vitejs.dev) - Development Server, Code Bundling, Project Scaffolding.
- [Autoprefixer](https://github.com/postcss/autoprefixer) - CSS Prefixes Solution.
- [Remix Icons](https://github.com/Remix-Design/RemixIcon) - Efficient Icon Solution.
- [Google Fonts](https://fonts.google.com) - NotoSans Font.

