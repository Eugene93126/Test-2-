import { Effect, EffectAttribute, BlendFunction } from 'postprocessing'
import { Uniform, Vector2, Vector3 } from 'three'

// Full-screen model-switch transitions, applied to the world and the glass
// before the lens. 0 none · 1 warp (Fable Duo) · 2 shatter (Pantheon 2.0) ·
// 3 merge (Odyssey 3.2) · 4 dip (Pantheon 1.0).
const fragment = /* glsl */ `
uniform int uKind;
uniform float uT;
uniform vec2 uOrigin;
uniform vec2 uAspect;
uniform vec3 uTint;

float h1(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 h2(vec2 p){ return vec2(h1(p), h1(p + 17.31)); }
mat2 rot(float a){ float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }
vec2 toUv(vec2 p){ return p / uAspect + uOrigin; }

vec3 warp(vec2 uv){
  float env = sin(3.14159 * uT); env = env * env * (3.0 - 2.0 * env);
  vec2 p = (uv - uOrigin) * uAspect;
  float r = length(p);
  p = rot(env * 1.9 * exp(-r * 1.4)) * p;
  float wave = sin(r * 16.0 - uT * 15.0) * 0.026 * env * smoothstep(0.0, 0.25, r);
  p *= 1.0 + wave - 0.3 * env * exp(-r * 2.2);
  vec2 w = toUv(p);
  vec2 d = (w - uOrigin) * 0.024 * env;
  vec3 col = vec3(texture2D(inputBuffer, w + d).r, texture2D(inputBuffer, w).g, texture2D(inputBuffer, w - d).b);
  return col + uTint * env * 0.1 * exp(-r * 3.2);
}

vec3 shatter(vec2 uv){
  float t = uT;
  vec2 p = (uv - uOrigin) * uAspect;
  // Shards: Voronoi cells, smaller near the point of impact.
  float density = 5.0 + 6.0 * exp(-length(p) * 2.0);
  vec2 g = p * density;
  vec2 ip = floor(g), fp = fract(g);
  float md = 8.0, md2 = 8.0; vec2 mc = vec2(0.0), mo = vec2(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = vec2(float(i), float(j));
    vec2 o = h2(ip + c);
    vec2 dp = c + o - fp;
    float dd = dot(dp, dp);
    if (dd < md) { md2 = md; md = dd; mc = ip + c; mo = o; } else if (dd < md2) { md2 = dd; }
  }
  float edge = (sqrt(md2) - sqrt(md)) / density;
  vec2 cc = (mc + mo) / density;
  float dist = length(cc);
  float rnd = h1(mc);
  float crack = smoothstep(0.0, 0.12, t * 1.6 - dist * 0.5);
  float sep = smoothstep(0.16, 0.42, t) * (1.0 - smoothstep(0.58, 0.92, t));
  vec2 dir = normalize(cc + 1e-4);
  vec2 off = dir * sep * (0.035 + 0.07 * rnd) + (h2(mc + 3.1) - 0.5) * sep * 0.035;
  vec2 q = rot((rnd - 0.5) * sep * 0.35) * (p - cc);
  vec3 col = texture2D(inputBuffer, toUv(cc + q - off)).rgb;
  col *= 1.0 + (rnd - 0.5) * 0.4 * sep;
  // Molten light in the gaps, bright cracks before they open.
  float gapCore = (1.0 - smoothstep(0.0, 0.0015 + 0.0055 * sep, edge)) * sep;
  float gapGlow = exp(-edge / (0.002 + 0.016 * sep)) * sep;
  float line = (1.0 - smoothstep(0.0, 0.0035, edge)) * crack * (1.0 - sep);
  col += uTint * gapGlow * 0.55;
  col = mix(col, uTint * 2.6, gapCore);
  col += vec3(1.0, 0.94, 0.82) * line * 1.1;
  col += vec3(1.0, 0.92, 0.75) * exp(-t * 16.0) * exp(-length(p) * 3.0) * 0.8;
  return col;
}

vec3 merge(vec2 uv){
  float env = sin(3.14159 * uT); env = env * env * (3.0 - 2.0 * env);
  float spread = env * 0.07;
  vec2 c = uv - uOrigin;
  vec2 bend = vec2(spread, spread * 0.25 * sign(c.y));
  vec3 a = texture2D(inputBuffer, uv + bend).rgb * vec3(0.82, 1.06, 0.96);
  vec3 b = texture2D(inputBuffer, uv - bend).rgb * vec3(1.08, 0.94, 0.88);
  vec3 m = texture2D(inputBuffer, uv).rgb;
  vec3 col = mix(m, (a + b) * 0.5, env * 0.9);
  return col + uTint * env * 0.07;
}

vec3 dip(vec2 uv){
  float env = sin(3.14159 * uT);
  vec2 c = uv - 0.5;
  c.y *= 1.0 + env * 0.06;
  vec3 col = texture2D(inputBuffer, c + 0.5).rgb;
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  return mix(col, vec3(l), env * 0.8) * (1.0 - env * 0.55);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (uKind == 0) { outputColor = inputColor; return; }
  vec3 col = uKind == 1 ? warp(uv) : uKind == 2 ? shatter(uv) : uKind == 3 ? merge(uv) : dip(uv);
  outputColor = vec4(max(col, 0.0), inputColor.a);
}
`

export type TransitionKind = 'warp' | 'shatter' | 'merge' | 'dip'
export const KIND_INDEX: Record<TransitionKind, number> = { warp: 1, shatter: 2, merge: 3, dip: 4 }

export class TransitionEffect extends Effect {
  constructor() {
    super('TransitionEffect', fragment, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ['uKind', new Uniform(0)],
        ['uT', new Uniform(0)],
        ['uOrigin', new Uniform(new Vector2(0.5, 0.5))],
        ['uAspect', new Uniform(new Vector2(1, 1))],
        ['uTint', new Uniform(new Vector3(1, 0.7, 0.4))],
      ]),
    })
  }
}
