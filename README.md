<div align="center">
 <a href="https://ytify.netlify.app"><img src="assets/ytify_thumbnail_max.webp" width="70%"></a>
</div>

## The story of ytify
- I was an avid [NewPipe](https://github.com/TeamNewPipe/NewPipe) user back in 2021, which I used for background playback.
- I noticed it wasn't able to stream under low network conditions which would occur when my daily data quota would expire.
- I noticed newpipe allows downloading audio of the stream in multiple bitrates (50kbps, 90kbps, 130kbps) but it only provides the best one when streaming. So i decided to create an [issue](https://github.com/TeamNewPipe/NewPipe/issues/5838).
- At the time I used to download audio, video streams from https://projectlounge.pw/ytdl. The streams could easily be downloadable in required format by just modifying the site link , without any CORS issues.
- Things clicked in my mind, and I created this project, this was [the first build](https://github.com/n-ce/ytify/blob/bf129e573c56e99f88b51f679077cb9f8a9a6b3c/index.html) on Jan 2022.
- Months later the 5th Major version was released with its own backend which was then replaced by the piped API which is itself based off newpipe, so we came #fullCircle.

## Table of Contents
- [**Description 🦚**](#description-)
- [**Getting Started** 🖼](#getting-started-)
- [**Licence** 📝](https://github.com/n-ce/ytify/blob/main/LICENSE)
- [**Contributing** 📋](https://github.com/n-ce/ytify/blob/main/CONTRIBUTING.md)
- [**Development** `</>`](#development-)
- [**Acknowledegments** 🙏](#acknowledgements-)


## Description 🦚

**ytify** is a fast and simple web app that streams audio from YouTube links. With ytify, you can enjoy listening without worrying about slow internet or data usage. It also comes with features like :

- **Queue** : Add multiple links to keep your audio streams going. 🎵
- **Playlist Support** : Stream a whole YouTube playlist with one link. 🎧
- **Theming** : Customize your app with colors from your YouTube stream's thumbnail. 🎨
- **PWA** : Install ytify as an app on your device and open YouTube links with it from your OS share menu. 📱


## Getting Started 🖼

<p align="center">

<img src="https://github.com/n-ce/ytify/blob/main/assets/Screenshots/ytify_screenshot_home.webp" width="40%"/>

Simply navigate to the ytify website, paste a youtube link, and it will start playing.
</p>
<p align="center">
<img src="https://github.com/n-ce/ytify/blob/main/assets/Screenshots/ytify_screenshot_playing.webp" width="75%"/>
</p>
<details>
<summary>More Screenshots ( requires AVIF support ).</summary>
<p align="center">
  <img src="assets/Screenshots/landscape_dark-mode.avif" width="45%"/>
  <img src="assets/Screenshots/landscape_light-mode.avif" width="45%">
  <img src="assets/Screenshots/portrait_light-mode.avif" width="30%">
  <img src="assets/Screenshots/portrait_dark-mode.avif" width="30%">
  <img src="assets/Screenshots/portrait_automatic_dark-mode.avif" width="30%">
  <img src="assets/Screenshots/portrait_music.avif" width="45%">
  <img src="assets/Screenshots/portrait_audiobook.avif" width="45%">
  <img src="assets/Screenshots/landscape_thoughts.avif" width="90%">
  <img src="assets/Screenshots/landscape_trends.avif" width="45%">
  <img src="assets/Screenshots/landscape_music.avif" width="45%">
</p>
</details>

## Development `</>`

Simply clone this repository and set up index.html as default run command.
No specific build tools are required.

## Acknowledgements 🙏
- [Piped](https://github.com/teampiped/piped)
- [Netlify](https://www.netlify.com)
- [Remix Icons](https://github.com/Remix-Design/RemixIcon)
- [Google Fonts](https://fonts.google.com)
