## Problem

Google shows the Lovable icon for `alllogisticscargo.com` because:

1. `index.html` only declares `/favicon.png` (the ALC logo), but Google and most browsers request `/favicon.ico` first.
2. There is no `public/favicon.ico` in the project, so the platform serves the default Lovable `favicon.ico` at that path. `curl -I https://www.alllogisticscargo.com/favicon.ico` returns 200 with `image/vnd.microsoft.icon` — that is the Lovable default Google has indexed.
3. `og-image.png` referenced in `index.html` returns 404, so social previews also fall back to defaults.

## Plan

1. **Generate a real ALC `favicon.ico`** from `public/alc-logo.png` (multi-size 16/32/48) and write it to `public/favicon.ico`. This overrides the platform default at the path Google actually crawls.
2. **Optimize `public/favicon.png`** — current file is 1.1 MB (the full logo). Resize to a 256×256 PNG so browsers/Google can fetch it quickly.
3. **Update `index.html`** to declare both, in priority order:
   - `<link rel="icon" href="/favicon.ico" sizes="any">`
   - `<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png">`
   - keep `<link rel="apple-touch-icon" href="/favicon.png">`
4. **Generate an `og-image.png`** (1200×630) using the ALC logo on brand navy background and place at `public/og-image.png`, fixing the current 404 referenced by `og:image` / `twitter:image`.
5. **Note on Google timing**: even after publishing, Google re-crawls favicons on its own schedule (often days to weeks). I'll mention this so you know the change is live but the SERP icon will refresh later. Optionally request re-indexing in Google Search Console once connected.

## Files touched

- `public/favicon.ico` (new)
- `public/favicon.png` (replaced, smaller)
- `public/og-image.png` (new)
- `index.html` (icon link tags)

No code/business logic changes.