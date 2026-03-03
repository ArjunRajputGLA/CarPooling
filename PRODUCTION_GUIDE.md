# Production Readiness Guide

This guide details the steps to prepare your CarPooling Application for a secure, stable, and scalable production release.

## Part 1: Production Build Setup

We have updated `eas.json` with robust profiles:

- **development**: For local testing with `expo-dev-client`.
- **preview**: Internal distribution (APK).
- **production**: Store distribution (AAB bundle).
- **production-apk**: Standalone APK distribution.

### Build Commands

**1. Create a Development Client (for debugging locally):**
```bash
eas build --profile development --platform android
```
*Install the resulting APK on your device/emulator and run `npx expo start` to develop.*

**2. Create a Preview Build (for internal team testing):**
```bash
eas build --profile preview --platform android
```

**3. Create a Production Bundle (Google Play Store):**
```bash
eas build --profile production --platform android
```
*Upload the `.aab` file to the Play Console.*

**4. Create a Standalone APK (Sideloading):**
```bash
eas build --profile production-apk --platform android
```

---

## Part 2: Network Stability Architecture

**Problem:** Direct mobile-to-Supabase connections often fail on restrictive ISPs (like Jio IPv6) due to DNS resolution issues or WebSocket instability.
**Solution:** Implementing a "Database Proxy" pattern. Mobile App → Node.js Backend → Supabase.

### Why this works:
1. **Stable IPv4 Origin:** Cloud hosting (AWS, DigitalOcean, Heroku) provides a stable IPv4 address, bypassing mobile ISP IPv6 issues.
2. **Connection Pooling:** The backend maintains a persistent connection to the database, reducing handshake overhead.
3. **Security:** Reduces the attack surface by hiding direct database interactions and validating input before it hits Supabase.

### Implementation:
A sample backend is created in the `backend/` folder.

1.  **Deploy `backend`** to a Node.js host (e.g., Render, Railway, DigitalOcean App Platform).
2.  **Set Environment Variables** on the host.
3.  **Update Mobile App** to call your backend instead of direct Supabase calls for login/actions.

**Example Mobile Code Change (`src/lib/api.js`):**

```javascript
// New file: src/lib/api.js
const BACKEND_URL = "https://your-backend-url.com";

export const api = {
  auth: {
    login: async (email, password) => {
        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return await response.json();
    }
  }
};
```

---

## Part 3: Security Hardening

### 1. Restrict Google Maps API Keys
Do this in the Google Cloud Console:
1.  Go to **APIs & Services > Credentials**.
2.  Select your Android API Key.
3.  Under **Application restrictions**, choose **Android apps**.
4.  Add your package name (found in `app.json`) and **SHA-1 certificate fingerprint**.
    *   *To get SHA-1 for development:* Run `cd android && ./gradlew signingReport`
    *   *To get SHA-1 for production:* Check the "App Signing" section in Google Play Console.

### 2. Prevent Sensitive Key Exposure
*   **NEVER** commit `.env` files. Ensure `.env` is in `.gitignore`.
*   Use `EXPO_PUBLIC_` prefix only for keys that are safe to be public (like Supabase Anon Key).
*   Secret Service Keys (Supabase `service_role`, Stripe Secret) belong **ONLY** on the Backend.

### 3. Remove Console Logs in Production
Install the babel plugin:
```bash
npm install --save-dev babel-plugin-transform-remove-console
```
Update `babel.config.js`:
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      production: {
        plugins: ['transform-remove-console']
      }
    }
  };
};
```

### 4. Production Error Handling
*   Wrap your root component in an **Error Boundary**.
*   Use a service like **Sentry** for crash reporting.
    ```bash
    npx expo install sentry-expo
    ```

### 5. Recommended Folder Structure
Scalable Expo structure (you are close!):
```
/src
  /assets        (images, fonts)
  /components    
    /ui          (Reusable basic UI: Button, Input) - *You have this in common*
    /features    (Specific logical components: RideCard, MapView)
  /config        (Environment config, theme)
  /hooks         (Custom Hooks: useAuth, useLocation)
  /navigation    (Navigators)
  /screens       (Page views)
  /services      (API calls, Backend interfacing)
  /store         (State management: Context, Redux, Zustand)
  /types         (TypeScript types - highly recommended)
  /utils         (Helpers)
```

---

## Part 4: Production Checklist

**Before Publishing:**

- [ ] **Increment Version Code:** Update `versionCode` in `app.json` for every new upload.
- [ ] **Optimize Assets:** Compress images (WebP/PNG) to reduce bundle size.
- [ ] **Clean Permissions:** Review `AndroidManifest.xml` (or `app.json` -> `android.permissions`) and remove unused permissions.
- [ ] **Test Deep Links:** Ensure `scheme` handling works correctly.
- [ ] **Network Validation:** Test on cellular data (4G/5G) specifically, not just WiFi.
- [ ] **Signing Secrets:** Verify your `keystore` is backed up securely if managing locally (EAS usually manages this for you).
- [ ] **Update Privacy Policy:** Ensure your URL is accessible and active.
