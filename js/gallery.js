// Curved, infinitely looping WebGL carousel of skill cards (OGL).
// Cards ride along a circular arc; drag or scroll-wheel to move, eases and snaps to a card.
import { Renderer, Camera, Transform, Plane, Program, Mesh, Texture } from '../vendor/ogl.min.mjs';

const VERT = `
  attribute vec3 position; attribute vec2 uv;
  uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix;
  uniform float uSpeed; uniform float uTime;
  varying vec2 vUv;
  void main(){
    vUv = uv;
    vec3 p = position;
    // slight ripple while moving
    p.z += sin(p.x * 4.0 + uTime) * 0.6 * clamp(abs(uSpeed), 0.0, 1.0) * 0.4;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const FRAG = `
  precision highp float;
  uniform sampler2D tMap; uniform float uRadius; uniform vec2 uPlane;
  varying vec2 vUv;
  float rbox(vec2 p, vec2 b, float r){ vec2 d = abs(p) - b + r; return length(max(d,0.0)) + min(max(d.x,d.y),0.0) - r; }
  void main(){
    vec4 c = texture2D(tMap, vUv);
    float d = rbox((vUv - 0.5) * uPlane, uPlane * 0.5, uRadius * min(uPlane.x, uPlane.y));
    float a = 1.0 - smoothstep(-0.004, 0.004, d);
    gl_FragColor = vec4(c.rgb, c.a * a);
  }`;

// Some brands are no longer on Simple Icons — map README slugs to ones that exist.
const SLUG_FIX = { amazonaws: 'amazonwebservices', microsoftazure: 'azure', visualstudio: 'visualstudio', intellijidea: 'intellijidea', oracle: 'oracle', windows: 'windows' };

function cardCanvas(item, img) {
  const W = 512, H = 640, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#0d0d0d';
  x.beginPath(); x.roundRect ? x.roundRect(0, 0, W, 512, 40) : x.rect(0, 0, W, 512); x.fill();
  x.strokeStyle = 'rgba(255,255,255,0.06)'; x.lineWidth = 4; x.stroke();
  if (img) {
    const s = 300 / Math.max(img.width, img.height);
    x.drawImage(img, (W - img.width * s) / 2, (512 - img.height * s) / 2, img.width * s, img.height * s);
  } else {
    x.fillStyle = '#ffffff'; x.font = 'bold 120px "Courier New", monospace';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(item.name.replace(/[^A-Za-z0-9+#]/g, '').slice(0, 3).toUpperCase(), W / 2, 256);
  }
  x.fillStyle = '#ffffff'; x.font = '34px "Courier New", monospace'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  x.fillText(item.name, W / 2, 600);
  return c;
}

export function mountGallery(container, items, { bend = 2, accentFirst = true } = {}) {
  if (!items.length) return () => {};
  let renderer;
  try { renderer = new Renderer({ dpr: Math.min(devicePixelRatio || 1, 2), alpha: true, antialias: true }); }
  catch (_) { return () => {}; }
  const gl = renderer.gl; gl.clearColor(0, 0, 0, 0);
  container.appendChild(gl.canvas); gl.canvas.classList.add('gallery-canvas');
  const camera = new Camera(gl, { fov: 45 }); camera.position.z = 20;
  const scene = new Transform();
  const geo = new Plane(gl, { heightSegments: 50, widthSegments: 100 });

  const list = items.length < 8 ? [...items, ...items] : items;
  const medias = list.map((it, i) => {
    const tex = new Texture(gl, { generateMipmaps: false });
    tex.image = cardCanvas(it);
    if (it.slug) {
      const img = new Image(); img.crossOrigin = 'anonymous';
      const color = accentFirst && i === 0 ? '39ff14' : 'white';
      img.onload = () => { tex.image = cardCanvas(it, img); };
      img.src = `https://cdn.simpleicons.org/${SLUG_FIX[it.slug] || it.slug}/${color}`;
    }
    const program = new Program(gl, { vertex: VERT, fragment: FRAG, transparent: true, depthTest: false,
      uniforms: { tMap: { value: tex }, uSpeed: { value: 0 }, uTime: { value: 100 * Math.random() }, uRadius: { value: 0.08 }, uPlane: { value: [1, 1.25] } } });
    const mesh = new Mesh(gl, { geometry: geo, program }); mesh.setParent(scene);
    return { mesh, program, i };
  });

  let vp = { w: 1, h: 1 }, cardW = 1, gap = 1, total = 1;
  const resize = () => {
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    const fov = (camera.fov * Math.PI) / 180;
    vp.h = 2 * Math.tan(fov / 2) * camera.position.z; vp.w = vp.h * camera.aspect;
    const pxH = Math.min(container.clientHeight * 0.5, container.clientWidth < 640 ? 240 : 320);
    const sh = (vp.h * pxH) / container.clientHeight;
    const cw = sh / 1.25;
    medias.forEach(m => { m.mesh.scale.set(cw, sh, 1); m.program.uniforms.uPlane.value = [cw, sh]; });
    cardW = cw; gap = cw * 0.55; total = (cardW + gap) * medias.length;
  };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  const scroll = { cur: 0, target: 0, last: 0, ease: 0.05 };
  let dragging = false, startX = 0, startPos = 0, snapTimer;
  const snap = () => { const w = cardW + gap; scroll.target = Math.round(scroll.target / w) * w; };
  const schedSnap = () => { clearTimeout(snapTimer); snapTimer = setTimeout(snap, 200); };
  const onWheel = e => { e.preventDefault(); scroll.target += (e.deltaY || e.deltaX) * 0.004 * cardW; schedSnap(); };
  const onDown = e => { dragging = true; startX = e.clientX; startPos = scroll.target; gl.canvas.setPointerCapture(e.pointerId); };
  const onMove = e => { if (!dragging) return; scroll.target = startPos - (e.clientX - startX) * (vp.w / container.clientWidth) * 1.4; };
  const onUp = () => { if (!dragging) return; dragging = false; snap(); };
  gl.canvas.addEventListener('wheel', onWheel, { passive: false });
  gl.canvas.addEventListener('pointerdown', onDown);
  gl.canvas.addEventListener('pointermove', onMove);
  gl.canvas.addEventListener('pointerup', onUp);
  gl.canvas.addEventListener('pointercancel', onUp);

  let raf;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    scroll.cur += (scroll.target - scroll.cur) * scroll.ease;
    const speed = scroll.cur - scroll.last; scroll.last = scroll.cur;
    const H = vp.w / 2, B = Math.abs(bend);
    const Rr = (H * H + B * B) / (2 * B);
    medias.forEach(m => {
      // position along a looping strip, centred
      let x = m.i * (cardW + gap) - scroll.cur;
      x = ((x + total / 2) % total + total) % total - total / 2;
      const ex = Math.min(Math.abs(x), H);
      const arc = Rr - Math.sqrt(Math.max(Rr * Rr - ex * ex, 0));
      m.mesh.position.x = x;
      m.mesh.position.y = bend > 0 ? -arc : arc;
      m.mesh.rotation.z = (bend > 0 ? -1 : 1) * Math.sign(x) * Math.asin(Math.min(ex / Rr, 1));
      m.program.uniforms.uSpeed.value = speed * 4;
      m.program.uniforms.uTime.value += 0.04;
    });
    renderer.render({ scene, camera });
  };
  frame();
  return () => {
    cancelAnimationFrame(raf); ro.disconnect(); clearTimeout(snapTimer);
    gl.canvas.remove(); const ext = gl.getExtension('WEBGL_lose_context'); ext && ext.loseContext();
  };
}
