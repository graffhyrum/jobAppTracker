# Extension Icons

Icons generated from https://favicon.io/ and configured for browser extension use.

## Icon Files

- `favicon-16x16.png` - 16x16 pixels (toolbar icon, small sizes)
- `favicon-32x32.png` - 32x32 pixels (used for 32px and scaled to 48px)
- `android-chrome-192x192.png` - 192x192 pixels (used for 128px and 192px)
- `android-chrome-512x512.png` - 512x512 pixels (Chrome Web Store)
- `apple-touch-icon.png` - 180x180 pixels (Apple devices)
- `favicon.ico` - Multi-size ICO file

## Additional Files

- `site.webmanifest` - Web app manifest (from favicon.io, not used by extension)
- `favicon_io.zip` - Original download archive from favicon.io
- `about.txt` - Favicon.io attribution

## Usage

Icons are referenced in `manifest.json`:
- Extension toolbar and management UI use sizes 16, 32, 48, 128, 192
- Chrome Web Store listing uses 512px icon
- Where exact sizes aren't available, closest size is used and browser scales automatically
