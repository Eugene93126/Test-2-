# QA report: teaser_1080p.mp4

| Check | Spec | Measured |
|---|---|---|
| Duration (container) | 20.000 s | 20.000 s |
| Video duration / frames | 20.000 s / 1200 | 20.000 s / 1200 |
| Frame rate | 60 fps | 60/1 (avg 60/1) |
| Video | H.264 High, 1920×1080, CRF 16 | h264 High, 1920×1080, yuv420p |
| Audio | AAC 320 kb/s stereo 48 kHz | aac 318 kb/s, 2 ch, 48000 Hz |
| Loudness (MP4) | −14 LUFS | -14.0 LUFS |
| True peak (MP4) | ≤ −1 dBTP | -1.2 dBTP |
| Loudness / true peak (mix.wav) | −14 LUFS, ≤ −1 dBTP | -14.0 LUFS, -1.5 dBTP |
| File size | | 73.1 MB (29.3 Mb/s) |

## Sync spot-checks

| Time | Event | Audio onset (mix) | Offset | Rise | MP4 audio vs mix |
|---|---|---|---|---|---|
| 3.000 s | S2: spheres roll in, first pulse | 3.000 s | +0.0 ms | +12.3 dB | +0.00 ms |
| 10.800 s | stamp impact cut + thud | 10.800 s | +0.0 ms | +20.0 dB | +0.00 ms |
| 12.000 s | first card lands | 12.000 s | +0.0 ms | +18.4 dB | +0.00 ms |
| 18.600 s | relay clunk, cut to black | 18.571 s | -12.0 ms | +12.6 dB | +0.00 ms |

One frame at 60 fps is 16.7 ms. The 18.6 check measures the relay clunk against the one-frame flare (18.583 s) that precedes the cut to black.

See `sync_checks.png` (frame before | frame at each event, beside the waveform) and `contact_sheet.png` (one frame every 0.5 s).
