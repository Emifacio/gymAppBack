# Google Sign-In Setup Reference

Final working configuration for Google Sign-In across web, iOS, and Android.

## Platform Identifiers

| Platform | Identifier | Config Location |
|----------|------------|----------------|
| Expo Scheme | `gym-platform` | `apps/mobile/app.json` → `expo.scheme` |
| iOS Bundle ID | `com.emifacio.gymplatform` | `apps/mobile/app.json` → `expo.ios.bundleIdentifier` |
| Android Package | `com.emifacio.gymplatform` | `apps/mobile/app.json` → `expo.android.package` |

## Runtime Redirect URIs (Auto-Detected)

These are the URIs the app uses at runtime - no configuration needed.

| Platform | Runtime Redirect URI | Source |
|----------|---------------------|--------|
| Web | None (popup flow) | Google Identity Services |
| Expo Go / Dev | `https://auth.expo.io/@USERNAME/gym-platform` | Auto from Expo slug |
| iOS Native | `gym-platform://oauth2redirect` | Auto from scheme |
| Android Native | `gym-platform://oauth2redirect` | Auto from scheme |

## Google Cloud Console Setup

### Web Client
- **Type**: Web application
- **Redirect URIs**: Add `https://auth.expo.io/@YOUR_USERNAME/gym-platform`

### iOS Client
- **Bundle ID**: `com.emifacio.gymplatform`
- **Redirect URIs**: Add `gym-platform://oauth2redirect`

### Android Client
- **Package name**: `com.emifacio.gymplatform`
- **SHA-1**: From your release keystore
- **Redirect URIs**: Add `gym-platform://oauth2redirect` and `urn:ietf:wg:oauth:2.0:oob`

## Environment Variables

### Web Frontend (`apps/web/.env.local`)
```bash
VITE_API_URL=https://your-backend-url.com
VITE_GOOGLE_CLIENT_ID=<web-client-id>
```

### Mobile App (`apps/mobile/.env.local`)
```bash
EXPO_PUBLIC_API_URL=https://your-backend-url.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID=<web-client-id>
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=<web-client-id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios-client-id>
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<android-client-id>
```

### Backend (`.env`)
```bash
GOOGLE_CLIENT_ID=<primary-client-id>
GOOGLE_CLIENT_IDS=<web-client-id>,<ios-client-id>,<android-client-id>
```

### EAS Secrets (for mobile cloud builds)
```bash
eas secret:create --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "<web-client-id>"
eas secret:create --name EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID --value "<web-client-id>"
eas secret:create --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value "<ios-client-id>"
eas secret:create --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value "<android-client-id>"
```

## Client ID Summary

| Client | Created In | Env Var (Mobile) | Env Var (Web/Backend) |
|--------|------------|-------------------|----------------------|
| Web | Google Cloud Console (Web) | `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_ID` |
| Expo | Google Cloud Console (Web) | `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID` | - |
| iOS | Google Cloud Console (iOS) | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | - |
| Android | Google Cloud Console (Android) | `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | - |

## Backend

The backend validates Google ID tokens and issues app JWTs. It supports multiple client IDs via `GOOGLE_CLIENT_IDS`.

- **Endpoint**: `POST /auth/google-login`
- **Validation**: Server-side via `google-auth` library
- **Account Linking**: By `google_sub` (stable Google subject identifier)

## Deployment Checklist

| Action | Trigger | When |
|--------|---------|-------|
| Vercel redeploy | Web env var change | If `VITE_GOOGLE_CLIENT_ID` changes |
| Railway redeploy | Backend env var change | If `GOOGLE_CLIENT_IDS` changes |
| Mobile rebuild (iOS) | App config or env var change | Always after config change |
| Mobile rebuild (Android) | App config or env var change | Always after config change |
| EAS secret update | Mobile client ID change | When iOS/Android client IDs change |

## Troubleshooting

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "Google login is not configured" on web | Missing `VITE_GOOGLE_CLIENT_ID` | Set in `apps/web/.env.local` |
| "Configuración de Google login no disponible" on mobile | Missing mobile client IDs | Set all `EXPO_PUBLIC_GOOGLE_*` vars |
| Blank screen on mobile Google auth | Wrong redirect URI in Google Cloud Console | Add correct URI to client |
| Android: `ERROR 10` | SHA-1 mismatch | Regenerate Android client with correct SHA-1 |
| iOS: wrong bundle ID error | Client bundle ID doesn't match `com.emifacio.gymplatform` | Recreate iOS client with correct bundle ID |
| Works in Expo Go but fails in native build | Missing native client ID or wrong redirect | Use native client IDs and rebuild |
| Backend rejects valid token | Client ID not in `GOOGLE_CLIENT_IDS` | Add all client IDs to Railway env var |

### Debug Steps

1. **Verify env vars are set**: Check `.env.local` files exist and contain values
2. **Verify Google Cloud Console**: Each client has correct redirect URIs and identifiers
3. **Verify Railway**: `GOOGLE_CLIENT_IDS` contains all three client IDs
4. **Rebuild mobile**: After any config change, rebuild with `eas build`
5. **Check Expo username**: For Expo Go redirect, ensure `https://auth.expo.io/@YOUR_USERNAME/gym-platform` matches

## Quick Reference

```bash
# Find Expo username
eas whoami

# Get Android keystore SHA-1
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android

# Build iOS
eas build --platform ios

# Build Android
eas build --platform android
```
