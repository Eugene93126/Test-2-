# Claude 2034 · Glasses Overlay

An interactive prototype of the Claude app as seen through AR glasses on Saturday, July 8, 2034, 8:41 PM, from a high floor beside the Red Line near Belmont in Chicago. World and copy come from the 2034 AI Landscape canon.

Built in phases, with a review after each:

1. **World and lens** (this commit): city loop with depth parallax, apartment window, head motion (mouse or gyroscope), lens effects, five theme lens tints, perf meter.
2. Glass panels (refraction, rim light, ripples on hover and touch), the 3 depths, typography and glyph.
3. Shell: HUD, glance cards, Dock, model picker, section transitions.
4. Chat, Circle, World.
5. Code, Home, Memory, Trust.
6. Phone layout, performance and accessibility pass.

## Run

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/, works from any folder
```

Every push to this branch or `main` publishes the build to the `gh-pages` branch (`.github/workflows/pages.yml`), served at https://eugene93126.github.io/Test-2-/ once Pages is set to deploy from `gh-pages`. Open it on a phone and tap **Use motion sensor** to steer with head tilt; the embedded Claude preview can't read motion sensors.

Review links can set the starting state: `?theme=dusk`, `?focus=1`, `?perf`. The backtick key toggles the perf meter.

## How it's put together

- `src/scene/CityBackdrop.tsx`: the city is a looping video plus a depth map. The shader shifts near rooftops against the skyline as your head moves and applies the theme's lens tint.
- `src/scene/WindowFrame.tsx`: real geometry for the window, so it slides against the city.
- `src/scene/Lens.tsx` and `effects/LensEffect.ts`: depth of field when a panel has focus, bloom, then one pass for edge curvature, chromatic fringing, a lens-shaped vignette and grain.
- `src/head/headPose.ts`: mouse or gyroscope input drives a spring-smoothed head pose. The camera translates and keeps its eye on the panel plane, so panels stay steady while the world slides behind them.
- `src/theme/themes.ts`: Paper, Graphite, Glass, Dusk and Kiln. Each sets UI colors and a lens grade.
- `src/perf/`: frame time, p95, CPU time in the render loop, and GPU time from `EXT_disjoint_timer_query_webgl2` where the browser provides it.

## The city loop

`tools/city/` renders the background offline: a procedural Chicago (Lakeview to the Loop, the lake, Lincoln Park, Navy Pier's wheel, Lake Shore Drive traffic and a Red Line train) at blue hour. Every moving element is periodic in 16 seconds, so the loop is seamless.

```sh
npm run city:dev                                   # live preview at :5199/?live
node tools/city/render.mjs still --t 6 --out shot.png
node tools/city/render.mjs loop --w 2560 --h 1440  # frames -> public/media/city-loop.mp4, depth map, poster
```

To use a different clip, replace `public/media/city-loop.mp4` (and `city-poster.jpg`). With no matching depth map, set the parallax strength in `CityBackdrop.tsx` to 0.

HDRI: Venice Sunset from Poly Haven (CC0).
