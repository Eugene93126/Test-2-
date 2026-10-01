import * as THREE from 'three'
import type { ThemeId, Vec3 } from '../theme/themes'
import { MAX_RIPPLES } from './registry'

// Extends drei's MeshTransmissionMaterial (real refraction of a shared
// background buffer) with what the brief asks for on top:
//   - a soft lens under the pointer and ripples on press, both bending the
//     surface normal so the city behind actually warps
//   - a key light that slides along the polished bevel as the head moves
//   - a soft inner sheen, a body tint for legibility, and an entrance fade

export interface GlassLook {
  color: Vec3 // multiplies transmitted light
  attenuation: Vec3 // Beer's law tint inside the slab
  milk: Vec3 // body tint (linear), keeps text legible
  milkAmt: number
  rim: Vec3
  rimAmt: number
  sheen: number
  edgeDark: number // Kiln's dark outline
}

export const GLASS_LOOKS: Record<ThemeId, GlassLook> = {
  paper: { color: [1, 1, 1], attenuation: [0.94, 0.97, 1.0], milk: [0.95, 0.94, 0.91], milkAmt: 0.72, rim: [1, 1, 1], rimAmt: 0.9, sheen: 0.05, edgeDark: 0 },
  graphite: { color: [0.62, 0.62, 0.6], attenuation: [0.86, 0.88, 0.9], milk: [0.012, 0.012, 0.011], milkAmt: 0.52, rim: [1, 0.97, 0.92], rimAmt: 0.55, sheen: 0.025, edgeDark: 0 },
  glass: { color: [0.97, 0.99, 1.0], attenuation: [0.78, 0.92, 0.98], milk: [0.006, 0.01, 0.018], milkAmt: 0.3, rim: [0.92, 0.98, 1.0], rimAmt: 1.0, sheen: 0.035, edgeDark: 0 },
  dusk: { color: [1.0, 0.86, 0.72], attenuation: [1.0, 0.86, 0.72], milk: [0.022, 0.009, 0.006], milkAmt: 0.46, rim: [1.0, 0.86, 0.68], rimAmt: 0.8, sheen: 0.035, edgeDark: 0 },
  kiln: { color: [1, 1, 1], attenuation: [1.0, 0.9, 0.86], milk: [0.95, 0.91, 0.86], milkAmt: 0.86, rim: [1, 1, 1], rimAmt: 0.45, sheen: 0.03, edgeDark: 0.9 },
}

/** Uniforms shared by every slab (theme, head, resolution). */
export const sharedGlass = {
  uHead: { value: new THREE.Vector2() },
  uMilk: { value: new THREE.Vector3(...GLASS_LOOKS.glass.milk) },
  uMilkAmt: { value: GLASS_LOOKS.glass.milkAmt },
  uRim: { value: new THREE.Vector3(...GLASS_LOOKS.glass.rim) },
  uRimAmt: { value: GLASS_LOOKS.glass.rimAmt },
  uSheen: { value: GLASS_LOOKS.glass.sheen },
  uEdgeDark: { value: 0 },
  uResolution: { value: new THREE.Vector2(1, 1) },
  uNow: { value: 0 },
}

export function slabUniforms() {
  return {
    uPointer: { value: new THREE.Vector2(9, 9) },
    uHover: { value: 0 },
    uRipples: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uPresence: { value: 0 },
    uSlabSize: { value: new THREE.Vector2(1, 1) },
  }
}
export type SlabUniforms = ReturnType<typeof slabUniforms>

const VERT_PARS = /* glsl */ `
varying vec3 vSlabPos;
varying vec3 vSlabNormal;
`
const VERT_MAIN = /* glsl */ `
#include <begin_vertex>
vSlabPos = position;
vSlabNormal = normal;
`

const FRAG_PARS = /* glsl */ `
varying vec3 vSlabPos;
varying vec3 vSlabNormal;
uniform vec2 uPointer;
uniform float uHover;
uniform vec4 uRipples[${MAX_RIPPLES}];
uniform float uPresence;
uniform vec2 uSlabSize;
uniform vec2 uHead;
uniform vec3 uMilk;
uniform float uMilkAmt;
uniform vec3 uRim;
uniform float uRimAmt;
uniform float uSheen;
uniform float uEdgeDark;
uniform vec2 uResolution;
float gRippleGlow = 0.0;
float gCA = 0.0;
float gRippleTrough = 0.0;
`

// Runs right after three has built the surface normal (view space).
const FRAG_NORMAL = /* glsl */ `
#include <normal_fragment_maps>
{
  float faceMask = smoothstep(0.55, 0.95, vSlabNormal.z);
  vec2 p = vSlabPos.xy;
  vec2 dN = vec2(0.0);
  // A soft lens under the pointer: the glass seems to swell toward your finger.
  vec2 dp = p - uPointer;
  float lensR = 0.16;
  float lens = exp(-dot(dp, dp) / (lensR * lensR));
  dN += dp / lensR * lens * 0.32 * uHover;
  // Ripples: a decaying ring wave travelling out from each press.
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 rp = uRipples[i];
    if (rp.w <= 0.0) continue;
    vec2 d = p - rp.xy;
    float r = length(d);
    float age = rp.z;
    float k = (r - age * 0.85) / 0.065;
    float env = exp(-age * 2.0) * rp.w;
    float wave = sin(k * 2.6) * exp(-k * k * 0.5);
    dN += (d / max(r, 1e-4)) * wave * env * 0.5;
    gRippleGlow += max(wave, 0.0) * env;
    gRippleTrough += max(-wave, 0.0) * env;
  }
  dN *= faceMask;
  // Color fringing only where light actually bends: the bevel, and the face
  // while it ripples. On the flat face it would cost three reads for nothing.
  gCA = chromaticAberration * max(1.0 - smoothstep(0.9, 0.995, vSlabNormal.z), clamp(length(dN) * 3.0, 0.0, 1.0));
  vec3 dView = mat3(viewMatrix) * (mat3(modelMatrix) * vec3(dN, 0.0));
  normal = normalize(normal + dView);
}
`

const FRAG_FINAL = /* glsl */ `
#include <opaque_fragment>
{
  vec3 V = normalize(cameraPosition - vWorldPosition);
  vec3 Nw = inverseTransformDirection(normal, viewMatrix);
  float facing = clamp(dot(Nw, V), 0.0, 1.0);
  float edge = 1.0 - smoothstep(0.5, 0.97, vSlabNormal.z);
  vec3 col = gl_FragColor.rgb;
  vec2 suv = gl_FragCoord.xy / uResolution;

  // How bright is the real world right behind this point? (A small cross of
  // samples from the refraction buffer.)
  vec2 px = 6.0 / uResolution;
  vec3 back = texture2D(buffer, suv).rgb * 0.4
    + (texture2D(buffer, suv + vec2(px.x, 0.0)).rgb + texture2D(buffer, suv - vec2(px.x, 0.0)).rgb
     + texture2D(buffer, suv + vec2(0.0, px.y)).rgb + texture2D(buffer, suv - vec2(0.0, px.y)).rgb) * 0.15;
  float backLum = dot(back, vec3(0.2126, 0.7152, 0.0722));
  float bright = smoothstep(0.03, 0.4, backLum);

  // Body tint (the electrochromic dimming layer), lighter on the polished edge.
  col = mix(col, uMilk, uMilkAmt * (1.0 - edge * 0.7));

  // Adaptive rim: on a bright backdrop the border emits more and tightens so it
  // still separates from the world; on a dark one it stays soft and low.
  vec3 L = normalize(vec3(-0.55 + uHead.x * 0.9, 0.62 + uHead.y * 0.6, 0.55));
  float rimPow = mix(2.4, 4.2, bright);
  float rim = pow(1.0 - facing, rimPow) * edge;
  float key = pow(max(dot(Nw, L), 0.0), mix(7.0, 11.0, bright)) * edge;
  col += uRim * (rim * mix(0.38, 0.95, bright) + key * mix(1.15, 1.9, bright)) * uRimAmt;

  // Iridescent dispersion: at grazing angles the bevel splits light into a thin
  // rainbow, shifting with head position like a film on glass.
  float graze = pow(1.0 - facing, 3.0) * edge;
  float hue = fract((1.0 - facing) * 2.4 + vSlabPos.x * 0.7 - vSlabPos.y * 0.4 + uHead.x * 0.25 - uHead.y * 0.15);
  vec3 spectrum = 0.5 + 0.5 * cos(6.28318 * (hue + vec3(0.0, 0.33, 0.67)));
  col += spectrum * graze * 0.55 * (0.6 + 0.4 * uRimAmt);

  // Where your finger is: the nearby edge catches the light and the face glows softly.
  vec2 dp = vSlabPos.xy - uPointer;
  float d2 = dot(dp, dp);
  col += uRim * edge * exp(-d2 / 0.09) * uHover * 1.2;
  col += uRim * exp(-d2 / 0.012) * uHover * 0.07 * (1.0 - edge);
  // Soft inner sheen: a broad band across the face that drifts with the head.
  vec2 q = vSlabPos.xy / max(uSlabSize, vec2(0.001));
  float band = q.x * 0.9 + q.y * 0.7 - uHead.x * 0.22 + uHead.y * 0.12 + 0.28;
  col += vec3(1.0) * exp(-band * band * 7.0) * uSheen * (1.0 - edge);
  // Ripple crests catch the light; troughs dip a little.
  col += uRim * gRippleGlow * 0.28 * (1.0 - edge);
  col *= 1.0 - 0.12 * min(gRippleTrough, 1.0);
  // Kiln's outline, drawn as deep clay light rather than ink.
  col = mix(col, vec3(0.32, 0.085, 0.035), edge * uEdgeDark);
  // AR rule: a display can only add light, so nothing goes to pure black.
  col = max(col, vec3(0.012, 0.011, 0.010));
  // Entrance: fade in from exactly what is behind.
  vec3 behind = texture2D(buffer, suv).rgb;
  gl_FragColor.rgb = mix(behind, col, uPresence);
}
`

/** Patch a MeshTransmissionMaterial instance once, before its first compile. */
export function patchGlass(mat: THREE.Material & { userData: Record<string, unknown> }, uniforms: SlabUniforms) {
  if (mat.userData.glassPatched) return
  const base = mat.onBeforeCompile
  mat.onBeforeCompile = (shader, renderer) => {
    base.call(mat, shader, renderer)
    Object.assign(shader.uniforms, sharedGlass, uniforms)
    shader.vertexShader = VERT_PARS + shader.vertexShader.replace('#include <begin_vertex>', VERT_MAIN)
    shader.fragmentShader = FRAG_PARS + shader.fragmentShader
      .replace('#include <normal_fragment_maps>', FRAG_NORMAL)
      .replace('#include <opaque_fragment>', FRAG_FINAL)
      .replace('if (chromaticAberration == 0.0) {', 'if (gCA < 0.0005) {')
      .replace('float aberration = chromaticAberration * sampleProgress;', 'float aberration = gCA * sampleProgress;')
  }
  mat.customProgramCacheKey = () => 'glass-slab-v1'
  mat.userData.glassPatched = true
  mat.needsUpdate = true
}
