# RAPPORT TECHNIQUE COMPLET - Refonte UX/UI music.ml4-lab.com (ytify)

## Pour : Agent Frontend
## Objectif : Refonte complète UX/UI avec intégration vidéo/live YouTube
## Référence design : https://witv.team/

---

# PARTIE 1 : ARCHITECTURE TECHNIQUE ACTUELLE

## 1.1 Stack Technologique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework UI | SolidJS | 1.9.10 |
| Langage | TypeScript | 5.9.3 |
| Build | Vite | 7.3.1 |
| Styling | CSS + Open Props | 1.7.17 |
| PWA | vite-plugin-pwa | 1.2.0 |
| Drag & Drop | SortableJS | 1.15.6 |

## 1.2 Structure du Projet

```
src/
├── components/           # Composants UI réutilisables
│   ├── ActionsMenu/      # Menus contextuels
│   ├── MediaPartials/    # Sous-composants player (lazy-loaded)
│   │   ├── LikeButton.tsx
│   │   ├── MediaArtwork.tsx (theming dynamique)
│   │   ├── PlayButton.tsx
│   │   └── PlayNextButton.tsx
│   ├── ListItem.tsx      # Rendu liste streams
│   ├── StreamItem.tsx    # Item individuel (zigzag queue)
│   ├── MiniPlayer.tsx    # Player compact flottant
│   ├── NavBar.tsx        # Navigation bottom (routing custom)
│   └── SnackBar.tsx      # Notifications toast
├── features/             # Modules fonctionnels
│   ├── Player/           # Player audio principal
│   │   ├── Controls.tsx  # Contrôles lecture
│   │   ├── Lyrics.tsx    # Paroles synchronisées (LRCLIB)
│   │   ├── Video.tsx     # Mode vidéo (5,406 bytes)
│   │   └── slider.css    # Barre progression
│   ├── Home/             # Hub, Library, Search
│   ├── Queue/            # Gestion file d'attente
│   └── Settings/         # Préférences utilisateur
├── lib/
│   ├── stores/           # État réactif SolidJS (8 fichiers)
│   │   ├── player.ts     # État playback + effets
│   │   ├── list.ts       # Gestion collections
│   │   ├── queue.ts      # File de lecture
│   │   └── app.ts        # Config API + navigation
│   ├── modules/          # Logique métier (25 fichiers)
│   │   ├── cloudSync.ts  # Sync delta + conflits
│   │   ├── getStreamData.ts     # Fetch Invidious
│   │   └── setAudioStreams.ts   # Sélection format
│   └── utils/            # Helpers (7 fichiers)
└── backend/              # Fonctions serverless
    ├── youtube_search.ts # API YTMusic reverse-engineered
    └── youtube_album_api.ts
```

## 1.3 Gestion d'État (SolidJS Stores)

```typescript
// player.ts - État principal
PlayerStore: {
  stream: { title, author, id, duration }
  playbackState: 'none' | 'playing' | 'paused' | 'loading'
  currentTime, fullDuration
  volume, playbackRate, loop
  isMusic, isWatching  // ← MODE VIDEO EXISTANT
  videoURL            // ← URL VIDEO EXISTANT
}

// app.ts - Configuration
AppStore: {
  invidious: string[]  // Instances API multiples
  api: string          // Backend sélectionné
  homeView: '' | 'Hub' | 'Library' | 'Search'
}
```

## 1.4 APIs Intégrées

| API | Usage | Notes |
|-----|-------|-------|
| Invidious | Streams audio/vidéo | Multiple instances, fallback |
| YouTube Music | Recherche reverse-engineered | POST youtubei/v1/search |
| LRCLIB | Paroles synchronisées | Temps réel |
| Last.fm | Métadonnées enrichies | Suggestions |
| Piped | Proxy sans tracking | Backend alternatif |

## 1.5 PWA Actuel

- **Manifest** : standalone, theme noir, shortcuts (History, Favorites, Listen Later)
- **Service Worker** : Workbox avec precaching 80 assets (~554KB)
- **Share Target** : Réception contenu partagé
- **Offline** : Downloads locaux, localStorage collections

---

# PARTIE 2 : ANALYSE RÉFÉRENCE witv.team

## 2.1 Palette Couleurs

```css
:root {
  /* Theme sombre haute lisibilité */
  --bg-primary: #0f0f0f;      /* Fond principal quasi-noir */
  --bg-secondary: #1a1a1a;    /* Cartes, conteneurs */
  --bg-tertiary: #2a2a2a;     /* Hover states */
  --text-primary: #ffffff;     /* Texte haute contraste */
  --text-secondary: #b0b0b0;   /* Labels secondaires */
  --border-subtle: #3a3a3a;    /* Séparateurs discrets */
  --accent-live: #e53935;      /* Badge LIVE */
  --accent-action: #1db954;    /* Actions primaires (suggestion) */
}
```

## 2.2 Typographie

```css
:root {
  /* System font stack pour performance */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  /* Échelle typographique */
  --font-size-xs: clamp(10px, 1.5vw, 12px);
  --font-size-sm: clamp(12px, 2vw, 14px);
  --font-size-base: clamp(14px, 2.5vw, 16px);
  --font-size-lg: clamp(16px, 3vw, 20px);
  --font-size-xl: clamp(20px, 4vw, 28px);

  /* Espacement vertical */
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
}
```

## 2.3 Grille & Espacement

```css
/* Système de grille responsive */
.grid-channels {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 16px;
}

/* Breakpoints */
@media (min-width: 640px)  { /* 2 colonnes */ }
@media (min-width: 1024px) { /* 3 colonnes */ }
@media (min-width: 1440px) { /* 4+ colonnes */ }

/* Espacement standard */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
```

## 2.4 Patterns de Navigation witv.team

```
┌─────────────────────────────────────────────────────┐
│  LOGO          [Sport] [Cinéma] [Musique] [Info]   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ◀ SPORT ─────────────────────────────────────── ▶  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│  │ 🔴 │ │    │ │    │ │    │ │    │ │    │  ←scroll│
│  │LIVE│ │    │ │    │ │    │ │    │ │    │        │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘        │
│                                                      │
│  ◀ MUSIQUE ──────────────────────────────────── ▶  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                       │
│  │    │ │    │ │    │ │    │                       │
│  └────┘ └────┘ └────┘ └────┘                       │
└─────────────────────────────────────────────────────┘
```

**Caractéristiques clés :**
- Carousels horizontaux par catégorie
- Drag-to-scroll natif (5px threshold)
- Scroll incrémental 300px avec transition 0.3s ease
- Flèches navigation visibles au hover

## 2.5 Player witv.team

```css
/* Structure Player Vidéo/Live */
.player-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  background: #000;
}

.player-controls {
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 16px;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.player-container:hover .player-controls {
  opacity: 1;
}

/* Barre de progression */
.progress-bar {
  height: 4px;
  background: rgba(255,255,255,0.3);
  border-radius: 2px;
  cursor: pointer;
}

.progress-fill {
  height: 100%;
  background: #e53935; /* Rouge pour live */
  border-radius: 2px;
}
```

---

# PARTIE 3 : SPÉCIFICATIONS FONCTIONNELLES

## 3.1 Modes de Lecture (OBLIGATOIRE)

### Mode Audio (existant - à améliorer)
```
┌─────────────────────────────────────┐
│  🎵 Artwork   │  Titre              │
│    (lazy)     │  Artiste            │
│               │  ▶ ◀◀ ▶▶ 🔀 🔁     │
│               │  ════════════       │
│               │  1:23 / 3:45        │
└─────────────────────────────────────┘
```

### Mode Vidéo (existant Video.tsx - à refondre)
```
┌─────────────────────────────────────┐
│                                      │
│         [VIDEO PLAYER 16:9]          │
│              🔴 LIVE                 │
│                                      │
├─────────────────────────────────────┤
│  ▶  ◀◀  ▶▶  │  🔊━━━━  │  ⛶  PiP  │
│  ════════════════════════════════   │
└─────────────────────────────────────┘
```

### Mode Live YouTube (NOUVEAU)
```
┌─────────────────────────────────────┐
│  🔴 EN DIRECT   │  Viewers: 12.5K   │
├─────────────────────────────────────┤
│                                      │
│         [LIVE STREAM 16:9]           │
│                                      │
├─────────────────────────────────────┤
│  Chat en direct (optionnel)          │
│  ────────────────────────────        │
│  User1: Message...                   │
│  User2: Message...                   │
└─────────────────────────────────────┘
```

## 3.2 Navigation Principale

```
┌─────────────────────────────────────┐
│  BOTTOM NAV (Mobile)                │
├─────────────────────────────────────┤
│  🏠 Home │ 🔍 Search │ 📚 Library │ ⚙ Settings │
└─────────────────────────────────────┘

Comportement :
- Sticky bottom sur mobile
- Transforme en sidebar sur desktop (>1024px)
- Indicateur actif avec accent color
- Touch targets minimum 44px
```

## 3.3 Catégories de Contenu

| Catégorie | Type | Source |
|-----------|------|--------|
| Musique | Audio | YouTube Music API |
| Clips | Vidéo | YouTube API |
| Lives | Stream | YouTube Live |
| Podcasts | Audio long | YouTube |
| Playlists | Collections | User + YT |

## 3.4 Cartes de Contenu

```html
<!-- Pattern Card Universel -->
<article class="content-card" data-type="video|audio|live">
  <div class="card-media">
    <img loading="lazy" src="thumbnail.webp" alt="">
    <span class="card-badge" data-live>🔴 LIVE</span>
    <span class="card-duration">3:45</span>
  </div>
  <div class="card-info">
    <h3 class="card-title">Titre du contenu</h3>
    <p class="card-meta">Artiste • 1.2M vues</p>
  </div>
  <button class="card-action" aria-label="Plus d'options">⋮</button>
</article>
```

```css
.content-card {
  display: flex;
  gap: 12px;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.content-card:hover {
  background: var(--bg-tertiary);
}

.card-media {
  position: relative;
  width: 120px;
  aspect-ratio: 16/9;
  border-radius: 6px;
  overflow: hidden;
}

.card-badge[data-live] {
  position: absolute;
  top: 4px;
  left: 4px;
  background: var(--accent-live);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.card-duration {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 2px 4px;
  border-radius: 2px;
  font-size: 11px;
}
```

---

# PARTIE 4 : PRÉROGATIVES TECHNIQUES

## 4.1 Performance Réseau Contraignant

### Adaptive Streaming
```typescript
// Détection qualité réseau
const connection = navigator.connection;
const quality = connection?.effectiveType === '2g' ? 'lowest' :
                connection?.effectiveType === '3g' ? 'low' :
                connection?.effectiveType === '4g' ? 'medium' : 'high';

// Sélection format adaptatif
function selectStream(formats: Format[], targetQuality: string) {
  const qualityOrder = ['worst', 'low', 'medium', 'high', 'best'];
  const targetIndex = qualityOrder.indexOf(targetQuality);

  return formats
    .filter(f => f.type.includes('audio') || f.type.includes('video'))
    .sort((a, b) => a.bitrate - b.bitrate)
    .find((_, i) => i >= targetIndex) || formats[0];
}
```

### Buffering Intelligent
```typescript
// Prefetch prochain item en queue
audio.addEventListener('canplaythrough', async () => {
  const nextItem = queue[currentIndex + 1];
  if (nextItem) {
    await prefetchStreamData(nextItem.id);
  }
});

// Gestion interruption réseau
audio.addEventListener('waiting', () => {
  setPlaybackState('buffering');
  showBufferingIndicator();
});

audio.addEventListener('playing', () => {
  setPlaybackState('playing');
  hideBufferingIndicator();
});
```

## 4.2 Performance Matériel Contraignant

### Virtual Scrolling (Listes Longues)
```typescript
// Pour listes > 100 items
import { VirtualList } from './VirtualList';

<VirtualList
  items={searchResults}
  itemHeight={72}
  overscan={5}
  renderItem={(item) => <StreamItem {...item} />}
/>
```

### Lazy Loading Images
```typescript
// Intersection Observer pour thumbnails
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target as HTMLImageElement;
      img.src = img.dataset.src!;
      imageObserver.unobserve(img);
    }
  });
}, { rootMargin: '50px' });
```

### Memory Management
```typescript
// Nettoyage ressources audio/vidéo
function cleanupMedia() {
  if (videoElement) {
    videoElement.pause();
    videoElement.src = '';
    videoElement.load();
  }
  // Libérer mémoire
  URL.revokeObjectURL(currentBlobURL);
}

// Limite historique en mémoire
const MAX_HISTORY = 50;
if (history.length > MAX_HISTORY) {
  history.splice(0, history.length - MAX_HISTORY);
}
```

## 4.3 Animations Performantes

```css
/* Animations GPU-accelerated uniquement */
.animate-slide {
  transform: translateX(0);
  transition: transform 0.3s ease;
  will-change: transform;
}

.animate-fade {
  opacity: 1;
  transition: opacity 0.2s ease;
}

/* Éviter : top, left, width, height (trigger layout) */
/* Préférer : transform, opacity (GPU compositing) */

/* Réduire animations si préférence utilisateur */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 4.4 CSS Container Queries

```css
/* Composants adaptatifs au conteneur */
.player-container {
  container-type: inline-size;
  container-name: player;
}

@container player (min-width: 400px) {
  .controls-row {
    flex-direction: row;
  }
}

@container player (max-width: 399px) {
  .controls-row {
    flex-direction: column;
  }
}
```

---

# PARTIE 5 : INTÉGRATION VIDÉO/LIVE YOUTUBE

## 5.1 Architecture Player Unifié

```typescript
// Types de contenu supportés
type ContentType = 'audio' | 'video' | 'live';

interface UnifiedPlayer {
  type: ContentType;
  element: HTMLAudioElement | HTMLVideoElement;

  // Commun
  play(): void;
  pause(): void;
  seek(time: number): void;
  setVolume(level: number): void;

  // Spécifique vidéo/live
  setQuality?(quality: VideoQuality): void;
  toggleFullscreen?(): void;
  togglePiP?(): void;

  // Spécifique live
  isLive?: boolean;
  viewerCount?: number;
  chatEnabled?: boolean;
}
```

## 5.2 Composant Video Player (Refonte)

```tsx
// VideoPlayer.tsx - Inspiré witv.team
import { createSignal, Show } from 'solid-js';

export function VideoPlayer(props: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [showControls, setShowControls] = createSignal(true);
  const [isFullscreen, setIsFullscreen] = createSignal(false);
  const [isPiP, setIsPiP] = createSignal(false);

  let videoRef: HTMLVideoElement;
  let controlsTimeout: number;

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => setShowControls(false), 3000);
  };

  return (
    <div
      class="video-container"
      classList={{ fullscreen: isFullscreen() }}
      onMouseMove={handleMouseMove}
    >
      <video
        ref={videoRef!}
        src={props.src}
        poster={props.thumbnail}
        playsinline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <Show when={props.isLive}>
        <div class="live-badge">
          <span class="live-dot"></span>
          LIVE
          <span class="viewer-count">{props.viewerCount}</span>
        </div>
      </Show>

      <div
        class="controls-overlay"
        classList={{ visible: showControls() }}
      >
        <VideoProgress video={videoRef} isLive={props.isLive} />
        <VideoControls
          video={videoRef}
          isPlaying={isPlaying()}
          onFullscreen={() => toggleFullscreen(videoRef)}
          onPiP={() => togglePiP(videoRef)}
        />
      </div>
    </div>
  );
}
```

## 5.3 Styles Player Vidéo/Live

```css
/* video-player.css */
.video-container {
  position: relative;
  width: 100%;
  max-width: 100%;
  aspect-ratio: 16/9;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.video-container.fullscreen {
  position: fixed;
  inset: 0;
  max-width: none;
  aspect-ratio: auto;
  border-radius: 0;
  z-index: 9999;
}

.video-container video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* Badge LIVE style witv.team */
.live-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--accent-live);
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  z-index: 10;
}

.live-dot {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.viewer-count {
  margin-left: 8px;
  padding-left: 8px;
  border-left: 1px solid rgba(255,255,255,0.3);
}

/* Controls Overlay */
.controls-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: linear-gradient(transparent, rgba(0,0,0,0.9));
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 10;
}

.controls-overlay.visible {
  opacity: 1;
}

/* Progress Bar Live vs VOD */
.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255,255,255,0.2);
  border-radius: 2px;
  margin-bottom: 12px;
  cursor: pointer;
  position: relative;
}

.progress-bar:hover {
  height: 6px;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.1s linear;
}

.progress-fill[data-live] {
  background: var(--accent-live);
}

.progress-fill[data-vod] {
  background: var(--accent-action);
}

/* Boutons contrôles */
.control-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: rgba(255,255,255,0.1);
  transform: scale(1.1);
}

.control-btn.play-pause {
  width: 48px;
  height: 48px;
  background: rgba(255,255,255,0.2);
}
```

## 5.4 Détection Type de Contenu

```typescript
// Détection automatique audio/video/live
async function detectContentType(videoId: string): Promise<ContentType> {
  const data = await fetchStreamData(videoId);

  if (data.isLive || data.isLiveNow) {
    return 'live';
  }

  if (data.adaptiveFormats?.some(f => f.mimeType?.startsWith('video/'))) {
    return 'video';
  }

  return 'audio';
}

// Switch automatique de player
function renderPlayer(type: ContentType, data: StreamData) {
  switch (type) {
    case 'live':
      return <LivePlayer {...data} />;
    case 'video':
      return <VideoPlayer {...data} />;
    default:
      return <AudioPlayer {...data} />;
  }
}
```

---

# PARTIE 6 : PWA BEST PRACTICES 2026

## 6.1 Media Session API (Lock Screen)

```typescript
// Intégration Media Session complète
function updateMediaSession(track: Track, type: ContentType) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.author,
      album: track.album || 'YouTube',
      artwork: [
        { src: track.thumbnail, sizes: '512x512', type: 'image/webp' }
      ]
    });

    navigator.mediaSession.setActionHandler('play', () => player.play());
    navigator.mediaSession.setActionHandler('pause', () => player.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    navigator.mediaSession.setActionHandler('seekto', (e) => {
      if (e.seekTime) player.currentTime = e.seekTime;
    });

    // Pour vidéo/live
    if (type !== 'audio') {
      navigator.mediaSession.setActionHandler('togglemicrophone', null);
      navigator.mediaSession.setActionHandler('togglecamera', null);
    }
  }
}
```

## 6.2 Offline-First Audio

```typescript
// Service Worker Strategy
// workbox-config.js
export default {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{js,css,html,woff2,webp,png}'],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.googlevideo\.com\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'audio-streams',
        expiration: { maxEntries: 50, maxAgeSeconds: 3600 }
      }
    },
    {
      urlPattern: /^https:\/\/i\.ytimg\.com\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'thumbnails',
        expiration: { maxEntries: 200, maxAgeSeconds: 86400 }
      }
    }
  ]
};
```

## 6.3 Limitations iOS Safari

```typescript
// Workarounds iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

if (isIOS) {
  // Audio ne fonctionne pas en background sur iOS PWA
  // Afficher message explicatif
  showIOSLimitationBanner();

  // Proposer utilisation via Safari plutôt que PWA installée
  if (window.navigator.standalone) {
    suggestSafariUsage();
  }
}
```

---

# PARTIE 7 : RESPONSIVE DESIGN

## 7.1 Breakpoints

```css
/* Mobile-first avec breakpoints fluides */
:root {
  --bp-sm: 640px;   /* Téléphone paysage */
  --bp-md: 768px;   /* Tablette portrait */
  --bp-lg: 1024px;  /* Tablette paysage / Desktop */
  --bp-xl: 1280px;  /* Desktop large */
  --bp-2xl: 1536px; /* Ultra-wide */
}

/* Container queries prioritaires sur media queries */
.main-content {
  container-type: inline-size;
}

@container (min-width: 768px) {
  .grid-content {
    grid-template-columns: repeat(2, 1fr);
  }
}

@container (min-width: 1024px) {
  .grid-content {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## 7.2 Layout Adaptatif

```
MOBILE (<768px)
┌─────────────────────────┐
│  Header + Search        │
├─────────────────────────┤
│                         │
│  Content (full width)   │
│                         │
├─────────────────────────┤
│  Mini Player (sticky)   │
├─────────────────────────┤
│  Bottom Nav             │
└─────────────────────────┘

TABLET/DESKTOP (≥1024px)
┌────────────────────────────────────┐
│  Header + Search                   │
├──────┬─────────────────────────────┤
│      │                             │
│ Side │    Content Area             │
│ Nav  │    (grid 3+ cols)           │
│      │                             │
├──────┴─────────────────────────────┤
│  Player Bar (sticky bottom)        │
└────────────────────────────────────┘
```

## 7.3 Touch Targets

```css
/* Minimum 44x44px pour touch */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Espacement entre éléments interactifs */
.interactive-list > * + * {
  margin-top: 8px;
}
```

---

# PARTIE 8 : CHECKLIST IMPLÉMENTATION

## 8.1 Phase 1 - Fondations (Semaine 1-2)

- [ ] Setup design tokens CSS (couleurs, typo, spacing)
- [ ] Implémenter système de grille responsive
- [ ] Créer composant Card universel (audio/video/live)
- [ ] Refondre NavBar (bottom mobile, sidebar desktop)
- [ ] Implémenter dark mode CSS-only

## 8.2 Phase 2 - Player (Semaine 3-4)

- [ ] Refondre AudioPlayer avec nouveaux styles
- [ ] Créer VideoPlayer inspiré witv.team
- [ ] Créer LivePlayer avec badge + viewers
- [ ] Implémenter contrôles unifiés
- [ ] Ajouter PiP et Fullscreen
- [ ] Intégrer Media Session API

## 8.3 Phase 3 - Navigation (Semaine 5)

- [ ] Créer carousels horizontaux style witv.team
- [ ] Implémenter drag-to-scroll
- [ ] Ajouter catégories de contenu
- [ ] Optimiser Search avec debounce
- [ ] Améliorer Library avec tri/filtres

## 8.4 Phase 4 - Performance (Semaine 6)

- [ ] Implémenter virtual scrolling
- [ ] Ajouter lazy loading images
- [ ] Optimiser animations (GPU-only)
- [ ] Configurer service worker caching
- [ ] Tester sur appareils bas de gamme

## 8.5 Phase 5 - Polish (Semaine 7-8)

- [ ] Audit accessibilité (axe-core)
- [ ] Tests cross-browser
- [ ] Optimisation Lighthouse (PWA score)
- [ ] Tests iOS Safari
- [ ] Documentation composants

---

# PARTIE 9 : RESSOURCES

## 9.1 Fichiers Clés à Modifier

| Fichier | Action |
|---------|--------|
| `src/components/NavBar.tsx` | Refonte navigation |
| `src/components/StreamItem.tsx` | Nouveau design cards |
| `src/features/Player/` | Refonte complète |
| `src/features/Player/Video.tsx` | Nouveau VideoPlayer |
| `src/styles/` | Nouveaux design tokens |
| `src/lib/stores/player.ts` | Support video/live |

## 9.2 Dépendances Suggérées

```json
{
  "dependencies": {
    "solid-js": "^1.9.10",
    "sortablejs": "^1.15.6"
  },
  "devDependencies": {
    "vite": "^7.3.1",
    "vite-plugin-pwa": "^1.2.0",
    "open-props": "^1.7.17"
  }
}
```

## 9.3 URLs de Référence

- **Code source** : https://github.com/n-ce/ytify
- **Instance prod** : https://music.ml4-lab.com
- **Référence UX** : https://witv.team/
- **Design System** : https://open-props.style/

---

# ANNEXE : SPÉCIFICATIONS DÉTAILLÉES

## A.1 Palette Complète

```css
:root {
  /* Backgrounds */
  --color-bg-primary: #0f0f0f;
  --color-bg-secondary: #1a1a1a;
  --color-bg-tertiary: #252525;
  --color-bg-elevated: #2a2a2a;

  /* Text */
  --color-text-primary: #ffffff;
  --color-text-secondary: #a0a0a0;
  --color-text-tertiary: #666666;

  /* Accents */
  --color-accent-primary: #1db954;
  --color-accent-live: #e53935;
  --color-accent-info: #2196f3;
  --color-accent-warning: #ff9800;

  /* Borders & Dividers */
  --color-border-subtle: #333333;
  --color-border-default: #444444;

  /* States */
  --color-hover: rgba(255,255,255,0.05);
  --color-active: rgba(255,255,255,0.1);
  --color-focus: rgba(29,185,84,0.3);
}
```

## A.2 Animations Standards

```css
:root {
  /* Durées */
  --duration-instant: 100ms;
  --duration-fast: 200ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;

  /* Easings */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

## A.3 Z-Index Scale

```css
:root {
  --z-base: 0;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-fixed: 300;
  --z-modal-backdrop: 400;
  --z-modal: 500;
  --z-popover: 600;
  --z-tooltip: 700;
  --z-toast: 800;
  --z-fullscreen: 9999;
}
```

---

**FIN DU RAPPORT**

*Document généré le 07/02/2026 pour la refonte UX/UI de music.ml4-lab.com*
*Référence design : witv.team | Stack : SolidJS + Vite + TypeScript*
