# Google OAuth `redirect_uri_mismatch` Fix Documentation

## 1. Current OAuth Implementation Analysis

### How Google OAuth is Implemented

The application uses **Google Identity Services (GIS)** with the **OAuth 2.0 Token Client** flow:

1. **Frontend Entry Point**: `src/components/Login.tsx` - Contains the "Continue with Google" button
2. **OAuth Module**: `src/lib/modules/googleAuth.ts` - Main authentication logic
3. **Configuration**: `VITE_GOOGLE_CLIENT_ID` environment variable

### Current Authorized Origins

```json
{
  "redirect_uris": ["https://music.ml4-lab.com"],
  "javascript_origins": ["https://music.ml4-lab.com"]
}
```

**Current authorized origins:**

- ✅ `https://music.ml4-lab.com` (production)
- ❌ `http://localhost:5173` (development) - **MISSING**

---

## 2. Root Cause of `redirect_uri_mismatch`

The error occurs because:

1. Development server runs on `http://localhost:5173`
2. Google OAuth server checks if this origin is in **Authorized JavaScript origins**
3. Only `https://music.ml4-lab.com` is configured, so the request is rejected

---

## 3. Fix Instructions

### Step-by-Step Google Cloud Console Instructions

1. **Access Google Cloud Console**: https://console.cloud.google.com/
2. **Navigate to**: **APIs & Services** → **Credentials**
3. **Find OAuth 2.0 Client ID**: `38280073282-at2hpui3aj37lrld929qqiqos9lfjuaa`
4. **Click to edit**

### Add to Authorized JavaScript Origins

```
http://localhost:5173
http://localhost:3000
http://127.0.0.1:5173
```

### Add to Authorized Redirect URIs

```
http://localhost:5173
http://localhost:5173/auth/callback
```

5. **Save Changes** - May take 5-10 minutes to propagate

---

## 4. Complete Recommended URIs List

### Authorized JavaScript Origins

| URI                         | Purpose              |
| --------------------------- | -------------------- |
| `https://music.ml4-lab.com` | ✅ Production        |
| `http://localhost:5173`     | Development (Vite)   |
| `http://localhost:3000`     | Alternative dev port |
| `http://127.0.0.1:5173`     | Localhost IP         |
| `https://ytify.netlify.app` | Netlify preview      |

### Authorized Redirect URIs

| URI                                   | Purpose        |
| ------------------------------------- | -------------- |
| `https://music.ml4-lab.com`           | ✅ Production  |
| `http://localhost:5173`               | Development    |
| `http://localhost:5173/auth/callback` | Callback route |

---

## 5. Environment Variables

### Local Development (`.env`)

```bash
VITE_GOOGLE_CLIENT_ID=38280073282-at2hpui3aj37lrld929qqiqos9lfjuaa.apps.googleusercontent.com
```

### Netlify/Production

Set `VITE_GOOGLE_CLIENT_ID` in the deployment platform's environment variables.

---

## 6. Verification Steps

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:5173`
3. Click login/sync button
4. Click "Continue with Google"
5. Google popup should appear without errors
6. Authorize and verify successful redirect

---

## 7. Security Recommendations

⚠️ **Important**: Remove `docs/client_secret_*.json` from version control:

```bash
# Add to .gitignore
docs/client_secret_*.json
```

Consider rotating the client secret in Google Cloud Console.
