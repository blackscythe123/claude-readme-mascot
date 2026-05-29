# Drop your 3D mascot frames here

This is where your **Spline / Blender** exports go. The build pipeline turns them
into looping APNGs the Worker serves at `/mascot.png`.

## Folder layout

```
assets/frames/
  idle/     frame_001.png  frame_002.png  ...   (the napping loop)
  coding/   frame_001.png  frame_002.png  ...   (the working loop)
```

## Export spec

- **Format:** PNG with transparent background (RGBA).
- **Size:** every frame in a pose must be the **same width × height**. Recommended
  ~ **480 × 220** (matches the card) or a square like 360 × 360 — your call, just keep it consistent.
- **Naming:** zero-padded so they sort correctly: `frame_001.png`, `frame_002.png`, …
- **Frame count:** 12–30 frames per loop is plenty. More = smoother but bigger file.
- **Loop:** make the last frame flow back into the first so the loop is seamless.

### Blender
Output > File Format: PNG, RGBA. Render an animation (Ctrl+F12) of your idle and
coding loops into the two folders above.

### Spline
Export each animated state as a PNG sequence (or render to frames), then place them here.

## Build & deploy the 3D version

```bash
npm run build:frames     # frames -> dist/idle.png, dist/coding.png (APNG)
npm run upload:assets    # push APNGs into KV
```

That's it — no code change. Once the assets exist, `/mascot.png` (and `/mascot`)
automatically serve your 3D frames; the hand-drawn SVG stays as the fallback.
Point your README at `/mascot.png` to use the 3D version.
