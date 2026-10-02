# Pantheon 2.0 — 20-second teaser: plan

In-world teaser posted July 7, 2034, for the July 8 launch (canon §4). Wordless. One reveal at the end.

## Concept: "The Table"

One overhead camera, one table, one afternoon that falls to dusk. Everything in the film is a real object on the table, and every object is moved by Pantheon's own hands: robot grippers that enter from the frame edge. The single exception is the seal: a person in archive gloves holds the page while it is stamped SIGNED. The model acts; a person signs.

The film opens on the instruction that made it (a glass prompt card: *"Make a 20-second film for July 8. Use only what's on this table."*) and closes on **July 8. / Edited by Pantheon 2.0**.

The circles motif: the ink ellipse around "desync" (S1) → the seal's ring on the same page (S4) → the clay point everything collapses into (S6).

Realistic 2034 details:
- **Signed capture.** In this world unsigned media is presumed fake (canon §12), so every frame carries a quiet signature strip along its edge, like the keycodes printed on film stock.
- **Motion-control camera.** Robot-precise, slow, with a sub-pixel "breath".
- **Physical over generated.** Paper fibre, steel, glass, iron filings, a cyanotype photogram, a 1nm-class wafer offcut.
- **No real names or logos.** The archive page is headed by the in-world Keystone Frontier Group (canon §3). The only mark is the original lens glyph from the glasses prototype, on the prompt card.

## Stack

- **Remotion 4** (React, frame-accurate) renders every frame; `@remotion/three` runs one continuous three.js tabletop scene whose every object is a pure function of the frame.
- **three.js:** MeshPhysicalMaterial for steel and the wafer; drei MeshTransmissionMaterial for the glass disc and prompt card; drei Lightformers build a studio/window environment procedurally (Poly Haven is unreachable from this machine, and a hand-placed softbox setup is more controllable than an HDRI anyway).
- **Canvas 2D** draws everything printed or inked onto paper: the typewritten report, the ink ellipse, iron filings along computed field lines, the cyanotype photogram, robot line art, the seal, the body cards. Each is a texture on a paper mesh, so glass refracts it and light falls on it.
- **Post:** custom grade (cool, slightly desaturated, lifted blacks), film grain, vignette, bloom only on highlights, chromatic aberration only during transitions, drifting dust in the sunbeam, camera breathing.
- **Rendering here:** Chromium headless shell with WebGL on SwiftShader (no GPU). Measured on the smoke test: about 1.4 s per simple frame; full 1080p60 renders will be timed at the animatic stage.
- **Audio:** Python (numpy/scipy) synthesis from the same `src/timeline.json`; no samples, so nothing to license.

## Assets

| Asset | Source | Licence |
|---|---|---|
| Newsreader (titles, prompt card) | github.com/google/fonts | OFL |
| Courier Prime (typewritten report) | github.com/google/fonts | OFL |
| JetBrains Mono (indices, captions, edge codes) | github.com/google/fonts | OFL |
| Instrument Sans (prompt-card UI, matching the glasses prototype) | github.com/google/fonts | OFL |
| Table, paper, ink, cyanotype, filings, wafer, seal textures | procedural (canvas) | original |
| Spheres, glass disc, grippers, gloved hand, logbook, wafer, pen, cards | procedural geometry | original |
| 15 robot line drawings (3 for S3, 12 for CrossBody-12) | drawn as SVG paths | original |
| Lighting environment | drei Lightformers | original |
| Music and SFX | numpy/scipy synthesis | original |

## Timing sheet

`src/timeline.json` is the single source. Highlights (seconds; frames = s × 60):

| Shot | Time | Still for review |
|---|---|---|
| C0 Prompt | 0.0–1.2 | 1.0 |
| S1 Archive | 1.2–3.0 (ellipse 1.8–2.6) | 2.66 |
| S2 Three spheres | 3.0–6.0 (tinks 3.62 / 3.80 / 3.98, field from 4.2) | 5.6 |
| S3 Bodies | 6.0–9.0 | 8.4 |
| S4 Glass + seal | 9.0–12.0 (glass 9.0–10.6, stamp 10.8) | 9.85 and 11.35 |
| S5 CrossBody-12 | 12.0–16.0, flashes of 33 30 27 24 22 20 18 16 14 13 12 11 frames (= 240) | 14.65 |
| S6 Convergence | 16.0–18.6 | 18.55 |
| Black | 18.6–18.8 | |
| S7 Reveal | 18.8–20.0 | 19.5 |

On the 100 BPM grid (beat 0.6 s): 3.0, 10.8, 12.0 and 18.6 fall on beats. 16.0 does not; the riser is timed to land on the 18.6 cut instead.

## Transitions: each one different, each one physical

| At | Kind | What happens |
|---|---|---|
| 1.2 | lift | A gripper lifts the glass prompt card straight up toward the lens; the incident report lies beneath. |
| 3.0 | pull-away | A second gripper drags the report off to the left, uncovering the sheet as the spheres roll in. |
| 6.0 | exposure | The spheres roll apart and stretch the field; a band of sunlight sweeps the sheet, which develops cyanotype blue with the filing lines left white. Those lines become the motion paths. |
| 9.0 | glass wipe | A gripper pushes a thick, slightly convex optical disc across; the drawings swell and bend under it. |
| 10.8 | impact cut | Hard cut on the stamp, to the report now lying at the side of the table. |
| 12.0 | drop | The gloved hand slides off the page; the first body card drops onto the stamped report. |
| 16.0 | pull-in | Everything on the table slides into one point while daylight falls to dusk. |
| 18.6 | blackout | Deliberately clunky: one frame of flare, then black like a heavy switch. |

## Changes from the original brief (agreed in chat)

- Daylight table (cool paper and cyanotype blue), falling to dusk in S6, instead of a dark surface throughout. The cool palette and the single clay accent in the last 4 seconds still hold.
- Opens on the prompt card (0.0–1.2), so S1 runs 1.2–3.0; the ellipse keeps its 1.8–2.6 timing. The 0.2 s paper-slide cue becomes the card lifting off the report (0.95–1.55) and the page settling.
- The film opens on the table under a fade from ink (#0B0E12), not pure black. Pure black appears only at 18.6–18.8.
- S3's three columns are on one cyanotype sheet (a photogram of the S2 filings), not three separate scenes.
- S5's silhouettes are physical cards dropped onto the stamped report.
- Human presence: archive-gloved fingers steady the page during the stamp.

## Process

1. Plan and timeline (this file, `src/timeline.json`). ✔
2. Style frames: one still per shot (C0, S1–S7), for review.
3. Animatic at 720p with temp audio.
4. Final picture at 1080p60.
5. Audio from the timeline; mix to −14 LUFS, ≤ −1 dBTP; stems.
6. Mux and QA: ffprobe duration and codecs, ebur128 loudness, contact sheet, sync spot-checks at 3.0 / 10.8 / 12.0 / 18.6.
7. Square 1080×1080 recompose (laid out again per shot, not cropped).

Remotion licence note: free for individuals and companies of up to three people; larger companies need a company licence.
