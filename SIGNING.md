# Code Signing Guide

## macOS Code Signing & Notarization

The release workflow currently builds **unsigned** macOS binaries. Users will see a Gatekeeper warning when opening the app for the first time.

To enable code signing and notarization, follow these steps:

### Prerequisites

1. An Apple Developer account ($99/year)
2. A **Developer ID Application** certificate from Apple
3. An app-specific password for notarization

### Step 1: Export your signing certificate

1. Open **Keychain Access** on your Mac
2. Find your **Developer ID Application** certificate
3. Right-click and export as `.p12` file with a password

### Step 2: Add GitHub repository secrets

Add the following secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

| Secret | Description |
|--------|-------------|
| `MAC_CERTS` | Base64-encoded `.p12` certificate file. Generate with: `base64 -i certificate.p12 \| pbcopy` |
| `MAC_CERTS_PASSWORD` | The password you set when exporting the `.p12` file |
| `APPLE_ID` | Your Apple Developer account email |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password from [appleid.apple.com](https://appleid.apple.com) > Sign-In and Security > App-Specific Passwords |
| `APPLE_TEAM_ID` | Your Apple Developer Team ID (found in Apple Developer portal) |

### Step 3: Update the workflow

Replace the macOS packaging step in `.github/workflows/release.yml`:

```yaml
      - name: Package (macOS)
        if: matrix.platform == 'mac'
        run: npx electron-builder --mac --publish never
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CSC_LINK: ${{ secrets.MAC_CERTS }}
          CSC_KEY_PASSWORD: ${{ secrets.MAC_CERTS_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
```

### Step 4: Update electron-builder config

Add notarization settings to `package.json` under the `build.mac` key:

```json
{
  "build": {
    "mac": {
      "target": ["dmg", "zip"],
      "identity": "Developer ID Application: Your Name (TEAMID)",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist",
      "notarize": true
    }
  }
}
```

### Step 5: Create entitlements file

Create `build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
</dict>
</plist>
```

## Windows Code Signing

For Windows, you can use an EV or standard code signing certificate. Add these secrets:

| Secret | Description |
|--------|-------------|
| `WIN_CSC_LINK` | Base64-encoded `.pfx` certificate |
| `WIN_CSC_KEY_PASSWORD` | Certificate password |

Then update the Windows packaging step:

```yaml
      - name: Package (Windows)
        if: matrix.platform == 'win'
        run: npx electron-builder --win --publish never
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
```
