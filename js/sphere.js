// Draggable 3D sphere of repo tiles (WebGL / OGL).
// Drag (mouse/touch) to spin with inertia; on release it settles on the tile nearest the viewer.
import { Renderer, Camera, Transform, Plane, Program, Mesh, Texture, Vec3, Quat } from '../vendor/ogl.min.mjs';

const VERT = `
  attribute vec3 position; attribute vec2 uv;
  uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix;
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const FRAG = `
  precision highp float;
  uniform sampler2D tMap; uniform float uAlpha; uniform float uActive;
  varying vec2 vUv;
  void main(){
    vec2 uv = vUv;
    // rounded corners
    vec2 q = abs(uv - 0.5) - 0.5 + 0.06;
    float d = length(max(q, 0.0)) - 0.06;
    if (d > 0.0) discard;
    vec4 c = texture2D(tMap, uv);
    // green rim on the active tile
    float rim = smoothstep(-0.02, 0.0, d) * uActive;
    c.rgb = mix(c.rgb, vec3(0.22, 1.0, 0.08), rim);
    gl_FragColor = vec4(c.rgb, c.a * uAlpha);
  }`;

const LANG_COLORS = { C: '#A8B9CC', 'C++': '#f34b7d', Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6', Java: '#b07219', HTML: '#e34c26', SCSS: '#c6538c', 'C#': '#178600', 'Jupyter Notebook': '#DA5B0B' };

function wrapText(ctx, text, maxW) {
  const words = text.split(/\s+/); const lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}

function tileCanvas(repo, logo) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  x.fillStyle = '#060a06'; x.fillRect(0, 0, S, S);
  // grid
  x.strokeStyle = 'rgba(57,255,20,0.07)'; x.lineWidth = 1;
  for (let i = 0; i <= S; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(S, i); x.stroke(); }
  if (logo) {
    const r = Math.min(300 / logo.width, 300 / logo.height);
    const w = logo.width * r, h = logo.height * r;
    x.drawImage(logo, (S - w) / 2, 48 + (300 - h) / 2, w, h);
  } else {
    // terminal glyph block
    x.font = 'bold 150px "Courier New", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#39ff14'; x.shadowColor = 'rgba(57,255,20,0.6)'; x.shadowBlur = 24;
    const initials = repo.name.replace(/[^A-Za-z0-9]/g, ' ').trim().split(/\s+|(?=[A-Z][a-z])/).slice(0, 2).map(s => s[0]).join('').toUpperCase() || '>_';
    x.fillText(initials, S / 2, 200); x.shadowBlur = 0;
  }
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  x.fillStyle = '#e8ffe8'; x.font = 'bold 34px "Courier New", monospace';
  const name = repo.name.length > 22 ? repo.name.slice(0, 21) + '…' : repo.name;
  x.fillText(name, 32, 410);
  x.font = '22px "Courier New", monospace';
  x.fillStyle = LANG_COLORS[repo.lang] || '#9f9';
  x.beginPath(); x.arc(42, 452, 8, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#9f9'; x.fillText(`${repo.lang || 'misc'}   ★ ${repo.stars}`, 60, 460);
  x.strokeStyle = 'rgba(57,255,20,0.35)'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, S - 3, S - 3);
  return c;
}

function fibonacciSphere(n) {
  const pts = [], g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), t = g * i;
    pts.push(new Vec3(Math.cos(t) * r, y, Math.sin(t) * r));
  }
  return pts;
}

export function mountSphere(container, repos, { onActive = () => {}, onMoving = () => {}, user = '' } = {}) {
  if (!repos.length) return () => {};
  let renderer;
  try { renderer = new Renderer({ dpr: Math.min(devicePixelRatio || 1, 2), alpha: true, antialias: true }); }
  catch (_) { return () => {}; }
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  container.appendChild(gl.canvas);
  gl.canvas.classList.add('sphere-canvas');

  const camera = new Camera(gl, { fov: 35 });
  camera.position.set(0, 0, 9.5);
  const scene = new Transform();
  const globe = new Transform(); globe.setParent(scene);

  // need enough tiles to read as a sphere — repeat the list if short
  const N = Math.max(36, Math.min(48, repos.length));
  const items = []; while (items.length < N) items.push(...repos);
  items.length = N;
  const pts = fibonacciSphere(items.length);
  const R = 2.5;
  const geo = new Plane(gl, { width: 0.92, height: 0.92 });

  const tiles = items.map((repo, i) => {
    const tex = new Texture(gl, { generateMipmaps: false });
    tex.image = tileCanvas(repo);
    const program = new Program(gl, { vertex: VERT, fragment: FRAG, transparent: true, cullFace: null, depthTest: true, depthWrite: false,
      uniforms: { tMap: { value: tex }, uAlpha: { value: 1 }, uActive: { value: 0 } } });
    const m = new Mesh(gl, { geometry: geo, program });
    const p = pts[i].clone().multiply(R);
    m.position.copy(p);
    m.lookAt(pts[i].clone().multiply(R * 2));
    m.setParent(globe);
    // try the repo's own logo.png (CORS-enabled on raw.githubusercontent.com)
    if (user && i < repos.length) {
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = () => { const cv = tileCanvas(repo, img); items.forEach((r, j) => { if (r === repo) { tiles[j].tex.image = cv; } }); };
      img.src = `https://raw.githubusercontent.com/${user}/${repo.name}/${repo.branch}/logo.png`;
    }
    return { m, program, tex, base: pts[i], repo };
  });

  const resize = () => {
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    camera.position.z = container.clientWidth < 640 ? 11.5 : 9.5;
  };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  // ── drag (yaw/pitch, keeps tiles upright) with inertia + snap ──
  const q = new Quat(); const qy = new Quat(); const qx = new Quat();
  const Y = new Vec3(0, 1, 0), X = new Vec3(1, 0, 0);
  let yaw = 0.4, pitch = 0.15, vYaw = 0.004, vPitch = 0;
  let dragging = false, lx = 0, ly = 0, settling = false, active = -1, snapI = -1;
  const PMAX = 1.53; // ~88° — lets the poles reach the front
  const wrapPi = a => Math.atan2(Math.sin(a), Math.cos(a));
  const setQ = () => { qy.fromAxisAngle(Y, yaw); qx.fromAxisAngle(X, pitch); q.multiply(qx, qy); };

  const wp = new Vec3(), pc = new Vec3(), pe = new Vec3();

  // screen-space pick: which visible tile is under (clientX, clientY)?
  const pick = (cx, cy) => {
    const r = gl.canvas.getBoundingClientRect();
    const toPx = v => [(v.x + 1) / 2 * r.width, (1 - v.y) / 2 * r.height];
    let hit = -1, hz = -Infinity;
    tiles.forEach((t, i) => {
      wp.copy(t.base).applyQuaternion(q);
      if (wp.z < 0.1) return; // only the front hemisphere is clickable
      const s = t.m.scale.x * 0.46;
      pc.copy(wp).multiply(R); pe.copy(pc); pe.x += s;
      camera.project(pc); camera.project(pe);
      const [x, y] = toPx(pc), [ex] = toPx(pe);
      const rad = Math.abs(ex - x) * 1.05;
      if (Math.abs(cx - r.left - x) < rad && Math.abs(cy - r.top - y) < rad && wp.z > hz) { hz = wp.z; hit = i; }
    });
    return hit;
  };
  const snapTo = i => {
    snapI = i; settling = true; vYaw = vPitch = 0;
    if (active !== i) { active = -1; onMoving(true); }
  };

  let sx = 0, sy = 0, moved = false;
  const down = e => {
    dragging = true; moved = false; sx = lx = e.clientX; sy = ly = e.clientY;
    gl.canvas.setPointerCapture(e.pointerId);
  };
  const move = e => {
    if (!dragging) { gl.canvas.style.cursor = pick(e.clientX, e.clientY) >= 0 ? 'pointer' : ''; return; }
    if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) > 6) {
      moved = true; settling = false; snapI = -1; vYaw = vPitch = 0;
      if (active !== -1) { active = -1; onMoving(true); }
    }
    if (!moved) return;
    const dx = (e.clientX - lx) * 0.006, dy = (e.clientY - ly) * 0.006;
    lx = e.clientX; ly = e.clientY;
    vYaw = dx; vPitch = dy;
    yaw += dx; pitch = Math.max(-PMAX, Math.min(PMAX, pitch + dy));
  };
  const up = e => {
    if (!dragging) return;
    dragging = false;
    if (moved || e.type === 'pointercancel') return;
    // a click, not a drag
    const i = pick(e.clientX, e.clientY);
    if (i < 0) return;
    if (i === active) { const r = tiles[i].repo; window.open(r.homepage || r.url, '_blank', 'noopener'); }
    else snapTo(i);
  };
  gl.canvas.addEventListener('pointerdown', down);
  gl.canvas.addEventListener('pointermove', move);
  gl.canvas.addEventListener('pointerup', up);
  gl.canvas.addEventListener('pointercancel', up);

  const frontMost = () => {
    let best = 0, bz = -Infinity;
    tiles.forEach((t, i) => { wp.copy(t.base).applyQuaternion(q); if (wp.z > bz) { bz = wp.z; best = i; } });
    return best;
  };
  // yaw/pitch that bring base point p to face the camera (+z)
  const anglesFor = p => ({ yaw: Math.atan2(-p.x, p.z), pitch: Math.atan2(p.y, Math.hypot(p.x, p.z)) });

  let raf;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (!dragging) {
      if (!settling) {
        yaw += vYaw; pitch = Math.max(-PMAX, Math.min(PMAX, pitch + vPitch));
        vYaw *= 0.95; vPitch *= 0.95;
        if (Math.hypot(vYaw, vPitch) < 0.0012) { settling = true; setQ(); snapI = frontMost(); }
      } else if (snapI >= 0) {
        const a = anglesFor(tiles[snapI].base);
        const dy = wrapPi(a.yaw - yaw), dp = Math.max(-PMAX, Math.min(PMAX, a.pitch)) - pitch;
        yaw += dy * 0.1; pitch += dp * 0.1;
        if (Math.abs(dy) < 0.003 && Math.abs(dp) < 0.003 && active !== snapI) {
          active = snapI; onActive(tiles[snapI].repo); onMoving(false);
        }
      }
    }
    setQ();
    globe.quaternion.copy(q);
    tiles.forEach((t, i) => {
      wp.copy(t.base).applyQuaternion(q);
      const facing = (wp.z + 1) / 2; // 0 back … 1 front
      const s = 0.55 + facing * 0.75;
      t.m.scale.set(s, s, s);
      t.program.uniforms.uAlpha.value = 0.12 + facing * facing * 0.88;
      t.program.uniforms.uActive.value = i === active ? 1 : 0;
      t.tex.needsUpdate = t.tex.needsUpdate || false;
    });
    renderer.render({ scene, camera });
  };
  frame();

  return () => {
    cancelAnimationFrame(raf); ro.disconnect();
    gl.canvas.remove();
    const ext = gl.getExtension('WEBGL_lose_context'); ext && ext.loseContext();
  };
}
