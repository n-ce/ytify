<div align="center">
 <a href="https://ytify.netlify.app"><img src="public/ytify_thumbnail_max.webp" width="70%"></a>

[![Netlify Status](https://api.netlify.com/api/v1/badges/fbbcc532-3ef6-41fc-b61e-26cb17cfb6ba/deploy-status)](https://app.netlify.com/sites/ytify/deploys) 

</div>


> [**ytify**](https://ytify.netlify.app) is a simple WebApp that streams only audio from YouTube. Listen to **Podcasts**, **Audiobooks**, **Music** and other Audio focused YouTube Videos, even under the lowest network conditions.

### What else are you getting ?
- **Queue** : Add multiple streams to keep your audio streams going. 🎵
- **Playlists** : Open YouTube playlists and queue them to the player. 🎧
- **Theming** : Modern Autonomous themed UI based on stream thumbnail. 🎨
- **PWA** : Install ytify as an app on your device and open YouTube links with it from your OS share menu. 📱
- **Radio** : Fetches similar streams and creates a playlist for your stream, great for music listeners. 📻

![chrome_screenshot_ytify_v6_desktop](https://imageupload.io/ib/U74XZC8af5zwzqD_1695788573.jpg)

## WHY / The story of ytify with [n-ce](https://github.com/n-ce)
- I was an avid [NewPipe](https://github.com/TeamNewPipe/NewPipe) user back in 2021, which I used for background playback.
- I noticed it wasn't able to stream under low network conditions which would occur when my daily data quota would expire.
- Newpipe allowed downloading audio of the stream in multiple bitrates (50kbps, 90kbps, 130kbps) but it provided only the best one while streaming. So i decided to create an [issue](https://github.com/TeamNewPipe/NewPipe/issues/5838).
- At the time I used to download opus audio, av1 video streams from https://projectlounge.pw/ytdl. The streams could easily be downloadable in required format by just modifying the site link.
- Things clicked in my mind, and I created this project on Jan 2022.

## Development Setup 🔧
1. Prerequisites : Node.js , Beginner TypeScript Knowledge. 
2. Clone repository with
```
git clone https://github.com/n-ce/ytify
```
or
```
 gh repo clone n-ce/ytify
```
4. Move to Directory & Install Dependencies
```
cd ytify ; npm install
```
5. If you prefer using DevTools, you may disable eruda in `vite.config.ts` 
  ```
const eruda = false
```
6. Start the development server and open localhost 
```
npm run dev -- --open
```
 
## Usage 👆
1. Visit the [Production Deployment](https://ytify.netlify.app/), or if you've installed the project, wherever you're hosting it.
2. Change the bitrate of the content you're streaming on the "Home" tab.
3. Use the "Search" tab to search for streams with keywords or a direct URL.
4. Click on a track to open a menu to either play, enqueue, or start a Radio of similar tracks and various other actions.
5. Enjoy listening to music, podcast episodes, or other forms of audio even on low network conditions.
6. Want the Highest Quality Output always? Just turn on `Highest Quality` in Settings.
7. Want to save more data or speed up ux? Just turn off `Load Thumbnails` in Settings.

## Privacy Policy 👁️
> We use [Beampipe](https://beampipe.io) Analytics for minimal site stats, only the browser user-agent data is collected anonymously for this.

## License 📝
> [Read More](https://github.com/n-ce/ytify/blob/main/LICENSE).

## Contributing 📋
> [Read More](https://github.com/n-ce/ytify/blob/main/CONTRIBUTING.md).

## Acknowledgements 🙏
- [Piped](https://github.com/teampiped/piped)
- [Netlify](https://www.netlify.com)
- [Vite](https://vitejs.dev)
- [Autoprefixer](https://github.com/postcss/autoprefixer)
- [Remix Icons](https://github.com/Remix-Design/RemixIcon)
- [Google Fonts](https://fonts.google.com)


