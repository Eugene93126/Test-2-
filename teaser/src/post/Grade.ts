import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'
import { Uniform, Vector3 } from 'three'

// The film's look in one pass: cool grade with blacks lifted to the palette's ink, a lens-shaped
// vignette, chromatic aberration only when asked (transitions), grain, and the
// one-frame flare before the blackout.

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

float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 d = uv - 0.5;
  vec3 c = inputColor.rgb;
  if (uCA > 0.0001) {
    vec2 o = d * uCA * length(d) * 2.0;
    c.r = texture2D(inputBuffer, uv + o).r;
    c.b = texture2D(inputBuffer, uv - o).b;
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
      ]),
    })
  }
  set(name: string, v: number) { this.uniforms.get(name)!.value = v }
  tint(r: number, g: number, b: number) { (this.uniforms.get('uTint')!.value as Vector3).set(r, g, b) }
}
