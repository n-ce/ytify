# YTIFY Music App - Frontend Agent Prompt

## Mission
Perfectionner l'UX/UI de l'application YTIFY Music tout en assurant une fluidité et instantanéité maximales. L'application est déployée sur https://ytify.ml4-lab.com

---

## 1. CONTEXTE TECHNIQUE

### Stack Technologique
- **Framework Frontend**: SolidJS 1.9.10 (reactive signals, fine-grained updates)
- **Build Tool**: Vite 7.3.1 + TypeScript
- **Styling**: CSS vanilla + Open Props design tokens + PostCSS
- **Backend**: Vercel Serverless Functions + Netlify Edge Functions
- **PWA**: vite-plugin-pwa pour support offline
- **Version**: 8.2.1-ml4.0

### Architecture des Dossiers
```
src/
├── features/           # Modules fonctionnels (Home, Player, Queue, List, Settings)
├── components/         # Composants UI réutilisables
├── lib/
│   ├── stores/        # State management SolidJS (player, queue, app, navigation)
│   ├── modules/       # Business logic (getStreamData, cloudSync, googleAuth)
│   └── utils/         # Helpers (config, player, library)
├── styles/            # CSS global + tokens
├── backend/           # Intégrations API (YouTube Music, Last.fm)
└── locales/           # i18n (14 langues)
```

---

## 2. PROBLÈME PRIORITAIRE: Google OAuth Non Fonctionnel

### Symptôme
Le bouton "Continue with Google" ne déclenche pas la popup d'authentification Google.

### Fichiers Concernés
- `src/lib/modules/googleAuth.ts` - Implémentation OAuth
- `src/components/Login.tsx` - Composant de connexion
- `src/features/Home/Welcome.tsx` - Écran d'accueil

### Implémentation Actuelle (googleAuth.ts)
```typescript
// Chargement du script Google Identity Services
export async function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.oauth2) return;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load GIS'));
    document.head.appendChild(script);
  });
}

// Fonction de sign-in
export async function signInWithGoogle(): Promise<{ hash: string; user: GoogleUser }> {
  await loadGoogleIdentityServices();

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'email profile',
      callback: async (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        // Fetch user info et créer hash...
      },
    });

    client.requestAccessToken();
  });
}
```

### Points de Vérification
1. **Console Google Cloud** - Vérifier que `https://ytify.ml4-lab.com` est dans les "Authorized JavaScript origins"
2. **Variable d'environnement** - `VITE_GOOGLE_CLIENT_ID` configurée sur Netlify
3. **Popup Blocker** - Le navigateur peut bloquer la popup
4. **Erreurs Console** - Vérifier les erreurs CSP ou CORS

### Configuration Google Cloud Requise
- **Authorized JavaScript origins**:
  - `https://ytify.ml4-lab.com`
  - `http://localhost:5173` (dev)
- **Authorized redirect URIs**: Non requis pour implicit flow

---

## 3. ARCHITECTURE DES STORES (State Management)

### playerStore (`src/lib/stores/player.ts`)
```typescript
interface PlayerState {
  stream: Stream;           // Current track metadata
  HLS: boolean;            // HLS streaming mode
  playbackState: 'playing' | 'paused' | 'loading' | 'error';
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  history: Stream[];       // Previous tracks
  immersiveMode: boolean;  // Fullscreen player
  supportsOpus: boolean;   // Codec detection
}
```

### queueStore (`src/lib/stores/queue.ts`)
```typescript
interface QueueState {
  list: Stream[];          // Current queue
  standby: Stream[];       // Pre-loaded items
  removeMode: boolean;     // Edit mode
  loading: boolean;
}
```

### appStore (`src/lib/stores/app.ts`)
```typescript
interface AppState {
  instances: string[];     // Invidious instances
  api: string;            // Current API endpoint
  actionsMenu: { stream: Stream } | null;
  snackbar: string;       // Toast messages
  syncState: 'idle' | 'syncing' | 'error';
}
```

### navStore (`src/lib/stores/navigation.ts`)
- Gère la navigation entre features: home, player, queue, list, settings, updater
- Synchronisé avec les URL params (?s=id, ?playlist=id, etc.)

---

## 4. FLUX DE DONNÉES

### Lecture d'un Track
```
User Click → playTrack(stream)
    ↓
playerStore.stream = stream
    ↓
getStreamData(stream.id) → Invidious API
    ↓
setAudioStreams() → Sélection qualité (opus/aac)
    ↓
audio.src = streamUrl
    ↓
UI reactive update via SolidJS signals
```

### Recherche
```
Input → searchStore.query
    ↓
fetchYTMusicSearchResults(query, filter)
    ↓
Backend API (/api/search)
    ↓
YouTube Music API (music.youtube.com/youtubei/v1/search)
    ↓
searchStore.results → UI render
```

### Cloud Sync
```
signInWithGoogle() → OAuth token
    ↓
Hash = SHA-256(google:sub:email)
    ↓
runSync(hash) → Netlify Blobs
    ↓
Merge local + remote library
    ↓
localStorage + cloud updated
```

---

## 5. DESIGN SYSTEM

### Tokens CSS (`src/styles/tokens.css`)
```css
/* Couleurs - Thème sombre witv-inspired */
--bg-base: oklch(10% 0 0);           /* #0f0f0f */
--bg-surface: oklch(14% 0 0);        /* #1a1a1a */
--bg-elevated: oklch(18% 0 0);       /* #242424 */
--text-primary: oklch(95% 0 0);
--text-secondary: oklch(70% 0 0);
--text-muted: oklch(50% 0 0);

/* Accent dynamique (extrait de l'artwork) */
--accent-primary: var(--source, oklch(65% 0.2 145));

/* Glassmorphism */
--glass-bg: oklch(14% 0 0 / 80%);
--glass-blur: 20px;
--glass-border: oklch(100% 0 0 / 10%);

/* Spacing (8px base) */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;

/* Typography fluide */
--font-size-sm: clamp(12px, 2vw, 14px);
--font-size-md: clamp(14px, 2.5vw, 16px);
--font-size-lg: clamp(18px, 3vw, 22px);

/* Animations */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--duration-fast: 150ms;
--duration-normal: 300ms;
```

### Patterns d'Animation (`src/styles/animations.css`)
- `slide-in-up` / `slide-out-down` - Entrées verticales
- `fade-in` / `scale-in` - Apparitions
- `pulse` - Indicateur de lecture (equalizer)
- `shimmer` - Skeleton loading
- Support `prefers-reduced-motion`

### Responsive
- **Mobile-first** avec breakpoints: 640px, 1024px, 1440px
- **Container queries** pour grids adaptatifs
- **NavBar**: Bottom nav (mobile) → Sidebar (desktop)
- **Player**: Fullscreen overlay (mobile) → Right sidebar (desktop)

---

## 6. COMPOSANTS CLÉS

### NavBar (`src/components/NavBar.tsx`)
- Navigation principale avec 4 sections: Home, Hub, Library, Search
- Bouton Sign In / Account selon état auth
- Glassmorphism + sticky positioning

### StreamItem (`src/components/StreamItem.tsx`)
- Carte de contenu (track, video, playlist)
- Thumbnail + metadata + actions
- Variants: horizontal (list) / vertical (grid)

### Player (`src/features/Player/index.tsx`)
- Contrôles: play/pause, skip, previous, shuffle, repeat
- Progress bar avec seek
- Volume + playback rate
- Lyrics (time-synced via LRCLIB)
- Video mode toggle

### Login (`src/components/Login.tsx`)
- Modal dialog avec animation scale-in
- Google OAuth button
- Email/password alternative
- Intégration cloudSync

### Welcome (`src/features/Home/Welcome.tsx`)
- Écran onboarding pour nouveaux utilisateurs
- Feature cards: Stream, Library, Sync
- CTAs: "Start Exploring" / "Sign In to Sync"

---

## 7. APIs INTÉGRÉES

### YouTube Music (Primary)
- Endpoint: `music.youtube.com/youtubei/v1/search`
- Utilisé via `/api/search` serverless function
- Retourne: songs, videos, albums, playlists, artists

### Invidious (Streaming)
- Proxy pour récupérer les URLs de streaming
- Multiple instances avec fallback automatique
- Adaptive formats (audio/video streams)

### JioSaavn (Fallback)
- Source audio alternative pour contenu bloqué
- Détection automatique des "Topic" channels

### LRCLIB (Lyrics)
- Paroles synchronisées
- Recherche par titre + artiste

### Last.fm (Metadata)
- Informations supplémentaires sur les tracks

---

## 8. OBJECTIFS UX/UI À PERFECTIONNER

### Performance & Fluidité
1. **Instant feedback** - Réponse immédiate à chaque interaction
2. **Optimistic updates** - UI update avant confirmation serveur
3. **Skeleton loading** - Placeholders pendant le chargement
4. **Prefetching** - Précharger les données probables
5. **60fps animations** - Utiliser transform/opacity uniquement

### Micro-interactions
1. **Pressable feedback** - Scale 0.95 sur touch/click
2. **Hover states** - Élévation subtile + ombre
3. **Loading indicators** - Spinners contextuels
4. **Success/Error feedback** - Toasts non-intrusifs
5. **Pull-to-refresh** - Geste natif sur mobile

### Accessibilité
1. **Keyboard navigation** - Focus visible, shortcuts
2. **Screen reader** - ARIA labels complets
3. **Reduced motion** - Respecter préférences système
4. **Color contrast** - WCAG AA minimum
5. **Touch targets** - 44px minimum

### Visual Polish
1. **Consistent spacing** - Utiliser les tokens
2. **Typography hierarchy** - Clair et lisible
3. **Color harmony** - Accent dynamique cohérent
4. **Smooth transitions** - Pas de jumps visuels
5. **Empty states** - Messages et illustrations

---

## 9. FICHIERS CRITIQUES À MODIFIER

### Auth/OAuth
- `src/lib/modules/googleAuth.ts` - Fix OAuth popup
- `src/components/Login.tsx` - Améliorer UX auth
- `src/components/Login.css` - Polish visuel

### Player Experience
- `src/features/Player/index.tsx` - Animations fluides
- `src/features/Player/Controls.tsx` - Feedback tactile
- `src/features/Player/slider.css` - Progress bar smooth

### Navigation & Layout
- `src/components/NavBar.tsx` - Transitions douces
- `src/features/index.tsx` - Page transitions
- `src/styles/global.css` - Layout optimizations

### Loading States
- `src/components/SkeletonLoader.tsx` - Shimmer effect
- `src/features/Home/Hub/index.tsx` - Skeleton grids
- `src/features/Home/Search/Results.tsx` - Loading feedback

### Feedback & Toasts
- `src/components/SnackBar.tsx` - Toast animations
- `src/lib/stores/app.ts` - Snackbar queue system

---

## 10. COMMANDES DE DÉVELOPPEMENT

```bash
# Installation
npm install

# Dev server (http://localhost:5173)
npm run dev

# Build production
npm run build

# Preview build
npm run preview

# Type checking
npm run typecheck
```

---

## 11. VARIABLES D'ENVIRONNEMENT

```env
# Google OAuth
VITE_GOOGLE_CLIENT_ID=38280073282-at2hpui3aj37lrld929qqiqos9lfjuaa.apps.googleusercontent.com

# API endpoints (optionnel)
VITE_API_URL=https://ytify.ml4-lab.com/api
```

---

## 12. CHECKLIST DE VALIDATION

### OAuth Google
- [ ] Popup s'ouvre correctement
- [ ] Authentification réussie
- [ ] Token stocké dans localStorage
- [ ] Sync cloud déclenché
- [ ] UI met à jour (Sign In → Account)

### UX Fluidity
- [ ] Animations à 60fps
- [ ] Pas de layout shifts
- [ ] Feedback immédiat sur interactions
- [ ] Skeleton loaders pendant chargement
- [ ] Toasts non-bloquants

### Responsive
- [ ] Mobile portrait optimal
- [ ] Mobile landscape fonctionnel
- [ ] Tablet adapté
- [ ] Desktop sidebar layout
- [ ] Safe area insets respectés

### Accessibility
- [ ] Navigation clavier complète
- [ ] Focus visible
- [ ] ARIA labels présents
- [ ] Contraste suffisant
- [ ] Reduced motion respecté

---

## 13. RESSOURCES & DOCUMENTATION

### SolidJS
- Docs: https://www.solidjs.com/docs/latest
- Tutorial: https://www.solidjs.com/tutorial
- Stores: https://www.solidjs.com/docs/latest/api#createstore

### Google Identity Services
- Docs: https://developers.google.com/identity/gsi/web/guides/overview
- OAuth2: https://developers.google.com/identity/oauth2/web/guides/overview
- Migration: https://developers.google.com/identity/gsi/web/guides/migration

### Open Props
- Docs: https://open-props.style/
- Tokens: https://open-props.style/#colors

### Vite
- Docs: https://vitejs.dev/guide/
- Env Variables: https://vitejs.dev/guide/env-and-mode

---

## INSTRUCTIONS POUR L'AGENT

1. **Analyser** les erreurs console sur https://ytify.ml4-lab.com
2. **Débugger** le flux OAuth Google en priorité
3. **Optimiser** les animations et transitions pour 60fps
4. **Améliorer** les feedback visuels (loading, success, error)
5. **Tester** sur mobile et desktop
6. **Documenter** les changements effectués

Focus sur la **fluidité perçue** - l'utilisateur doit sentir que l'app répond instantanément à chaque action.
