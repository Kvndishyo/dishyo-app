// Sons d'interaction gourmands, synthétisés (aucun fichier à charger).
export type SoundName = "pop" | "sizzle" | "clink" | "bubble" | "ding";

const KEY = "dishyo:sounds:v1";
let ctx: AudioContext | null = null;

export function soundsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) !== "off";
}
export function setSoundsEnabled(on: boolean) {
  localStorage.setItem(KEY, on ? "on" : "off");
}

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as any).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, vol = 0.15, endFreq?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, c.currentTime + start + dur);
  g.gain.setValueAtTime(vol, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.02);
}

function noise(c: AudioContext, dur: number, vol = 0.08) {
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.3 ? 1 : 0.2);
  const s = c.createBufferSource();
  s.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "highpass"; f.frequency.value = 3000;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  s.connect(f).connect(g).connect(c.destination);
  s.start();
}

/** Joue un son seulement si activé. `isPlus` : les sons sont un avantage Dishyo+. */
export function playSound(name: SoundName, isPlus: boolean) {
  if (!isPlus || !soundsEnabled()) return;
  const c = ac();
  if (!c) return;
  try {
    switch (name) {
      case "pop": tone(c, 600, 0, 0.12, "sine", 0.2, 1200); break; // bouchon / réaction
      case "bubble": tone(c, 300, 0, 0.08, "sine", 0.15, 700); tone(c, 450, 0.08, 0.08, "sine", 0.12, 900); break; // commentaire, message
      case "clink": tone(c, 2100, 0, 0.35, "triangle", 0.1); tone(c, 2800, 0.02, 0.3, "triangle", 0.06); break; // trinquer
      case "sizzle": noise(c, 0.45); break; // poêle qui grésille
      case "ding": tone(c, 1320, 0, 0.5, "sine", 0.15); tone(c, 1760, 0.12, 0.6, "sine", 0.1); break; // minuteur / publication
    }
  } catch {}
}
