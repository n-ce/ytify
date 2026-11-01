<div align="center">
 <a href="https://ytify.netlify.app"><img src="public/ytify_thumbnail_max.webp" width="70%"></a>

[![Netlify Status](https://api.netlify.com/api/v1/badges/fbbcc532-3ef6-41fc-b61e-26cb17cfb6ba/deploy-status)](https://app.netlify.com/sites/ytify/deploys)
[![Telegram Online](https://img.shields.io/endpoint?style=flat&url=https%3A%2F%2Ftg.sumanjay.workers.dev%2Fytifytg)](https://t.me/ytifytg)

</div>

_**Experience audio streaming that's built for you, not against you.**_

[**ytify**](https://ytify.pp.ua) is designed to be a lean, modern, and intentional tool. By taking a pragmatic approach to design and resource use, we provide an ethical listening experience that puts you in control, free from the information overload of typical online media applications.

The journey began with a frustration. As a regular user of NewPipe in 2021, I relied on it for background audio, but noticed its failure to stream under poor network conditions. This led to a simple support issue which, when left unresolved, became the seed for a solution. Taking the problem into my own hands, I started the ytify project in January 2022 to build an application that prioritized robust performance and efficient use of resources from the ground up.

## Features ✨

- **High-Performance Audio Streaming:** YouTube audio resolved through the InnerTube API with multi-instance Invidious stream failover for minimal buffering, even on low-speed networks.
- **Comprehensive Queue Management:** Full control over your listening queue — add, remove, and reorder tracks, plus start an endless radio from any track.
- **Playlists and Collections:** Create your own collections, import YouTube playlists, and share collection links.
- **Dynamic Theming:** The UI automatically adapts its theme from the dominant colors of the currently playing artwork.
- **Offline-First PWA:** Install as a standalone app with a Workbox service worker and OPFS audio cache for offline playback.
- **SponsorBlock Skipping:** Sponsor segments, intros, and outros are skipped automatically during playback.
- **Synced Lyrics:** Time-synced lyrics powered by LRCLIB.
- **"For You" Recommendations:** Personalized recommendations generated on-device from your listening history — strictly private, zero telemetry.
- **Search:** YouTube and YouTube Music search with suggestions and filters.

<img width="3000" height="3600" alt="1000067919" src="https://github.com/user-attachments/assets/14ec1a13-3e04-4ca4-a005-eb33f53cdb67" />

## YouTube Terms & Copyright ℹ️

ytify is an independent, unofficial client that is not affiliated with or endorsed by YouTube. All content, branding, and trademarks are the property of their respective owners; use of YouTube's services and audio streams is subject to the [YouTube Terms of Service](https://www.youtube.com/t/terms) and applicable copyright and intellectual property agreements.

## Donations

- **FIAT / UPI** `animesh.5383@waicici`

- **Monero / XMR** `87BtajHDsoGD5acvkKgi2j385ZKUbJkH4QBoCQtFGgTARKWRAVEo28RLs1S3P3w6AgMkjcNLmSST7CLuxKFuzXciJiNBQqH`

## Translations 🗺️

[![Translation status](https://hosted.weblate.org/widget/ytify/multi-auto.svg)](https://hosted.weblate.org/engage/ytify/)
ytify is being translated into multiple languages using [Weblate](https://hosted.weblate.org/projects/ytify/web).

## Acknowledgements 🙏

- [InnerTube API](https://github.com/LuanRT/YouTube.js) - Powers the ytify backend.
- [Solid.js](https://www.solidjs.com/) - Performant UI Library
- [LRCLIB](https://lrclib.net) - Synced Lyrics Provider
- [Netlify](https://www.netlify.com) - Hosting, PR Previews, Edge Functions
- [Cloudflare](https://www.cloudflare.com) - Workers, Durable Objects & SQLite powering CloudSync
- [Bun](https://bun.sh) - Package Manager, Test Runner & Build Orchestration
- [Vite](https://vitejs.dev) - Development Server, Code Bundling, Project Scaffolding
- [Remix Icons](https://github.com/Remix-Design/RemixIcon) - Special Thanks to Remix Icons for being with us through the years
