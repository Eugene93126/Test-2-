import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'
import { Uniform, Vector3 } from 'three'

// The film's look in one pass: cool grade with blacks lifted to the palette's ink, a lens-shaped
// vignette, chromatic aberration only when asked (transitions), grain, and the
// one-frame flare before the blackout.
//
// uPaint blends in a Northern Renaissance panel for the human and document
// beats: lead-white highlights under a faint varnish, shadows sinking to
// olive-umber, jewel saturation, crisper detail, a darker panel edge, and a
// very fine craquelure that shows only in the light.

const frag = /* glsl */ `
uniform float uSeed;
uniform float uGrain;
uniform float uVignette;
uniform float uCA;
uniform float uExposure;
uniform float uSat;
uniform float uContrast;
uniform float uFlare;
uniform vec3 uLift;
uniform vec3 uTint;
uniform float uPaint;
uniform float uAspect;

float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
vec2 hash2v(vec2 p) { return vec2(hash(p), hash(p + 17.31)); }

// Distance to the nearest cell edge of a jittered grid: a crack network.
float cracks(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = g + 0.15 + 0.7 * hash2v(i + g) - f;
    float d = dot(o, o);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  return sqrt(d2) - sqrt(d1);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 d = uv - 0.5;
  vec3 c = inputColor.rgb;
  if (uCA > 0.0001) {
    vec2 o = d * uCA * length(d) * 2.0;
    c.r = texture2D(inputBuffer, uv + o).r;
    c.b = texture2D(inputBuffer, uv - o).b;
  }
  if (uPaint > 0.001) {
    // Crisper detail: a gentle unsharp mask (van Eyck saw every thread).
    vec3 b = (texture2D(inputBuffer, uv + vec2(texelSize.x, 0.0)).rgb + texture2D(inputBuffer, uv - vec2(texelSize.x, 0.0)).rgb
            + texture2D(inputBuffer, uv + vec2(0.0, texelSize.y)).rgb + texture2D(inputBuffer, uv - vec2(0.0, texelSize.y)).rgb) * 0.25;
    c = max(c + (c - b) * 0.4 * uPaint, vec3(0.0));
  }
  c *= uExposure;
  // Grade in display space, where lift, contrast and grain behave like film.
  c = pow(max(c, vec3(0.0)), vec3(1.0 / 2.2));
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSat);
  c = (c - 0.45) * uContrast + 0.45;
  c *= uTint;
  c = uLift + c * (1.0 - uLift);
  float v = smoothstep(0.95, 0.25, length(d * vec2(1.0, 0.82)));
  c *= mix(1.0 - uVignette, 1.0, v);
  float n = hash(uv * vec2(1931.0, 1087.0) + uSeed) - 0.5;
  n += (hash(uv * vec2(977.0, 541.0) + uSeed * 1.7) - 0.5) * 0.5;
  c += n * uGrain * (0.6 + 0.4 * (1.0 - clamp(l, 0.0, 1.0)));
  if (uPaint > 0.001) {
    vec3 pc = c;
    float pl = dot(pc, vec3(0.2126, 0.7152, 0.0722));
    // Jewel saturation, deeper darks.
    pc = mix(vec3(pl), pc, 1.07);
    pc = (pc - 0.42) * 1.14 + 0.42;
    // Shadows to olive-umber, highlights to lead white under varnish.
    float sh = 1.0 - smoothstep(0.1, 0.85, pl);
    float hi = smoothstep(0.45, 1.0, pl);
    pc *= mix(vec3(1.0), vec3(0.9, 0.93, 0.72), sh);
    pc *= mix(vec3(1.0), vec3(1.0, 0.978, 0.918), hi);
    pc = max(pc, vec3(0.05, 0.047, 0.034));
    // A darker panel edge, umber rather than black.
    float pv = smoothstep(0.82, 0.26, length(d * vec2(1.0, 0.86)));
    pc *= mix(vec3(0.64, 0.6, 0.5), vec3(1.0), pv);
    // Craquelure, fine, only where the varnish catches light.
    vec2 q = vec2(uv.x * uAspect, uv.y) * 58.0;
    float k = smoothstep(0.035, 0.0, cracks(q)) * 0.75 + smoothstep(0.03, 0.0, cracks(q * 2.3 + 4.1)) * 0.25;
    pc *= 1.0 - k * 0.055 * hi;
    c = mix(c, pc, uPaint);
  }
  c = mix(c, vec3(1.0, 0.8, 0.68), uFlare);
  c = pow(max(c, vec3(0.0)), vec3(2.2));
  outputColor = vec4(c, inputColor.a);
}
`

export class GradeEffect extends Effect {
  constructor() {
    super('GradeEffect', frag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ['uSeed', new Uniform(0)],
        ['uGrain', new Uniform(0.03)],
        ['uVignette', new Uniform(0.22)],
        ['uCA', new Uniform(0)],
        ['uExposure', new Uniform(1)],
        ['uSat', new Uniform(0.86)],
        ['uContrast', new Uniform(1.06)],
        ['uFlare', new Uniform(0)],
        ['uLift', new Uniform(new Vector3(0.043, 0.055, 0.071))],
        ['uTint', new Uniform(new Vector3(0.97, 1.0, 1.03))],
        ['uPaint', new Uniform(0)],
        ['uAspect', new Uniform(16 / 9)],
      ]),
    })
  }
  set(name: string, v: number) { this.uniforms.get(name)!.value = v }
  tint(r: number, g: number, b: number) { (this.uniforms.get('uTint')!.value as Vector3).set(r, g, b) }
}
