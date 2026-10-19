// WebGL starfield.
// Three layered motions:
//  1. the whole field slowly spins around its centre (like Earth's daily rotation) with a gentle wobble
//  2. every star drifts on its own sine path
//  3. opposing parallax — the field eases AWAY from the cursor
import { Renderer, Camera, Geometry, Program, Mesh } from '../vendor/ogl.min.mjs';

const VERT = /* glsl */ `
  attribute vec3 position;
  attribute vec4 random;
  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uSizeRandomness;
  varying vec4 vRandom;
  void main() {
    vRandom = random;
    vec3 pos = position * uSpread;
    pos.z *= 10.0;
    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    float t = uTime;
    mPos.x += sin(t * random.z + 6.2831 * random.w) * mix(0.1, 1.5, random.x);
    mPos.y += sin(t * random.y + 6.2831 * random.x) * mix(0.1, 1.5, random.w);
    mPos.z += sin(t * random.w + 6.2831 * random.y) * mix(0.1, 1.5, random.z);
    vec4 mvPos = viewMatrix * mPos;
    gl_PointSize = max(1.5, (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz));
    gl_Position = projectionMatrix * mvPos;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  varying vec4 vRandom;
  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5));
    if (d > 0.5) discard;
    // soft core + slow twinkle
    float tw = 0.8 + 0.2 * sin(uTime * (0.6 + vRandom.y) + vRandom.x * 6.2831);
    float a = smoothstep(0.5, 0.38, d) * tw;
    gl_FragColor = vec4(vec3(1.0), a);
  }
`;

export function mountStarfield(container, opts = {}) {
  const o = {
    count: 160, spread: 10, speed: 0.25, baseSize: 90, sizeRandomness: 1,
    cameraDistance: 20, spin: 0.012, parallax: 0.8, ...opts,
  };

  let renderer;
  try {
    renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio || 1, 2), depth: false, alpha: true });
  } catch (e) {
    return { destroy() {} }; // no WebGL → plain black background
  }
  const gl = renderer.gl;
  container.appendChild(gl.canvas);
  gl.clearColor(0, 0, 0, 0);

  const camera = new Camera(gl, { fov: 15 });
  camera.position.set(0, 0, o.cameraDistance);

  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
  };
  window.addEventListener('resize', resize);
  resize();

  // positions uniformly inside a unit sphere
  const positions = new Float32Array(o.count * 3);
  const randoms = new Float32Array(o.count * 4);
  for (let i = 0; i < o.count; i++) {
    let x, y, z, len;
    do { x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; z = Math.random() * 2 - 1; len = x * x + y * y + z * z; } while (len > 1 || len === 0);
    const r = Math.cbrt(Math.random());
    positions.set([x * r, y * r, z * r], i * 3);
    randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }
  const geometry = new Geometry(gl, {
    position: { size: 3, data: positions },
    random: { size: 4, data: randoms },
  });
  const program = new Program(gl, {
    vertex: VERT, fragment: FRAG, transparent: true, depthTest: false,
    uniforms: {
      uTime: { value: 0 }, uSpread: { value: o.spread },
      uBaseSize: { value: o.baseSize }, uSizeRandomness: { value: o.sizeRandomness },
    },
  });
  const stars = new Mesh(gl, { mode: gl.POINTS, geometry, program });

  // cursor → normalised -1..1 (eased so the parallax glides)
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = e => {
    const p = e.touches ? e.touches[0] : e;
    mouse.tx = (p.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = -((p.clientY / window.innerHeight) * 2 - 1);
  };
  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf, last = performance.now(), elapsed = 0, spinZ = 0;
  const frame = now => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(now - last, 64); last = now;
    const k = reduce ? 0.15 : 1;
    elapsed += dt * o.speed * k;
    program.uniforms.uTime.value = elapsed * 0.001;

    // opposing parallax
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    stars.position.x = -mouse.x * o.parallax;
    stars.position.y = -mouse.y * o.parallax;

    // axial "daily rotation" + slow precession wobble
    spinZ += o.spin * (dt / 16.67) * k * 0.6;
    stars.rotation.z = spinZ * 0.1;
    stars.rotation.x = Math.sin(elapsed * 0.0002) * 0.1;
    stars.rotation.y = Math.cos(elapsed * 0.0005) * 0.15;

    renderer.render({ scene: stars, camera });
  };
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      gl.canvas.remove();
    },
  };
}
