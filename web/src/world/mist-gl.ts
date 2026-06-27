import { register } from '../engine/registry';
import type { FrameCtx } from '../engine/types';

/**
 * Volumetric mist — a WebGL fbm-noise fog that drifts and tears off the water, veiling the peaks so
 * they reveal and conceal as it moves (the brief's headline beat). Density rides the dawn (thick at
 * the cold open, thinning to near-nil at the luminous arrival) with a calm thickening through the
 * Lago Frías engine-cut. Driven from the single ticker; off under reduced motion (the CSS fog layer
 * remains as the static fallback). Feature-detects WebGL and bails to that fallback if unavailable.
 */
const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

const FRAG = `precision highp float;
uniform vec2 res; uniform float time; uniform float density; uniform float dawn;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / res;
  vec2 q = uv * vec2(2.3, 1.3);
  vec2 drift = vec2(time * 0.013, -time * 0.004);          // tears sideways + lifts slowly
  float n = fbm(q * 2.1 + drift + fbm(q * 1.05 - drift) * 0.6);
  float band = smoothstep(1.1, 0.1, uv.y);                  // heaviest low, off the water
  float m = smoothstep(0.46, 0.96, n) * band;
  vec3 col = mix(vec3(0.60, 0.67, 0.74), vec3(0.82, 0.83, 0.80), dawn); // cool grey → pale warm
  gl_FragColor = vec4(col, clamp(m * density, 0.0, 0.62));
}`;

export function initMist(reduced: boolean): void {
  if (reduced) return;
  const canvas = document.getElementById('mist') as HTMLCanvasElement | null;
  const gl = canvas?.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
  if (!canvas || !gl) return; // → CSS #fog fallback stays

  const compile = (type: number, src: string): WebGLShader | null => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'res');
  const uTime = gl.getUniformLocation(prog, 'time');
  const uDensity = gl.getUniformLocation(prog, 'density');
  const uDawn = gl.getUniformLocation(prog, 'dawn');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const dpr = window.innerWidth <= 820 ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
  const resize = (): void => {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  addEventListener('resize', resize, { passive: true });

  register((c: FrameCtx) => {
    const density = Math.max(0.08, 0.8 - 0.6 * c.dawn + 0.35 * c.quiet); // thick cold/cathedral, thin at day
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, c.t * 0.001);
    gl.uniform1f(uDensity, density);
    gl.uniform1f(uDawn, c.dawn);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
}
