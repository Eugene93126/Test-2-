// GLSL for the city loop. Linear HDR output; tone mapping happens in the composer.

export const COMMON = /* glsl */ `
uniform float uTime;
uniform float uLoop;
uniform vec3 uSunDir;
uniform float uDepthMode;
#define TAU 6.28318530718

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a*vnoise(p); p = p*2.03 + vec2(17.1, 9.2); a *= .5; } return s; }

// Inverse depth, square-rooted for precision in the distance. 0 = sky.
float depthEncode(float dist){ return sqrt(clamp(130.0 / dist, 0., 1.)); }

// Post-sunset sky. Warm toward the sun's azimuth, Earth's shadow and the
// pink Belt of Venus on the opposite side (over the lake).
vec3 skyBase(vec3 d){
  float el = d.y;
  vec2 hz = normalize(d.xz + 1e-5);
  vec2 sz = normalize(uSunDir.xz);
  float sunward = dot(hz, sz) * .5 + .5;
  float w = smoothstep(0.0, 0.95, sunward);
  vec3 zenith = vec3(0.020, 0.045, 0.14);
  vec3 upper = vec3(0.06, 0.11, 0.28);
  vec3 horizWarm = vec3(1.05, 0.52, 0.26);
  vec3 horizCool = vec3(0.24, 0.27, 0.42);
  vec3 venus = vec3(0.74, 0.46, 0.56);
  vec3 horizon = mix(horizCool, horizWarm, w);
  float h = max(el, 0.);
  vec3 col = mix(horizon, upper, smoothstep(0.0, 0.22, h));
  col = mix(col, zenith, smoothstep(0.25, 0.95, h));
  float anti = pow(1. - sunward, 1.6);
  float belt = smoothstep(0.03, 0.07, el) * (1. - smoothstep(0.09, 0.17, el)) * anti;
  col = mix(col, venus, belt * 0.5);
  col *= 1. - 0.28 * (1. - smoothstep(0.0, 0.045, el)) * anti; // Earth's shadow
  col += vec3(1.0, 0.42, 0.16) * pow(max(dot(d, uSunDir), 0.), 6.) * 0.5;
  // city light dome near the horizon
  col += vec3(0.30, 0.17, 0.10) * exp(-max(el, 0.) * 40.) * 0.18;
  if (el < 0.) col = mix(horizon * 0.72, vec3(0.02, 0.022, 0.03), smoothstep(0., -0.25, el));
  return col * 0.58;
}

// Thin altocumulus, lit pink and peach from below. Seamless-loop drift by crossfade.
vec3 skyColor(vec3 d){
  vec3 col = skyBase(d);
  if (d.y > 0.012) {
    vec2 q = d.xz / (d.y + 0.035) * 0.42;
    q = vec2(q.x * 0.9 + q.y * 0.45, q.y * 2.6 - q.x * 0.3);
    float ph = fract(uTime / uLoop);
    vec2 D = vec2(0.22, 0.05);
    float c = mix(fbm(q + D * ph), fbm(q + D * (ph - 1.)), ph);
    float dens = smoothstep(0.58, 0.84, c) * smoothstep(0.012, 0.05, d.y) * (1. - smoothstep(0.30, 0.6, d.y));
    vec2 hz = normalize(d.xz + 1e-5);
    float sunward = dot(hz, normalize(uSunDir.xz)) * .5 + .5;
    vec3 lit = mix(vec3(0.42, 0.30, 0.42), vec3(1.0, 0.55, 0.36), smoothstep(0.1, 1.0, sunward));
    vec3 cloud = mix(vec3(0.07, 0.07, 0.12), lit, 0.55 + 0.45 * smoothstep(0.55, 0.85, c));
    col = mix(col, cloud * 0.62, dens * 0.75);
  }
  return col;
}

vec3 hazeColor(vec3 v){ return skyBase(normalize(vec3(v.x, 0.03, v.z))) * 0.7; }
`

export const SKY_VERT = /* glsl */ `
varying vec3 vWorld;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`

export const SKY_FRAG = /* glsl */ `
${COMMON}
varying vec3 vWorld;
void main(){
  if (uDepthMode > 0.5) { gl_FragColor = vec4(0., 0., 0., 1.); return; }
  vec3 d = normalize(vWorld - cameraPosition);
  gl_FragColor = vec4(skyColor(d), 1.0);
}`

export const BLD_VERT = /* glsl */ `
attribute vec3 aSize;
attribute vec4 aParams; // seed, style, litFrac, taper
attribute vec4 aTint;   // rgb, shop
varying vec3 vLocal;
varying vec3 vSize;
varying vec3 vNObj;
varying vec4 vParams;
varying vec4 vTint;
varying vec3 vWorld;
varying vec3 vNWorld;
void main(){
  vec3 p = position;
  float k = mix(1.0, aParams.w, p.y + 0.5);
  vec3 lp = vec3(p.x * k, p.y + 0.5, p.z * k) * aSize;
  vec4 wp = modelMatrix * instanceMatrix * vec4(lp, 1.0);
  vWorld = wp.xyz;
  vLocal = p;
  vSize = aSize;
  vNObj = normal;
  vParams = aParams;
  vTint = aTint;
  vNWorld = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`

export const BLD_FRAG = /* glsl */ `
${COMMON}
varying vec3 vLocal;
varying vec3 vSize;
varying vec3 vNObj;
varying vec4 vParams;
varying vec4 vTint;
varying vec3 vWorld;
varying vec3 vNWorld;

void main(){
  vec3 toP = vWorld - cameraPosition;
  float dist = length(toP);
  if (uDepthMode > 0.5) { gl_FragColor = vec4(vec3(depthEncode(dist)), 1.); return; }
  vec3 V = toP / dist;
  float seed = vParams.x, style = vParams.y, litFrac = vParams.z;
  vec3 tint = vTint.rgb;
  vec3 an = abs(vNObj);
  vec3 base;
  vec3 emis = vec3(0.);

  if (an.y > 0.5) {
    // Roofs: dark membrane, a little sky light, faint variation.
    float r = hash12(floor(vWorld.xz / 2.5) + seed);
    base = mix(vec3(0.05), tint * 0.35, 0.5) * (0.75 + 0.5 * r) * skyBase(vec3(0., 1., 0.)) * 2.2;
  } else {
    vec2 fuv; float face;
    if (an.x > 0.5) { fuv = vec2(vLocal.z * vSize.z, (vLocal.y + 0.5) * vSize.y); face = vNObj.x > 0. ? 0. : 1.; }
    else { fuv = vec2(vLocal.x * vSize.x, (vLocal.y + 0.5) * vSize.y); face = vNObj.z > 0. ? 2. : 3.; }

    float floorH = 3.3, bayW = 3.0; vec4 win = vec4(0.24, 0.76, 0.30, 0.82); float groundH = 4.0;
    vec3 glassTint = vec3(0.55, 0.6, 0.65); float wallRefl = 0.0;
    if (style > 0.5 && style < 1.5) { floorH = 4.0; bayW = 1.55; win = vec4(0.04, 0.96, 0.16, 0.94); groundH = 6.; glassTint = vec3(0.45, 0.6, 0.66); wallRefl = 0.6; }
    else if (style > 1.5 && style < 2.5) { floorH = 3.0; bayW = 2.7; win = vec4(0.12, 0.88, 0.22, 0.86); groundH = 5.; }
    else if (style > 2.5 && style < 3.5) { floorH = 3.9; bayW = 1.6; win = vec4(0.36, 0.64, 0.05, 0.95); groundH = 8.; }
    else if (style > 3.5 && style < 4.5) { floorH = 3.8; bayW = 2.4; win = vec4(0.08, 0.92, 0.18, 0.88); groundH = 8.; glassTint = vec3(0.4); }
    else if (style > 4.5 && style < 5.5) { floorH = 3.95; bayW = 1.5; win = vec4(0.06, 0.94, 0.10, 0.94); groundH = 7.; glassTint = vec3(0.42, 0.38, 0.34); wallRefl = 0.5; }
    else if (style > 5.5) { win = vec4(0.); }

    vec2 g = vec2(fuv.x / bayW, (fuv.y - groundH) / floorH);
    vec2 cell = floor(g), f = fract(g);
    vec2 fw = fwidth(g) + 1e-4;
    float mx = smoothstep(win.x - fw.x, win.x + fw.x, f.x) - smoothstep(win.y - fw.x, win.y + fw.x, f.x);
    float my = smoothstep(win.z - fw.y, win.z + fw.y, f.y) - smoothstep(win.w - fw.y, win.w + fw.y, f.y);
    float area = (win.y - win.x) * (win.w - win.z);
    float aa = smoothstep(0.28, 0.85, max(fw.x, fw.y));
    float mask = mix(mx * my, area, aa);
    mask *= step(0.0, g.y) * step(fuv.y, vSize.y - 1.6);

    // Hancock's X-bracing.
    if (style > 3.5 && style < 4.5) {
      float faceW = (an.x > 0.5 ? vSize.z : vSize.x) * mix(1.0, 0.6, fuv.y / vSize.y);
      float a = clamp(fuv.x / faceW + 0.5, 0., 1.);
      float s = fract(fuv.y / (faceW * 0.95));
      float dl = min(abs(s - a), abs(s - (1. - a)));
      float bw = 0.035 + fwidth(s) * 1.2;
      float brace = 1. - smoothstep(bw * 0.6, bw, dl);
      brace = max(brace, 1. - smoothstep(0.012, 0.012 + fwidth(s) * 1.5, min(s, 1. - s)));
      mask *= 1. - brace;
    }

    float h = hash13(vec3(cell, face + seed * 7.13));
    float lit;
    if ((style > 0.5 && style < 1.5) || (style > 4.5 && style < 5.5) || (style > 2.5 && style < 3.5)) {
      float hc = hash13(vec3(floor(cell.x / 6.), cell.y, face + seed * 3.1));
      lit = step(hc, litFrac) * step(0.14, h);
    } else {
      lit = step(h, litFrac);
    }
    // A few windows switch on and off during the loop.
    float hT = hash13(vec3(cell.yx + 0.5, face + seed * 11.7));
    if (hT < 0.008) lit = step(0.5, fract(uTime / uLoop + hT * 125.));

    float hc2 = hash13(vec3(cell, seed + face * 3.));
    vec3 lc = hc2 < 0.52 ? vec3(1.0, 0.64, 0.33) : hc2 < 0.80 ? vec3(1.0, 0.80, 0.56) : hc2 < 0.94 ? vec3(0.80, 0.88, 1.0) : vec3(0.52, 0.66, 1.0);
    float hi = hash13(vec3(cell + 3.1, seed)); float inten = mix(0.25, 1.5, hi * hi) + step(0.93, hi) * 1.2;
    if (hc2 >= 0.94) { float ph = uTime / uLoop * TAU; inten *= 0.62 + 0.38 * sin(ph * 9. + h * 40.) * sin(ph * 4. + h * 9.); }
    inten *= mix(1.0, mix(0.75, 1.15, f.y), 1. - aa);
    emis = lc * inten * lit * mask;

    vec3 R = reflect(V, vNWorld);
    float ndv = clamp(dot(-V, vNWorld), 0., 1.);
    float fres = 0.04 + 0.96 * pow(1. - ndv, 5.);
    vec3 skyR = skyBase(normalize(vec3(R.x, max(R.y, 0.02), R.z)));
    vec3 glassRefl = skyR * mix(0.10, 0.55, fres) * glassTint;
    vec3 amb = skyBase(normalize(vNWorld + vec3(0., 0.9, 0.))) * 0.55;
    vec3 wall = tint * amb;
    wall = mix(wall, glassRefl * 0.8 + tint * amb * 0.4, wallRefl);
    wall += tint * vec3(1.0, 0.72, 0.46) * 0.2 * (1. - smoothstep(0., 16., fuv.y)); // street uplight
    vec3 winBase = glassRefl * (1. - lit * 0.7);
    base = mix(wall, winBase, mask);

    // Storefronts on commercial streets.
    if (vTint.a > 0.5 && fuv.y < groundH - 0.6 && fuv.y > 0.4) {
      float sh = hash13(vec3(floor(fuv.x / 6.), seed, face));
      vec3 sc = sh < 0.7 ? vec3(1.0, 0.75, 0.48) : vec3(0.85, 0.92, 1.0);
      emis += sc * (0.4 + 1.1 * sh) * step(0.3, sh);
    }
  }

  float fogF = 1. - exp(-dist / 12000.);
  vec3 col = mix(base, hazeColor(V), fogF) + emis * exp(-dist / 15000.);
  gl_FragColor = vec4(col, 1.);
}`

export const GROUND_VERT = /* glsl */ `
varying vec3 vWorld;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`

export const GROUND_FRAG = /* glsl */ `
${COMMON}
uniform vec2 uClarkA; uniform vec2 uClarkB; // (x, z)
varying vec3 vWorld;
float lineGlow(float d, float w, float fwd){ float ww = max(w, fwd * 1.5); return (w / ww) * exp(-(d * d) / (ww * ww)); }
void main(){
  vec3 toP = vWorld - cameraPosition; float dist = length(toP);
  if (uDepthMode > 0.5) { gl_FragColor = vec4(vec3(depthEncode(dist)), 1.); return; }
  vec3 V = toP / dist;
  vec2 p = vWorld.xz;
  float n = vnoise(p / 40.) * 0.5 + vnoise(p / 9.) * 0.5;
  vec3 base = vec3(0.016, 0.016, 0.018) * (0.7 + 0.6 * n);
  // street light pools along the grid: N-S every 100 m, E-W every 200 m, plus Clark diagonal
  float dx = abs(fract((p.x) / 100. + 0.5) - 0.5) * 100.;
  float dz = abs(fract((p.y) / 200. + 0.5) - 0.5) * 200.;
  vec2 ab = uClarkB - uClarkA; float t = clamp(dot(p - uClarkA, ab) / dot(ab, ab), 0., 1.);
  float dc = length(p - (uClarkA + ab * t));
  float fwx = fwidth(p.x), fwz = fwidth(p.y);
  float glow = lineGlow(dx, 7., fwx) + lineGlow(dz, 8., fwz) * 1.2 + lineGlow(dc, 9., max(fwx, fwz)) * 1.4;
  vec3 street = vec3(1.0, 0.70, 0.42) * 0.045 * glow;
  gl_FragColor = vec4(mix(base + street, hazeColor(V), 1. - exp(-dist / 12000.)), 1.);
}`

export const PARK_FRAG = /* glsl */ `
${COMMON}
varying vec3 vWorld;
void main(){
  vec3 toP = vWorld - cameraPosition; float dist = length(toP);
  if (uDepthMode > 0.5) { gl_FragColor = vec4(vec3(depthEncode(dist)), 1.); return; }
  vec3 V = toP / dist;
  float n = vnoise(vWorld.xz / 18.);
  vec3 base = vec3(0.006, 0.0085, 0.007) * (0.6 + 0.8 * n);
  gl_FragColor = vec4(mix(base, hazeColor(V), 1. - exp(-dist / 12000.)), 1.);
}`

export const WATER_VERT = /* glsl */ `
uniform mat4 textureMatrix;
varying vec4 vUv;
varying vec3 vWorld;
void main(){
  vUv = textureMatrix * vec4(position, 1.0);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`

export const WATER_FRAG = /* glsl */ `
${COMMON}
uniform vec3 color;
uniform sampler2D tDiffuse;
varying vec4 vUv;
varying vec3 vWorld;
void main(){
  vec3 toP = vWorld - cameraPosition; float dist = length(toP);
  if (uDepthMode > 0.5) { gl_FragColor = vec4(vec3(depthEncode(dist)), 1.); return; }
  vec3 V = toP / dist;
  vec2 p = vWorld.xz;
  float ph = TAU * uTime / uLoop;
  vec2 n = vec2(0.);
  n += vec2(0.8, 0.6) * sin(dot(p, vec2(0.8, 0.6)) * 0.09 + ph * 3.);
  n += vec2(-0.5, 0.86) * sin(dot(p, vec2(-0.5, 0.86)) * 0.16 + ph * 5.) * 0.6;
  n += vec2(0.2, -0.98) * sin(dot(p, vec2(0.2, -0.98)) * 0.31 + ph * 8.) * 0.35;
  n += vec2(0.95, 0.3) * sin(dot(p, vec2(0.95, 0.3)) * 0.55 + ph * 11.) * 0.2;
  float fade = exp(-dist / 4500.);
  vec3 N = normalize(vec3(n.x * 0.06, 1.0, n.y * 0.06));
  vec4 uv = vUv;
  uv.x += N.x * 0.010 * uv.w;
  uv.y += N.z * 0.034 * uv.w * (0.4 + 0.6 * fade);
  vec3 refl = texture2DProj(tDiffuse, uv).rgb;
  float ndv = clamp(-V.y, 0., 1.);
  float fres = 0.02 + 0.98 * pow(1. - ndv, 5.);
  vec3 deep = vec3(0.006, 0.012, 0.02);
  vec3 col = mix(deep, refl * 0.92, clamp(fres * 1.05 + 0.05, 0., 1.));
  gl_FragColor = vec4(mix(col, hazeColor(V), (1. - exp(-dist / 9500.)) * 0.8), 1.);
}`

export const POINTS_VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
uniform float uPxPerRad;
varying vec3 vColor;
varying float vFog;
varying float vDist;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float dist = -mv.z;
  float s = aSize * uPxPerRad / dist;
  float ps = clamp(s, 1.7, 48.);
  float energy = clamp((s * s) / (ps * ps), 0.12, 1.0);
  gl_PointSize = ps * 2.6;
  vColor = aColor * energy;
  vFog = exp(-dist / 15000.);
  vDist = dist;
  gl_Position = projectionMatrix * mv;
}`

export const POINTS_FRAG = /* glsl */ `
uniform float uDepthMode;
varying vec3 vColor;
varying float vFog;
varying float vDist;
void main(){
  if (uDepthMode > 0.5) discard;
  vec2 c = gl_PointCoord - 0.5;
  float r2 = dot(c, c) * 4.0 * 2.6 * 2.6;
  float core = exp(-r2 * 1.2);
  float halo = exp(-r2 * 0.25) * 0.035;
  float a = core + halo;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor * a * vFog, 1.0);
}`

export const FLAT_FRAG = /* glsl */ `
${COMMON}
uniform vec3 uColor;
uniform float uEmissive;
varying vec3 vWorld;
void main(){
  vec3 toP = vWorld - cameraPosition; float dist = length(toP);
  if (uDepthMode > 0.5) { gl_FragColor = vec4(vec3(depthEncode(dist)), 1.); return; }
  vec3 V = toP / dist;
  vec3 c = uColor * (uEmissive > 0.5 ? 1.0 : skyBase(vec3(0., 1., 0.)).b * 4.0);
  gl_FragColor = vec4(mix(c, hazeColor(V), (1. - exp(-dist / 12000.)) * (uEmissive > 0.5 ? 0.3 : 1.)), 1.);
}`

export const TREE_VERT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vN;
void main(){
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`

export const TREE_FRAG = /* glsl */ `
${COMMON}
varying vec3 vWorld;
varying vec3 vN;
void main(){
  vec3 toP = vWorld - cameraPosition; float dist = length(toP);
  if (uDepthMode > 0.5) { gl_FragColor = vec4(vec3(depthEncode(dist)), 1.); return; }
  vec3 V = toP / dist;
  float n = hash12(floor(vWorld.xz * 0.7));
  vec3 leaf = vec3(0.10, 0.16, 0.10) * (0.65 + 0.7 * n);
  vec3 c = leaf * (0.05 + 0.14 * max(vN.y, 0.)) ;
  float under = max(0.35 - vN.y, 0.) * (1. - smoothstep(5., 16., vWorld.y));
  c += vec3(0.55, 0.38, 0.2) * 0.07 * under * (0.6 + 0.8 * n);
  gl_FragColor = vec4(mix(c, hazeColor(V), 1. - exp(-dist / 12000.)), 1.);
}`
