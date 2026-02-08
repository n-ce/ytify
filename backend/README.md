# ytify Backend

Backend self-hosted haute performance pour ytify, remplaçant les Netlify Edge Functions.

## Stack Technique

- **Runtime**: Deno 2.x
- **Framework**: Hono (ultrafast router)
- **Storage**: SQLite + LRU Cache
- **Déploiement**: Docker

## Démarrage rapide

### Développement local

```bash
# Installer Deno (si pas déjà fait)
# https://docs.deno.com/runtime/getting_started/installation/

# Lancer en mode dev (avec hot reload)
deno task dev
```

### Production avec Docker

```bash
# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec tes clés RapidAPI

# Build et run
docker-compose up -d

# Vérifier les logs
docker-compose logs -f
```

## Configuration

Variables d'environnement (voir `.env.example`):

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port du serveur | `3000` |
| `ALLOWED_ORIGINS` | Origins CORS (comma-separated) | `http://localhost:5173` |
| `DB_PATH` | Chemin base SQLite | `./data/ytify.db` |
| `RAPIDAPI_KEYS` | Clés RapidAPI (comma-separated) | - |
| `CACHE_MAX_SIZE` | Taille max LRU cache | `500` |
| `CACHE_TTL_MS` | TTL cache en ms | `300000` (5min) |

## Endpoints API

| Route | Méthode | Description |
|-------|---------|-------------|
| `/health` | GET | Health check |
| `/hash` | POST | Hash email+password |
| `/sync/:hash` | GET | Récupère meta + ETag |
| `/sync/:hash` | POST | Delta pull (smart sync) |
| `/sync/:hash` | PUT | Delta push |
| `/library/:hash` | GET | Lecture complète bibliothèque |
| `/library/:hash` | PUT | Écriture complète bibliothèque |
| `/api/v1/videos/:id` | GET | Fallback YouTube via RapidAPI |
| `/ss/:id` | GET | Récupère contenu statique |
| `/ss` | POST | Crée contenu statique |
| `/s/:id` | GET | Aperçu lien (Open Graph) |

## Déploiement sur VPS

1. **Copier les fichiers sur le serveur**:
```bash
scp -r backend/ user@server:/var/www/ytify/
```

2. **Configurer les variables d'environnement**:
```bash
cd /var/www/ytify/backend
cp .env.example .env
nano .env  # Configurer RAPIDAPI_KEYS
```

3. **Lancer le backend**:
```bash
docker-compose up -d
```

4. **Mettre à jour nginx**:
```bash
sudo cp ytify.nginx.conf /etc/nginx/sites-available/ytify
sudo nginx -t
sudo systemctl reload nginx
```

## Performance

| Métrique | Valeur attendue |
|----------|-----------------|
| Cold start | <100ms |
| Library GET (cache) | <5ms |
| Library GET (db) | <20ms |
| Sync POST | <50ms |
| Mémoire | 50-100MB |
