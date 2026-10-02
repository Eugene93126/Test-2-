"""Mux and QA: picture + mix → MP4, contact sheet, stems, sync and loudness report.

    python3 scripts/package.py final     # out/frames/final (1080p60 PNG) → deliverables/teaser_1080p.mp4 + QA
    python3 scripts/package.py rough     # out/frames/rough (720p, every 3rd frame) → deliverables/rough_cut_720p.mp4
"""
import json
import os
import shutil
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = json.load(open(os.path.join(ROOT, 'src', 'timeline.json')))
FPS = TL['meta']['fps']
DUR = TL['meta']['duration']
OUT = os.path.join(ROOT, 'deliverables')
AUDIO = os.path.join(ROOT, 'out', 'audio')
FONT = os.path.join(ROOT, 'public', 'fonts', 'JetBrainsMono.ttf')
os.makedirs(OUT, exist_ok=True)


def run(cmd):
    print('$', ' '.join(cmd))
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def probe(path):
    r = run(['ffprobe', '-v', 'error', '-show_entries',
             'format=duration,bit_rate,size:stream=index,codec_name,profile,width,height,pix_fmt,r_frame_rate,avg_frame_rate,nb_frames,duration,sample_rate,channels,bit_rate,color_space',
             '-of', 'json', path])
    return json.loads(r.stdout)


def loudness(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    txt = r.stderr[r.stderr.rfind('Summary:'):]
    def grab(label):
        for line in txt.splitlines():
            if line.strip().startswith(label):
                return float(line.split(':')[1].split()[0])
    return {'integrated_lufs': grab('I:'), 'true_peak_dbtp': grab('Peak:'), 'lra_lu': grab('LRA:')}


def encode(frames_dir, fps, out, audio):
    vf = 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p'
    run(['ffmpeg', '-y', '-hide_banner', '-framerate', str(fps), '-i', os.path.join(frames_dir, 'f%04d.' + ext(frames_dir)),
         '-i', audio, '-map', '0:v', '-map', '1:a',
         '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '16', '-vf', vf,
         '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-r', str(fps),
         '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-ac', '2',
         '-t', f'{DUR:.3f}', '-movflags', '+faststart', out])


def ext(d):
    return 'png' if any(f.endswith('.png') for f in os.listdir(d)) else 'jpg'


def renumber(src, every):
    """The rough cut renders every nth frame (f0000, f0003, …); give ffmpeg a contiguous run."""
    tmp = os.path.join(ROOT, 'out', 'frames', '_seq')
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp)
    files = sorted(f for f in os.listdir(src) if f.startswith('f'))
    for i, f in enumerate(files):
        os.link(os.path.join(src, f), os.path.join(tmp, f'f{i:04d}.' + f.rsplit('.', 1)[1]))
    return tmp


def contact_sheet(frames_dir, path):
    """One frame every 0.5 s, 8 × 5, timecodes under each."""
    font = ImageFont.truetype(FONT, 15)
    tw, th, gap, lab = 360, 203, 10, 24
    times = [i * 0.5 for i in range(int(DUR / 0.5))]
    cols, rows = 8, (len(times) + 7) // 8
    sheet = Image.new('RGB', (cols * tw + (cols + 1) * gap, rows * (th + lab) + (rows + 1) * gap), (11, 14, 18))
    g = ImageDraw.Draw(sheet)
    e = ext(frames_dir)
    for k, t in enumerate(times):
        f = round(t * FPS)
        im = Image.open(os.path.join(frames_dir, f'f{f:04d}.{e}')).convert('RGB').resize((tw, th), Image.LANCZOS)
        r, c = divmod(k, cols)
        x, y = gap + c * (tw + gap), gap + r * (th + lab + gap)
        sheet.paste(im, (x, y))
        g.text((x, y + th + 4), f'{t:4.1f} s   F{f:04d}', fill=(150, 162, 170), font=font)
    sheet.save(path)


def decode_audio(mp4):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', mp4, '-f', 'f32le', '-ac', '1', '-ar', '48000', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32)


def onset_near(x, t, win=0.06, hop=48):
    """Strongest rise in short-term level within ±win of t (seconds)."""
    sr = 48000
    a, b = int((t - win - 0.02) * sr), int((t + win) * sr)
    seg = x[max(0, a):b]
    e = np.array([np.sqrt((seg[i:i + hop] ** 2).mean() + 1e-12) for i in range(0, len(seg) - hop, hop)])
    d = np.diff(20 * np.log10(e + 1e-7))
    i = int(np.argmax(d))
    return max(0, a) / sr + (i + 1) * hop / sr, float(d[i]), float(20 * np.log10(e.max() + 1e-9))


def sync_checks(mp4, frames_dir, path):
    """Picture at each sync point beside the audio around it."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import soundfile as sf
    from scipy.signal import correlate
    audio = decode_audio(mp4)
    mix, _ = sf.read(os.path.join(AUDIO, 'mix.wav'))
    mix = mix.mean(axis=1).astype(np.float32)
    checks = [(3.0, 'S2: spheres roll in, first pulse'), (10.8, 'stamp impact cut + thud'), (12.0, 'first card lands'), (18.6, 'relay clunk, cut to black')]
    rows = []
    fig, axes = plt.subplots(len(checks), 2, figsize=(14, 3.2 * len(checks)), gridspec_kw={'width_ratios': [1, 1.4]})
    e = ext(frames_dir)
    for (t, what), (ax_im, ax_au) in zip(checks, axes):
        if t == 18.6:
            # The clunk lands with the one-frame flare just before black.
            target = TL['events']['flare'][0]
        else:
            target = t
        # Onset measured on the mix itself (lossless); the MP4 is checked for
        # alignment to the mix by cross-correlation round the same moment.
        on, rise, peak = onset_near(mix, target)
        a0, a1 = int((t - 0.3) * 48000), int((t + 0.3) * 48000)
        xc = correlate(audio[a0:a1], mix[a0:a1], mode='full', method='fft')
        lag_ms = (int(np.argmax(xc)) - (a1 - a0 - 1)) / 48.0
        f = round(t * FPS)
        before = Image.open(os.path.join(frames_dir, f'f{f - 1:04d}.{e}')).convert('RGB')
        at = Image.open(os.path.join(frames_dir, f'f{f:04d}.{e}')).convert('RGB')
        w, h = before.size
        pair = Image.new('RGB', (w * 2 + 8, h), (11, 14, 18))
        pair.paste(before, (0, 0)); pair.paste(at, (w + 8, 0))
        ax_im.imshow(pair); ax_im.set_axis_off(); ax_im.set_title(f'{t:.3f} s · frames {f - 1} | {f}', fontsize=9)
        sr = 48000
        a, b = int((t - 0.25) * sr), int((t + 0.25) * sr)
        tt = np.arange(a, b) / sr
        ax_au.plot(tt, audio[a:b], lw=0.4, color='#1B2733')
        ax_au.axvline(t, color='#D97757', lw=1, label='picture event')
        ax_au.axvline(on, color='#2A4596', lw=1, ls='--', label=f'audio onset {on:.3f} s')
        ax_au.set_xlim(t - 0.25, t + 0.25); ax_au.legend(fontsize=8, loc='upper left'); ax_au.set_title(what, fontsize=9)
        rows.append({'t': t, 'what': what, 'audio_onset': round(on, 4), 'offset_ms': round((on - target) * 1000, 1), 'rise_db': round(rise, 1), 'mp4_lag_ms': round(lag_ms, 2)})
    plt.tight_layout()
    plt.savefig(path, dpi=80)
    return rows


def main(kind):
    if kind == 'rough':
        src = os.path.join(ROOT, 'out', 'frames', 'rough')
        seq = renumber(src, 3)
        out = os.path.join(OUT, 'rough_cut_720p.mp4')
        encode(seq, FPS / 3, out, os.path.join(AUDIO, 'mix.wav'))
        p = probe(out)
        print(json.dumps(p, indent=1))
        return
    frames = os.path.join(ROOT, 'out', 'frames', 'final')
    n = len([f for f in os.listdir(frames) if f.endswith('.png')])
    assert n == round(DUR * FPS), f'{n} frames on disk, expected {round(DUR * FPS)}'
    out = os.path.join(OUT, 'teaser_1080p.mp4')
    encode(frames, FPS, out, os.path.join(AUDIO, 'mix.wav'))
    stems = os.path.join(OUT, 'audio_stems')
    os.makedirs(stems, exist_ok=True)
    for f in ('music.wav', 'sfx.wav', 'mix.wav'):
        shutil.copy(os.path.join(AUDIO, f), os.path.join(stems, f))
    contact_sheet(frames, os.path.join(OUT, 'contact_sheet.png'))
    p = probe(out)
    loud_mp4 = loudness(out)
    loud_wav = loudness(os.path.join(AUDIO, 'mix.wav'))
    sync = sync_checks(out, frames, os.path.join(OUT, 'sync_checks.png'))
    v = next(s for s in p['streams'] if s.get('width'))
    a = next(s for s in p['streams'] if s.get('sample_rate'))
    report = {'probe': p, 'loudness_mp4': loud_mp4, 'loudness_mix_wav': loud_wav, 'sync': sync}
    json.dump(report, open(os.path.join(OUT, 'qa.json'), 'w'), indent=1)
    lines = [
        '# QA report: teaser_1080p.mp4', '',
        '| Check | Spec | Measured |', '|---|---|---|',
        f"| Duration (container) | 20.000 s | {float(p['format']['duration']):.3f} s |",
        f"| Video duration / frames | 20.000 s / 1200 | {float(v['duration']):.3f} s / {v.get('nb_frames')} |",
        f"| Frame rate | 60 fps | {v['r_frame_rate']} (avg {v['avg_frame_rate']}) |",
        f"| Video | H.264 High, 1920×1080, CRF 16 | {v['codec_name']} {v.get('profile')}, {v['width']}×{v['height']}, {v['pix_fmt']} |",
        f"| Audio | AAC 320 kb/s stereo 48 kHz | {a['codec_name']} {int(a.get('bit_rate', 0)) // 1000} kb/s, {a['channels']} ch, {a['sample_rate']} Hz |",
        f"| Loudness (MP4) | −14 LUFS | {loud_mp4['integrated_lufs']} LUFS |",
        f"| True peak (MP4) | ≤ −1 dBTP | {loud_mp4['true_peak_dbtp']} dBTP |",
        f"| Loudness / true peak (mix.wav) | −14 LUFS, ≤ −1 dBTP | {loud_wav['integrated_lufs']} LUFS, {loud_wav['true_peak_dbtp']} dBTP |",
        f"| File size | | {int(p['format']['size']) / 1e6:.1f} MB ({int(p['format']['bit_rate']) / 1e6:.1f} Mb/s) |",
        '', '## Sync spot-checks', '', '| Time | Event | Audio onset (mix) | Offset | Rise | MP4 audio vs mix |', '|---|---|---|---|---|---|',
    ] + [f"| {r['t']:.3f} s | {r['what']} | {r['audio_onset']:.3f} s | {r['offset_ms']:+.1f} ms | +{r['rise_db']} dB | {r['mp4_lag_ms']:+.2f} ms |" for r in sync] + [
        '', 'One frame at 60 fps is 16.7 ms. The 18.6 check measures the relay clunk against the one-frame flare (18.583 s) that precedes the cut to black.',
        '', 'See `sync_checks.png` (frame before | frame at each event, beside the waveform) and `contact_sheet.png` (one frame every 0.5 s).',
    ]
    open(os.path.join(OUT, 'QA.md'), 'w').write('\n'.join(lines) + '\n')
    print('\n'.join(lines))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'final')
