import { Effect, EffectAttribute, BlendFunction } from 'postprocessing'
import { Uniform, Vector2 } from 'three'

// One pass for the lens itself: slight barrel curvature at the edges, radial
// chromatic fringing that grows toward the rim, a lens-shaped vignette and
// fine animated grain. Three texture samples per pixel.
const fragment = /* glsl */ `
uniform float uCurve;
uniform float uFringe;
uniform float uVignette;
uniform float uGrain;
uniform float uSeed;
uniform vec2 uAspect;

float hashG(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 c = (uv - 0.5) * uAspect;
  float r2 = dot(c, c);
  // Barrel curvature, normalized so the corners stay inside the frame.
  float k = uCurve;
  float norm = 1.0 + k * dot(uAspect * 0.5, uAspect * 0.5);
  vec2 dc = c * (1.0 + k * r2) / norm;
  vec2 duv = dc / uAspect + 0.5;
  vec2 fr = dc / uAspect * uFringe * r2;
  float rr = texture2D(inputBuffer, duv + fr).r;
  vec4 gg = texture2D(inputBuffer, duv);
  float bb = texture2D(inputBuffer, duv - fr).b;
  vec3 col = vec3(rr, gg.g, bb);
  // Lens-shaped vignette: a soft rounded rectangle, a little stronger at the bottom.
  vec2 q = abs(uv - 0.5) * 2.0;
  q.y *= mix(1.0, 1.08, step(uv.y, 0.5));
  float edge = pow(pow(q.x, 4.0) + pow(q.y, 4.0), 0.25);
  float v = smoothstep(0.62, 1.32, edge);
  col *= 1.0 - uVignette * v;
  // Grain, heavier in the shadows as on a real sensor.
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  float g = hashG(gl_FragCoord.xy + uSeed * 913.17) - 0.5;
  col += g * uGrain * (1.0 - 0.65 * smoothstep(0.0, 0.6, lum));
  outputColor = vec4(max(col, 0.0), gg.a);
}
`

export interface LensOptions { curve?: number; fringe?: number; vignette?: number; grain?: number }

export class LensEffect extends Effect {
  constructor({ curve = 0.035, fringe = 0.006, vignette = 0.4, grain = 0.03 }: LensOptions = {}) {
    super('LensEffect', fragment, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ['uCurve', new Uniform(curve)],
        ['uFringe', new Uniform(fringe)],
        ['uVignette', new Uniform(vignette)],
        ['uGrain', new Uniform(grain)],
        ['uSeed', new Uniform(0)],
        ['uAspect', new Uniform(new Vector2(1, 1))],
      ]),
    })
  }

  set(name: 'uCurve' | 'uFringe' | 'uVignette' | 'uGrain' | 'uSeed', value: number) {
    this.uniforms.get(name)!.value = value
  }

  setAspect(w: number, h: number) {
    const a = w / h
    ;(this.uniforms.get('uAspect')!.value as Vector2).set(a >= 1 ? a : 1, a >= 1 ? 1 : 1 / a)
  }
}
