# Pantheon 2.0 — teaser

A 20-second wordless teaser for the (fictional, in-world) Claude Pantheon 2.0, posted July 7, 2034. Lore: `2034_AI_Landscape_Canon.md`. Concept, shot list, transitions and assets: [`PLAN.md`](PLAN.md). Timing for picture and sound: [`src/timeline.json`](src/timeline.json).

Status: **all seven steps done**: the 1080p film and the square cut. Deliverables are in [`deliverables/`](deliverables/):

| File | What |
|---|---|
| `teaser_1080p.mp4` | 1920×1080, 60 fps, H.264 High CRF 16, AAC 320 kb/s stereo, 20.0 s |
| `teaser_square.mp4` | 1080×1080, same specs and the same mix, recomposed shot by shot (see below) |
| `rough_cut_720p.mp4` | the rough cut (720p, every third frame, 20 fps); predates the Northern Renaissance pass and the final mix |
| `contact_sheet.png`, `contact_sheet_square.png` | one frame every 0.5 s |
| `audio_stems/` | `music.wav`, `sfx.wav`, `mix.wav` (48 kHz, 24-bit) |
| `QA.md`, `qa.json`, `sync_checks.png` | ffprobe, loudness and sync spot-checks (1080p) |
| `QA_square.md`, `qa_square.json`, `sync_checks_square.png` | the same for the square cut |

Review stills from earlier steps are in `out/review/` (style frames, the twelve CrossBody cards).

## Re-render

```sh
cd teaser
npm install
pip install numpy scipy soundfile pyloudnorm matplotlib pillow

# 1. Picture: 1200 PNGs in out/frames/final (resumable: rerun to continue after a stop)
node scripts/render.mjs --out out/frames/final --format png

# 2. Sound: score and effects from the timeline → out/audio/{music,sfx,mix}.wav
python3 audio/synth.py

# 3. Mux + QA → deliverables/ (MP4, stems, contact sheet, QA.md, sync_checks.png)
python3 scripts/package.py final

# Square cut: the same scene laid out again for 1080×1080 → deliverables/teaser_square.mp4 + QA_square.md
node scripts/render.mjs --comp TeaserSquare --out out/frames/square --format png
python3 scripts/package.py square

# Rough cut: 720p, every third frame, same mix
node scripts/render.mjs --out out/frames/rough --format jpeg --scale 0.6667 --every 3
python3 scripts/package.py rough

# Style frames: one still per shot (times from the timeline) → out/stills/
npm run stills
node scripts/stills.mjs Teaser 2.5 9.85      # any times, in seconds
node scripts/stills.mjs CardPreview 0 6      # CrossBody cards, flat
npm run studio                               # scrub the timeline in a browser
```

Rendering uses Chromium's headless shell with WebGL on SwiftShader, because the build machine has no GPU: about 5–6 s a frame at 1080p, so the full film takes roughly two hours. Paths are in `scripts/env.mjs`; override with `REMOTION_CHROME` and `REMOTION_GL` (for example `REMOTION_GL=angle` on a machine with a GPU, which is far faster). More tabs (`--concurrency`) do not help on CPU rendering.

`NOPOST=1 node scripts/stills.mjs …` renders without the post chain (depth of field, bloom, tone mapping, grade), which is useful for checking raw lighting.

## The square cut

`TeaserSquare` renders the same world, laid out again shot by shot rather than cropped (`camera(t, sq)` in `src/world/choreo.ts`, `groupFrame` and the square branch in `src/art/reveal.ts`):

- **C0 / S1:** opens wider so the whole prompt card is in frame, then pushes in further, onto the page itself.
- **S2 / S3 / S4:** the spheres sit a little wider; then the camera pulls back so all three cyanotype bodies (which span the 420 mm sheet) stay in frame, with the table and ruler above and below. The glass disc crosses at the same width.
- **S4b, the seal:** wider and shifted toward the lower left, so the gloved fingertips holding the page are in the frame beside the stamp.
- **S5 / S6:** slightly wider on the card stack; S6 pulls back and in as before.
- **S7, the title page:** the cartouche group is scaled to the width with the date set larger inside the plate; the chinoiserie moves above and below it (the plum branch hangs from the top right under clouds; the bird sits on a prunus limb along the foot; hills, pagoda and waves to the right).
- The signed-capture strip keeps the same type size as the 1080p film.

## Northern Renaissance

Five touches, mixed into the film's cool, modern look:

- **Painted moments.** The archive (C0, S1), the seal (S4b) and S6's candlelit still life take a van Eyck panel grade in `src/post/Grade.ts` (`uPaint`, weights from the timeline's `paint*` events): lead-white highlights under a faint varnish, olive-umber shadows, an umber panel edge, a fine craquelure that shows only in the light, crisper detail and deep focus. The machine scenes stay cool.
- **Lapis cyanotype.** The photogram's blue is ultramarine, the ground-lapis pigment of the Flemish panels, with visible granules.
- **Dürer's burin.** The cyanotype robots are drawn as engravings (`engrave` in the sketch renderer): regular swelling lines laid with the form, contour rings, diamond cross-hatching with dots in the deepest cells, level engraved ground shadows.
- **Arnolfini mirror.** The steel balls reflect a leaded window, the overhead capture rig and a small figure by the window.
- **Holbein's anamorphosis.** In S6 a stretched smear of sparks lies across the table, resolves into the lens glyph with the clay point as its dot (18.2 s), holds, and is pulled into the light. The clay point flickers like a candle. The sound follows: a glassy shimmer as the smear draws in, a quiet D-A-F bell chord as it resolves.

- **The reveal (S7)** is an engraved title page, something new from three sources (`src/art/reveal.ts`): Flemish strapwork (a hatched strap cartouche with volutes and acanthus, a medallion) and chinoiserie (a key-fret border, plum branches, a pagoda over hills, clouds, a bird on a twig, wave crests) engraved in porcelain cobalt and steel; Italian type (Bodoni Moda italic for the date, Cinzel Roman capitals for ANNO · MMXXXIV); and a cyberpunk sigil where the coat of arms would sit, the lens glyph in HUD rings with the clay node at its heart, its circuit traces running into the straps. Only the 8 is touched by the machine: a band of it slips sideways like a bad scan line, and the full stop is the clay node. The sigil boots with a two-frame RGB split.

Clay stays the only saturated warm colour; the period's warmth goes into the paper and the depth of the shadows.

## Sound

Everything is synthesised by `audio/synth.py` with numpy and scipy: no samples, no recordings, no third-party music. 100 BPM, D minor; the motif is D–A–F (the three sphere tinks, the card blips climbing D minor, resolved by the final D).

- Music: a D1/D2 drone (0–3 s), a cold detuned-saw pad on D-A-E-F with a muted pulse on every beat (3–12 s), the pulse locked to the twelve card flashes with a glassy D-A-F arpeggio (12–16 s), a noise and sine riser that ends exactly on the cut (16–18.6 s), digital silence (18.6–18.8 s), one piano-like D3 built from inharmonic partials in a synthetic room (18.8 s).
- Effects follow the cue sheet in the timeline: glass key ticks, the card's suction release, paper, the pen following the ellipse's speed, sphere rolls and tinks, the filings' magnetic shimmer and crackle, the light sweep, servos, footfalls and rotors, the glass disc's friction and ring, the stamp's thud (120→40 Hz drop), the glove, a slap and blip per card, the convergence suck-in and the relay clunk on the flare frame.
- Mix: effects sit 2.5 dB above the music; −14 LUFS integrated, true peak below −1 dBTP (4× oversampled look-ahead limiter). Nothing rings past 18.6 s except the final note. The stems are written at the mix gain, before the limiter.

## How it is built

- `src/timeline.json` drives everything: shot boundaries, events, the 12 card flashes (33 30 27 24 22 20 18 16 14 13 12 11 frames), the SFX cue sheet and music sections.
- `src/world/choreo.ts`: every object's pose as a pure function of time (so any frame renders identically, in any order).
- `src/world/World.tsx`: one continuous tabletop scene. Daylight from a window key light with soft VSM shadows, a procedural studio environment (drei Lightformers) for reflections, and a dusk ramp for S6.
- `src/art/*`: everything printed or inked onto paper, drawn with Canvas 2D: typewritten report, hand-inked ellipse, Gatepoint seal, iron filings traced along the field of three magnetic spheres, the cyanotype photogram, CrossBody cards, the prompt card's screen.
- `src/art/sketch/*`: a small 3D-to-ink renderer for the robot drawings. Robots are built from solids (boxes, cylinders, ellipsoids, capsules), projected in perspective (cards) or oblique elevation (the cyanotype), and drawn the way an industrial designer sketches: wobbling, tapering pen strokes, heavier lines on the shadow side, hatching that follows each form, blue ballpoint construction (bounding box, axes, hidden rims), scribbled ground shadows, callouts and hand lettering. `node scripts/stills.mjs CardPreview 0 1 2` renders cards flat for review.
- Post: N8AO ambient occlusion (contact darkening), SMAA, depth of field, bloom, neutral tone mapping, then the grade.
- `src/post/Grade.ts`: cool grade with lifted blacks, vignette, grain, chromatic aberration only during transitions, and the one-frame flare before the blackout.

## Licences

Fonts are OFL (Newsreader, Courier Prime, JetBrains Mono, Instrument Sans, Bodoni Moda, Cinzel; from github.com/google/fonts; licence files in `public/fonts/`). Every texture, model, drawing and sound is generated by this project's code. No real logos or names; the archive header uses the in-world Keystone Frontier Group.

Remotion is free for individuals and companies of up to three people; larger companies need a Remotion company licence.
