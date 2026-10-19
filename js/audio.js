// ─────────────────────────────────────────────────────────────
//  Audio: UI sounds + generative "space journey" music themes.
//  Everything is synthesised live with the Web Audio API — no files,
//  no licensing, never the same twice. Optional mp3 tracks can be
//  added in config.js (CONFIG.musicTracks) and appear as extra channels.
// ─────────────────────────────────────────────────────────────
import { CONFIG } from './config.js';

let ctx = null, master = null, engine = null;
const ensure = () => {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

// ── UI sounds ───────────────────────────────────────────────
let sfxOn = true;
export const setSfx = on => { sfxOn = on; };
export function hover() {
  if (!sfxOn) return;
  const c = ensure(), t = c.currentTime, o = c.createOscillator(), g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(800, t); o.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
  g.gain.setValueAtTime(0.02, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.06);
}
export function click() {
  if (!sfxOn) return;
  const c = ensure(), t = c.currentTime, o = c.createOscillator(), g = c.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
  g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.11);
}

// ── music building blocks ───────────────────────────────────
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];

function makeReverb(c, seconds = 5, decay = 3) {
  const len = Math.floor(c.sampleRate * seconds), ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  const conv = c.createConvolver(); conv.buffer = ir; return conv;
}

function pingPong(c, dest, time = 0.45, fb = 0.4, tone = 2600) {
  const inp = c.createGain(), l = c.createDelay(3), r = c.createDelay(3), fl = c.createGain(), lp = c.createBiquadFilter();
  l.delayTime.value = time; r.delayTime.value = time; fl.gain.value = fb; lp.type = 'lowpass'; lp.frequency.value = tone;
  const merger = c.createChannelMerger(2);
  inp.connect(l); l.connect(r); r.connect(lp); lp.connect(fl); fl.connect(l);
  l.connect(merger, 0, 0); r.connect(merger, 0, 1); merger.connect(dest);
  return inp;
}

function lfo(c, param, rate, depth, type = 'sine') {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = rate; g.gain.value = depth;
  o.connect(g).connect(param); o.start(); return o;
}

// sustained voice with attack/hold/release — auto-stops
function padNote(c, dest, m, t, dur, { gain = 0.03, attack = 3, release = 4, types = ['sine', 'triangle'], detune = 7 } = {}) {
  const g = c.createGain(), f = mtof(m), end = t + dur + release;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.setValueAtTime(gain, t + dur);
  g.gain.linearRampToValueAtTime(0.0001, end);
  g.connect(dest);
  types.forEach((ty, i) => {
    const o = c.createOscillator(); o.type = ty; o.frequency.value = f;
    o.detune.value = (i % 2 ? 1 : -1) * detune * (types.length > 1 ? 1 : 0);
    o.connect(g); o.start(t); o.stop(end + 0.1);
  });
}

// soft sine "star" with long tail
function chime(c, dest, m, t, { gain = 0.03, decay = 4, attack = 0.02 } = {}) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = 'sine'; o.frequency.value = mtof(m);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g).connect(dest); o.start(t); o.stop(t + decay + 0.1);
}

// FM bell / music box
function bell(c, dest, m, t, { gain = 0.04, decay = 2.4, ratio = 3.5, index = 1.4 } = {}) {
  const f = mtof(m), car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
  car.frequency.value = f; mod.frequency.value = f * ratio;
  mg.gain.setValueAtTime(f * index, t); mg.gain.exponentialRampToValueAtTime(f * 0.02, t + decay * 0.6);
  mod.connect(mg).connect(car.frequency);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  car.connect(g).connect(dest);
  car.start(t); mod.start(t); car.stop(t + decay + 0.1); mod.stop(t + decay + 0.1);
}

// filtered saw pluck
function pluck(c, dest, m, t, { gain = 0.03, decay = 0.6, cutoff = 2400 } = {}) {
  const o = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
  o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = o2.frequency.value = mtof(m); o2.detune.value = 5;
  lp.type = 'lowpass'; lp.Q.value = 4;
  lp.frequency.setValueAtTime(cutoff, t); lp.frequency.exponentialRampToValueAtTime(300, t + decay * 0.7);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(lp); o2.connect(lp); lp.connect(g).connect(dest);
  o.start(t); o2.start(t); o.stop(t + decay + 0.05); o2.stop(t + decay + 0.05);
}

function noiseSource(c) {
  const len = c.sampleRate * 4, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  let b = 0;
  for (let i = 0; i < len; i++) { b = 0.98 * b + 0.02 * (Math.random() * 2 - 1); d[i] = b * 4; } // soft brown-ish noise
  const s = c.createBufferSource(); s.buffer = buf; s.loop = true; return s;
}

// A scheduler helper: calls `fn(time)` every `step` seconds, scheduled ahead by tick()
function every(step, fn, start = 0) {
  let next = start;
  return (t0, t1) => { if (next < t0) next = t0; while (next < t1) { fn(next); next += typeof step === 'function' ? step() : step; } };
}

// ── THEMES ──────────────────────────────────────────────────
// Each theme: create({ c, out, wet, t }) → { tick(t0, t1), nodes[] }
export const THEMES = [
  {
    id: 'drift', name: 'Drift', desc: 'slow chords, distant chimes', trim: 0.63,
    create({ c, out, wet, t }) {
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.5;
      lp.connect(out); lp.connect(wet);
      const nodes = [lfo(c, lp.frequency, 0.04, 500)];
      const chords = [[38, 50, 57, 60, 64, 65], [34, 46, 53, 57, 62, 65], [41, 53, 57, 60, 64, 67], [36, 48, 55, 62, 64, 67]];
      let i = 0;
      const ch = every(10, tt => { chords[i++ % 4].forEach((m, k) => padNote(c, lp, m, tt, 10, { gain: k ? 0.022 : 0.04, attack: 3.5, release: 5, types: k ? ['sine', 'triangle'] : ['sine'] })); }, t);
      const ding = every(() => rand(3, 7), tt => { const cur = chords[(i + 3) % 4]; chime(c, wet, pick(cur.slice(2)) + 24, tt, { gain: 0.03, decay: 5 }); }, t + 3);
      return { tick: (a, b) => { ch(a, b); ding(a, b); }, nodes };
    },
  },
  {
    id: 'nebula', name: 'Nebula', desc: 'lush warm pads, shimmering echoes', trim: 1.35,
    create({ c, out, wet, t }) {
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800; lp.Q.value = 0.8;
      lp.connect(out); lp.connect(wet);
      const nodes = [lfo(c, lp.frequency, 0.03, 450)];
      const echo = pingPong(c, wet, 0.48, 0.5, 3000);
      const chords = [[40, 52, 56, 59, 63, 66], [37, 49, 52, 56, 59, 63], [33, 45, 52, 56, 59, 63], [35, 47, 54, 57, 61, 66]];
      const penta = [76, 78, 80, 83, 85, 88, 90, 92];
      let i = 0;
      const ch = every(12, tt => { chords[i++ % 4].forEach((m, k) => padNote(c, lp, m, tt, 12, { gain: k ? 0.011 : 0.03, attack: 4, release: 6, types: k ? ['sawtooth', 'sawtooth'] : ['sine'], detune: 11 })); }, t);
      const shimmer = every(() => rand(1.2, 3.4), tt => { const m = pick(penta); chime(c, echo, m, tt, { gain: 0.022, decay: 5, attack: 0.25 }); chime(c, wet, m + 12, tt, { gain: 0.008, decay: 6, attack: 0.4 }); }, t + 2);
      return { tick: (a, b) => { ch(a, b); shimmer(a, b); }, nodes };
    },
  },
  {
    id: 'deep', name: 'Deep Space', desc: 'low drone, solar wind, sonar pings', trim: 0.65,
    create({ c, out, wet, t }) {
      const drone = c.createGain(); drone.gain.setValueAtTime(0.0001, t); drone.gain.linearRampToValueAtTime(1, t + 6);
      drone.connect(out); drone.connect(wet);
      const nodes = [];
      [[33, 0.07, 0], [45, 0.04, 3], [52, 0.025, -4], [57, 0.012, 6]].forEach(([m, g, det]) => {
        const o = c.createOscillator(), gg = c.createGain(); o.type = 'sine'; o.frequency.value = mtof(m); o.detune.value = det;
        gg.gain.value = g; o.connect(gg).connect(drone); o.start(t); nodes.push(o, lfo(c, gg.gain, rand(0.03, 0.08), g * 0.5));
      });
      const wind = noiseSource(c), bp = c.createBiquadFilter(), wg = c.createGain();
      bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 1.4; wg.gain.value = 0.05;
      wind.connect(bp).connect(wg); wg.connect(out); wg.connect(wet); wind.start(t);
      nodes.push(wind, lfo(c, bp.frequency, 0.021, 420), lfo(c, wg.gain, 0.013, 0.035));
      const swell = every(16, tt => { [57, 60, 64, 71].forEach(m => padNote(c, wet, m, tt, 6, { gain: 0.018, attack: 5, release: 7, types: ['triangle'] })); }, t + 8);
      const ping = every(() => rand(6, 12), tt => { const m = pick([81, 88, 93, 76]); chime(c, wet, m, tt, { gain: 0.035, decay: 2.2, attack: 0.005 }); chime(c, wet, m, tt + 0.9, { gain: 0.012, decay: 2, attack: 0.005 }); }, t + 4);
      return { tick: (a, b) => { swell(a, b); ping(a, b); }, nodes };
    },
  },
  {
    id: 'starlight', name: 'Starlight', desc: 'music-box arpeggios over soft pads', trim: 1.32,
    create({ c, out, wet, t }) {
      const bus = c.createGain(); bus.connect(out); bus.connect(wet);
      const chords = [[48, 55, 59, 64], [45, 52, 59, 60, 64], [41, 53, 57, 60, 67], [43, 55, 59, 62, 64]];
      const eighth = 60 / 72 / 2, bar = eighth * 8, pattern = [0, 2, 1, 3, 2, 4, 3, 1];
      let step = 0;
      const arp = every(eighth, tt => {
        const chord = chords[Math.floor(step / 16) % 4];
        if (step % 16 === 0) {
          chord.forEach((m, k) => padNote(c, bus, m, tt, bar * 2, { gain: k ? 0.014 : 0.03, attack: 2, release: 3, types: ['sine'] }));
        }
        const tones = chord.slice(1).map(m => m + 12).concat(chord.slice(1).map(m => m + 24)).filter(m => m >= 62 && m <= 90).sort((a, b) => a - b);
        if (Math.random() < 0.82) bell(c, bus, tones[pattern[step % 8] % tones.length], tt + rand(0, 0.012), { gain: 0.032, decay: 2.6 });
        step++;
      }, t + 0.5);
      return { tick: arp, nodes: [] };
    },
  },
  {
    id: 'orbit', name: 'Orbit', desc: 'gentle pulsing synth voyage', trim: 0.68,
    create({ c, out, wet, t }) {
      const bus = c.createGain(); bus.connect(out); bus.connect(wet);
      const echo = pingPong(c, out, (60 / 80) * 0.75, 0.38, 2200);
      const chords = [[45, 57, 60, 64, 69], [41, 53, 57, 60, 65], [36, 48, 55, 60, 64], [43, 55, 59, 62, 67]];
      const eighth = 60 / 80 / 2, seq = [0, 1, 2, 3, 4, 3, 2, 1];
      let step = 0;
      const arp = every(eighth, tt => {
        const chord = chords[Math.floor(step / 16) % 4];
        if (step % 16 === 0) {
          padNote(c, bus, chord[0] - 12, tt, eighth * 16, { gain: 0.06, attack: 0.6, release: 1.5, types: ['sine'] });
          chord.slice(1).forEach(m => padNote(c, bus, m, tt, eighth * 16, { gain: 0.008, attack: 2.5, release: 3, types: ['triangle', 'sine'] }));
        }
        const m = chord[1 + (seq[step % 8] % (chord.length - 1))] + 12;
        const accent = step % 4 === 0 ? 1 : 0.7;
        pluck(c, bus, m, tt, { gain: 0.022 * accent, decay: 0.55, cutoff: 1500 + 1300 * accent });
        pluck(c, echo, m, tt, { gain: 0.012 * accent, decay: 0.55, cutoff: 1800 });
        step++;
      }, t + 0.5);
      return { tick: arp, nodes: [] };
    },
  },
];

// optional real tracks from config → extra channels
const TRACKS = (CONFIG.musicTracks || []).map((tr, i) => ({ id: 'track-' + i, name: tr.name, desc: tr.credit || 'audio track', src: tr.src, file: true }));
export const CHANNELS = [...THEMES, ...TRACKS];

// ── engine (works with AudioContext and OfflineAudioContext) ─
function startTheme(c, dest, theme, t = c.currentTime) {
  const out = c.createGain(), wetSend = c.createGain(), verb = makeReverb(c, 6, 2.6), mix = c.createGain();
  mix.gain.setValueAtTime(0.0001, t); mix.gain.linearRampToValueAtTime(theme.trim || 1, t + 3);
  wetSend.gain.value = 0.9;
  out.connect(mix); wetSend.connect(verb).connect(mix); mix.connect(dest);
  const inst = theme.create({ c, out, wet: wetSend, t });
  return {
    mix, inst,
    tick(t0, t1) { inst.tick(t0, t1); },
    stop(at = c.currentTime, fade = 2.5) {
      mix.gain.cancelScheduledValues(at); mix.gain.setValueAtTime(mix.gain.value || 0.0001, at);
      mix.gain.linearRampToValueAtTime(0.0001, at + fade);
      setTimeout(() => { inst.nodes.forEach(n => { try { n.stop(); } catch (_) {} }); mix.disconnect(); }, (fade + 0.3) * 1000);
    },
  };
}

function startTrack(ch) {
  const a = new Audio(ch.src); a.loop = true; a.crossOrigin = 'anonymous'; a.volume = 0;
  a.play().catch(() => {});
  let v = 0; const target = CONFIG.musicTrackVolume ?? 0.35;
  const up = setInterval(() => { v = Math.min(target, v + target / 30); a.volume = v; if (v >= target) clearInterval(up); }, 100);
  return {
    tick() {},
    stop() { clearInterval(up); const dn = setInterval(() => { v = Math.max(0, v - target / 25); a.volume = v; if (v <= 0) { clearInterval(dn); a.pause(); } }, 100); },
  };
}

let musicGain = null, scheduler = null, playing = null, themeId = null;
const STORE = 'nt_music_theme';
try { themeId = localStorage.getItem(STORE); } catch (_) {}
if (!CHANNELS.some(t => t.id === themeId)) themeId = CHANNELS[0].id;

const listeners = new Set();
export const onMusicChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach(fn => fn({ on: !!playing, theme: themeId }));

function play(id) {
  const c = ensure();
  if (!musicGain) { musicGain = c.createGain(); musicGain.gain.value = CONFIG.musicVolume ?? 1; musicGain.connect(master); }
  if (playing) playing.stop();
  const ch = CHANNELS.find(x => x.id === id) || CHANNELS[0];
  playing = ch.file ? startTrack(ch) : startTheme(c, musicGain, ch);
  if (!scheduler) scheduler = setInterval(() => playing && playing.tick(c.currentTime, c.currentTime + 0.6), 150);
  playing.tick(c.currentTime, c.currentTime + 0.6);
}

export const isMusicOn = () => !!playing;
export const getTheme = () => themeId;
export function setMusic(on) {
  if (on && !playing) play(themeId);
  else if (!on && playing) { playing.stop(); playing = null; clearInterval(scheduler); scheduler = null; }
  emit();
}
export function setTheme(id) {
  if (!CHANNELS.some(t => t.id === id)) return;
  themeId = id;
  try { localStorage.setItem(STORE, id); } catch (_) {}
  play(id); // choosing a channel also turns music on
  emit();
}
export function nextTheme() {
  const i = CHANNELS.findIndex(t => t.id === themeId);
  setTheme(CHANNELS[(i + 1) % CHANNELS.length].id);
}

// Test hook: render N seconds of a theme offline → { rms, peak } (used for level-matching, not by the site)
export async function renderOffline(id, seconds = 30, wantBuffer = false) {
  const sr = wantBuffer ? 44100 : 22050, c = new OfflineAudioContext(2, sr * seconds, sr);
  const th = THEMES.find(t => t.id === id);
  const p = startTheme(c, c.destination, th, 0);
  p.tick(0, seconds);
  const buf = await c.startRendering();
  if (wantBuffer) return buf;
  let sum = 0, peak = 0, n = 0;
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = sr * 4; i < d.length; i++) { const v = Math.abs(d[i]); sum += v * v; n++; if (v > peak) peak = v; } }
  return { rms: Math.sqrt(sum / n), peak };
}
