<div align="center">
 <a href="https://ytify.netlify.app"><img src="public/ytify_thumbnail_max.webp" width="70%"></a>

[![Netlify Status](https://api.netlify.com/api/v1/badges/fbbcc532-3ef6-41fc-b61e-26cb17cfb6ba/deploy-status)](https://app.netlify.com/sites/ytify/deploys) 

</div>

#
**ytify** is a simple web app that streams only audio from YouTube. With ytify, you can enjoy listening to podcasts, audiobooks, other audio focused youtube videos and ofcourse music without worrying about slow internet or data usage. It also comes with features like :

- **Queue** : Add multiple streams to keep your audio streams going. 🎵
- **Playlists** : Open YouTube playlists and queue them to the player. 🎧
- **Theming** : Modern Autonomous themed UI based on stream thumbnail . 🎨
- **PWA** : Install ytify as an app on your device and open YouTube links with it from your OS share menu. 📱
- **Radio** : Fetches similar streams and creates a playlist for your stream, great for music listeners.

![chrome_screenshot_ytify_v6_desktop](https://imageupload.io/ib/U74XZC8af5zwzqD_1695788573.jpg)

## WHY / The story of ytify
- I was an avid [NewPipe](https://github.com/TeamNewPipe/NewPipe) user back in 2021, which I used for background playback.
- I noticed it wasn't able to stream under low network conditions which would occur when my daily data quota would expire.
- Newpipe allowed downloading audio of the stream in multiple bitrates (50kbps, 90kbps, 130kbps) but it only provided the best one when streaming. So i decided to create an [issue](https://github.com/TeamNewPipe/NewPipe/issues/5838).
- At the time I used to download opus audio, av1 video streams from https://projectlounge.pw/ytdl. The streams could easily be downloadable in required format by just modifying the site link , without any CORS issues.
- Things clicked in my mind, and I created this project on Jan 2022.

## Setup & Installation 🔧
1. Ensure you have Node.js and npm installed on your system.
2. In a terminal, clone the repository to your local machine with ```git clone https://github.com/n-ce/ytify```.
3. Change your working directory to the project folder with ```cd ytify```.
4. Install the project's dependencies with ```npm install```.
5. Once the installation is complete, you can start the app with ```npm run dev```.
6. In the terminal, you'll see a link to your local web app at localhost:XXXX.

## Usage 🚀
1. Visit the [live demo](https://ytify.netlify.app/), or if you've installed the project, wherever you're hosting it.
2. Change the bitrate of the content you're streaming on the "Home" tab.
3. Use the "Search" tab to search for streams with keywords or a direct URL.
4. Click on a track to open a menu to either play, enqueue, or start a Radio of similar tracks.
5. Enjoy listening to music, podcast episodes, or other forms of audio on low network conditions.

## License 📝
**ytify** is licensed under the GNU General Public License v3.0 (GPL-3.0). GPL-3.0 is an open-source license that allows you to use, modify, and distribute software freely. If you modify or distribute GPL-3.0-licensed software, you must also share the source code and ensure that your derivative works remain open-source. For full permissions, limitations, and conditions, read the [full license](https://github.com/n-ce/ytify/blob/main/LICENSE).

## Contributions 📋
Interested in an [issue](https://github.com/n-ce/ytify/issues) and want to contributing? Follow these simple steps to get started. If you needed a more guided video tutorial, you can find one [here](https://www.youtube.com/watch?v=x24fOAPclL4&ab_channel=JacobSorber).
1. Fork the repository.
2. Create a new branch.
3. Commit your changes.
4. If you're making a new 
5. Review [CONTRIBUTING.md](https://github.com/n-ce/ytify/blob/main/CONTRIBUTING.md) to make sure that your contributions align with requirements.
6. Make a pull request.

## Acknowledgements 🙏
- [Piped](https://github.com/teampiped/piped)
- [Netlify](https://www.netlify.com)
- [Vite](https://vitejs.dev)
- [Autoprefixer](https://github.com/postcss/autoprefixer)
- [Remix Icons](https://github.com/Remix-Design/RemixIcon)
- [Google Fonts](https://fonts.google.com)


