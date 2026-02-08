# YTIFY Backend Agent - Stabilite & Fiabilite

## Mission
Securiser et optimiser toutes les integrations API pour une fiabilite production-grade.

---

## 1. CONTEXTE TECHNIQUE

### Stack Backend
- **Runtime**: Vercel Serverless Functions + Netlify Edge Functions
- **APIs Externes**: YouTube Music, Invidious, JioSaavn, LRCLIB, Last.fm
- **Storage**: Netlify Blobs (cloud sync), localStorage (client)
- **Framework**: SolidJS (frontend), TypeScript

### Architecture API
```
src/
├── backend/               # Serverless API handlers
│   ├── youtube_search.ts  # YTM search integration
│   ├── get_youtube_song.ts # Song data extraction
│   ├── youtube_album_api.ts
│   ├── youtube_artist_api.ts
│   ├── lastfm_api.ts
│   ├── subfeed.ts
│   └── suggestions.ts
├── lib/modules/           # Client-side API integrations
│   ├── getStreamData.ts   # Invidious streaming
│   ├── jioSaavn.ts        # JioSaavn fallback
│   ├── cloudSync.ts       # Netlify Blobs sync
│   ├── fetchYTMusicSearchResults.ts
│   └── audioErrorHandler.ts
└── api/                   # Vercel serverless endpoints
    ├── search.ts
    ├── album.ts
    └── artists.ts
```

---

## 2. PROBLEMES IDENTIFIES

### 2.1 URLs Hardcodees Sans Fallback

| URL | Fichier | Risque | Status |
|-----|---------|--------|--------|
| `https://raw.githubusercontent.com/n-ce/Uma/main/iv.txt` | pure.ts | CRITIQUE | CORRIGE |
| `https://fast-saavn.vercel.app/api` | jioSaavn.ts | CRITIQUE | A CORRIGER |
| `https://ytify-backend.zeabur.app` | fetchYTMusicSearchResults.ts | CRITIQUE | A CORRIGER |
| `https://music.youtube.com/youtubei/v1/*` | backend/*.ts | HAUTE | A SURVEILLER |
| `https://www.googleapis.com/oauth2/v3/userinfo` | googleAuth.ts | MOYENNE | OK |

### 2.2 Error Handling Manquant

| Fichier | Ligne | Probleme |
|---------|-------|----------|
| `cloudSync.ts` | 106 | `response.json()` sans try-catch |
| `cloudSync.ts` | 153 | `JSON.parse(rawData)` sans try-catch |
| `config.ts` | 34-36 | `JSON.parse(savedStore)` sans try-catch |
| `fetchArtist.ts` | 18-24 | `.json()` peut echouer |
| `fetchChannel.ts` | 31-42 | `.json()` sans error handling |

### 2.3 Retry Logic Incomplet

| Fichier | Probleme |
|---------|----------|
| `getStreamData.ts` | Pas d'exponential backoff |
| `audioErrorHandler.ts` | Pas de circuit breaker |
| `fetchMix.ts` | Retry faible |

---

## 3. PATTERNS A IMPLEMENTER

### 3.1 Safe JSON Parse
```typescript
// src/lib/utils/safe.ts
export const safeJsonParse = <T>(text: string, fallback: T): T => {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn('JSON parse error:', error);
    return fallback;
  }
};

export const safeJsonStringify = (data: unknown): string | null => {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.warn('JSON stringify error:', error);
    return null;
  }
};
```

### 3.2 Safe LocalStorage
```typescript
export const safeStorage = {
  get: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('localStorage get error:', error);
      return null;
    }
  },
  set: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('localStorage set error (quota?):', error);
      return false;
    }
  },
  remove: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
};
```

### 3.3 Fetch avec Timeout + Retry
```typescript
export async function fetchWithRetry(
  url: string,
  options: {
    maxRetries?: number;
    timeout?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    timeout = 15000,
    backoffMultiplier = 2
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) return response;

      // Non-retryable status codes
      if (response.status === 404 || response.status === 401) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delay = Math.pow(backoffMultiplier, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
```

### 3.4 Circuit Breaker
```typescript
type CircuitState = 'closed' | 'open' | 'half-open';

class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: CircuitState = 'closed';

  constructor(
    private readonly name: string,
    private readonly threshold = 5,
    private readonly resetTimeout = 30000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
        console.log(`Circuit ${this.name}: half-open, testing...`);
      } else {
        throw new Error(`Circuit ${this.name} is open`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'half-open') {
      console.log(`Circuit ${this.name}: recovered, closing`);
    }
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.warn(`Circuit ${this.name}: opened after ${this.failures} failures`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Instance globale pour chaque service
export const invidiousCircuit = new CircuitBreaker('invidious', 3, 60000);
export const jioSaavnCircuit = new CircuitBreaker('jiosaavn', 3, 30000);
```

### 3.5 Validation avec Zod
```typescript
import { z } from 'zod';

// Schema pour les donnees de stream
export const StreamDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string().optional(),
  authorId: z.string().optional(),
  duration: z.number().optional(),
  adaptiveFormats: z.array(z.object({
    url: z.string(),
    mimeType: z.string(),
    bitrate: z.number().optional(),
    audioQuality: z.string().optional()
  })).optional()
});

export type StreamData = z.infer<typeof StreamDataSchema>;

export const validateStreamData = (data: unknown) => {
  const result = StreamDataSchema.safeParse(data);
  if (!result.success) {
    console.warn('Stream data validation failed:', result.error);
    return null;
  }
  return result.data;
};

// Schema pour les resultats de recherche
export const SearchResultSchema = z.object({
  type: z.enum(['video', 'song', 'album', 'playlist', 'artist']),
  videoId: z.string().optional(),
  title: z.string(),
  author: z.string().optional(),
  thumbnails: z.array(z.object({
    url: z.string(),
    width: z.number(),
    height: z.number()
  })).optional()
});
```

---

## 4. FICHIERS A MODIFIER

### 4.1 jioSaavn.ts - Ajouter Fallback APIs
```typescript
// AVANT
const API_URL = 'https://fast-saavn.vercel.app/api';

// APRES
const SAAVN_APIS = [
  'https://fast-saavn.vercel.app/api',
  'https://saavn-api.vercel.app/api',
  'https://jiosaavn-api-private.vercel.app/api'
];

async function fetchFromSaavn(title: string, artist: string): Promise<JioSaavnResult | null> {
  for (const api of SAAVN_APIS) {
    try {
      const response = await fetchWithTimeout(
        `${api}?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`,
        10000
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn(`JioSaavn API ${api} failed:`, error);
    }
  }
  return null;
}
```

### 4.2 cloudSync.ts - Safe Operations
```typescript
// Ligne 106 - AVANT
const data = await pullResponse.json();

// APRES
let data;
try {
  data = await pullResponse.json();
} catch (error) {
  console.error('Failed to parse pull response:', error);
  return { success: false, message: 'Sync data corrupted' };
}

// Ligne 153 - AVANT
const libraryData = JSON.parse(rawData);

// APRES
const libraryData = safeJsonParse(rawData, {});
if (!libraryData || typeof libraryData !== 'object') {
  console.error('Invalid library data structure');
  return { success: false, message: 'Invalid library data' };
}
```

### 4.3 config.ts - Protected Parsing
```typescript
// Ligne 34-36 - AVANT
const savedStore = localStorage.getItem('config');
if (savedStore) {
  const parsed = JSON.parse(savedStore);

// APRES
const savedStore = safeStorage.get('config');
if (savedStore) {
  const parsed = safeJsonParse(savedStore, null);
  if (!parsed) {
    console.warn('Config corrupted, using defaults');
  }
```

### 4.4 getStreamData.ts - Improved Retry
```typescript
// Ajouter exponential backoff et logging
export async function getStreamData(
  id: string,
  instances: string[],
  options: { prefetch?: boolean } = {}
): Promise<StreamData | ErrorResponse> {
  const { prefetch = false } = options;

  for (let i = 0; i < instances.length; i++) {
    const instance = instances[i];

    try {
      const response = await invidiousCircuit.execute(() =>
        fetchWithRetry(`${instance}/api/v1/videos/${id}`, {
          timeout: prefetch ? 5000 : 15000,
          maxRetries: prefetch ? 1 : 2
        })
      );

      const data = await response.json();
      const validated = validateStreamData(data);

      if (validated) {
        return validated;
      }
    } catch (error) {
      console.warn(`Instance ${instance} failed for ${id}:`, error);

      if (prefetch) {
        return { error: 'Prefetch failed' };
      }
    }
  }

  return { error: 'All instances failed' };
}
```

---

## 5. CHECKLIST DE VALIDATION

### Fiabilite
- [ ] fetchUma fonctionne avec GitHub down (fallback)
- [ ] JioSaavn fallback sur API secondaire
- [ ] CloudSync ne crash pas sur donnees corrompues
- [ ] Config ne crash pas sur localStorage corrompu
- [ ] Retry automatique avec backoff exponentiel
- [ ] Circuit breaker empeche cascade d'erreurs

### Performance
- [ ] Timeout sur tous les fetch (max 15s)
- [ ] Pas de requetes bloquantes
- [ ] Logs pour debugging production

### Securite
- [ ] Validation Zod sur toutes les reponses API
- [ ] Pas de donnees sensibles en clair
- [ ] Error messages sans info sensible

---

## 6. COMMANDES

```bash
# Dev
npm run dev

# Build
npm run build

# Type check
npm run typecheck

# Installer Zod (si non present)
npm install zod
```

---

## 7. PRIORITES D'IMPLEMENTATION

1. **CRITIQUE** (Jour 1):
   - Safe JSON parsing utilities
   - JioSaavn fallback APIs
   - CloudSync error handling

2. **HAUTE** (Jour 2):
   - Circuit breaker pattern
   - Config protected parsing
   - Fetch with retry + timeout

3. **MOYENNE** (Jour 3):
   - Zod validation schemas
   - Logging infrastructure
   - getStreamData improvements

4. **BASSE** (Jour 4):
   - Monitoring dashboard
   - Performance metrics
   - Documentation
