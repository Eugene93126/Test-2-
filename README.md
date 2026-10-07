# Claude 2034 · Glasses Overlay

An interactive prototype of the Claude app as seen through AR glasses on Saturday, July 8, 2034, 8:41 PM, from a high floor beside the Red Line near Belmont in Chicago. World and copy come from the 2034 AI Landscape canon.

Built in phases, with a review after each:

1. **World and lens**: city loop with depth parallax, apartment window, head motion (mouse or gyroscope), lens effects, five theme lens tints, perf meter.
2. **Glass**: glass slabs at 3 depths with real refraction, a head-tracked rim light, inner sheen, a lens under the pointer and ripples on press; focus by gaze; two type pairings and three logo options to choose from in the Review menu.
3. **Shell**: live HUD (in-world clock from 8:41 PM, grid price that drops when peak ends at 9, energy meter, battery), glance cards that count down or open their section, the Claude Dock (magnetic icons, sliding highlight, pin and unpin, labels), the model picker (five models, Mythos locked) and section transitions. Sheets are overlay glass that refracts the panels behind them.
4. **Sections and model transitions**: Chat in voice mode (a 3D orb and waveform; your words appear as you speak, Claude answers with a signed clip), Claude Circle (six agents, branching skill trees, a three-round debate arena with a judge meter), Claude World (illustrated gallery, unsigned uploads hidden unless shown, provenance chains). Switching models has its own transition: Fable Duo warps space, Pantheon 2.0 shatters reality over molten light, Odyssey 3.2 merges the depth layers into one plane, Pantheon 1.0 dips like a power cycle.
   - **Spatial pass**: glass rims adapt to how bright the city is behind them, steep angles split light into a spectrum, and nothing is ever drawn pure black (AR displays add light). Windows that move through depth bend space like a gravitational lens: the city and neighboring panels warp around them, with an Einstein ring at the edge and a Z bounce as sheets land. Controls you aren't looking at shimmer in superposition until your gaze (pointer, finger, or the center reticle in motion mode) collapses them into a raised button. Scroll or pinch to walk toward the glass or away from it: focus follows and text weight compensates. In Circle, light flows from the agent's engram into its tree and out along the branches, flow toward a quarantined source fizzles out, and arguments travel along the debate track to the judge.
5. **Code, Home, Memory, Trust**: Claude Code shows the harbor-ledger swarm build (planner, four builders, tests, an independently trained verifier, a signed bundle) as a live map with work flowing between agents, a terminal and a replay at 140×. Claude Home lists approved devices (the Xiaomi purifier can't connect), a household energy ledger with the 4–9 PM peak and tonight's off-peak plan that follows your switches, and the Pantheon home dock waitlist. Memory shows each memory's provenance, lets you forget it (and anything learned only from it) with undo, and lets you review the write Brian quarantined. Trust covers signed identity on glasses and puck, the family safe word, second-channel callbacks, a provenance check on a leaked recording, and what Claude blocked.
   - **Effects setting** (Review → Effects): Spatial keeps everything above; Standard swaps the lensing, flights, auras and per-model transitions for plain smooth fades and slides. It's remembered on the device, and `?fx=standard` sets it from a link.
6. **Phones, performance, accessibility** (current):
   - Phones: the clock in the HUD opens the glance cards; a short landscape layout (a phone on its side) with compact chrome and scrolling sections; the Dock fits a 375 px iPhone SE; 44 px touch targets on touch screens; pinch walks toward the glass instead of zooming the page.
   - Performance: Review → Quality (Auto, High, Low). Auto starts at High on a laptop and Balanced on a phone and steps down when frames run long (resolution first, then glass samples, depth of field and bloom). Phones and lower tiers stream a 720p city loop (1.2 MB instead of 5.3 MB). Nothing renders in a background tab. In the software renderer used for testing, Low takes about half the frame time of High.
   - Accessibility: Review → Accessibility has Reduce motion, Increase contrast (solid backing behind text; also follows the system's contrast and reduced-transparency settings) and Larger text. Secondary text meets WCAG AA in every theme; section and model changes are announced to screen readers; Tab first offers a skip to the main window; Esc closes sheets and returns focus; section blocks have headings. `tools/a11y.mjs` runs axe-core across all sections (0 violations).

## Run

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/, works from any folder
```

Every push to this branch or `main` publishes the build to the `gh-pages` branch (`.github/workflows/pages.yml`), served at https://eugene93126.github.io/Test-2-/ once Pages is set to deploy from `gh-pages`. Open it on a phone and tap **Use motion sensor** to steer with head tilt; the embedded Claude preview can't read motion sensors.

Review links can set the starting state: `?theme=dusk`, `?focus=1`, `?type=b`, `?glyph=arc` (or `keystone`), `?section=home`, `?modal=models`, `?fx=standard`, `?quality=low` (or `high`), `?contrast=more`, `?text=large`, `?perf`. The backtick key toggles the perf meter.

For screenshots on slow software renderers, `window.__rippleAge`, `window.__transitionT` and `window.__massPin` freeze a ripple, a model transition or a gravity well at a chosen moment.

## How it's put together

- `src/scene/CityBackdrop.tsx`: the city is a looping video plus a depth map. The shader shifts near rooftops against the skyline as your head moves and applies the theme's lens tint.
- `src/glass/`: each panel is a DOM element (layout and text) plus a 3D glass slab. `GlassPanel` registers the element; `GlassLayer` renders the world once into a shared buffer (blurred when a panel has focus), places a slab behind every panel at its depth, and moves the DOM to follow the slab's projection. `material.ts` patches drei's `MeshTransmissionMaterial` with the ripple, hover lens, rim light, sheen and per-theme tint.
- `src/scene/WindowFrame.tsx`: real geometry for the window, so it slides against the city.
- `src/scene/Lens.tsx` and `effects/LensEffect.ts`: depth of field when a panel has focus, bloom, then one pass for edge curvature, chromatic fringing, a lens-shaped vignette and grain.
- `src/scene/gravity.ts` and `effects/TransitionEffect.ts`: each moving panel's speed becomes a mass; the lens pass bends the frame around its rounded box (deflection 2·r_s/b) and neighbors are pulled by 1/d with a tidal stretch.
- `src/gaze/quantum.ts`: picks the control under your gaze each frame and toggles its `observed` state; the aura and collapse are CSS (`global.css`, "Quantum states").
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
