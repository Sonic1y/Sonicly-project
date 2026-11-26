/* =========================================================
   Sonicly — gerador de música de demonstração
   Cria as faixas de exemplo em tempo real com a Web Audio API
   (osciladores + ruído), a partir de uma "semente" por música.
   Assim o protótipo tem som sem precisar de ficheiros MP3.
   ========================================================= */

const Synth = (() => {
  const PRESETS = {
    lofi:       { bpm: 78,  scale: "minor", lead: "triangle", bass: "sine",     pad: "sine",     drums: "soft",    swing: 0.14, cutoff: 1700 },
    indie:      { bpm: 116, scale: "major", lead: "square",   bass: "triangle", pad: "triangle", drums: "rock",    swing: 0,    cutoff: 2400 },
    synthwave:  { bpm: 100, scale: "minor", lead: "sawtooth", bass: "sawtooth", pad: "sawtooth", drums: "pop",     swing: 0,    cutoff: 2000 },
    rock:       { bpm: 132, scale: "minor", lead: "sawtooth", bass: "square",   pad: "square",   drums: "rock",    swing: 0,    cutoff: 2800 },
    hiphop:     { bpm: 88,  scale: "minor", lead: "triangle", bass: "sine",     pad: "triangle", drums: "hiphop",  swing: 0.18, cutoff: 1900 },
    pop:        { bpm: 118, scale: "major", lead: "square",   bass: "triangle", pad: "triangle", drums: "pop",     swing: 0,    cutoff: 3000 },
    ambient:    { bpm: 66,  scale: "major", lead: "sine",     bass: "sine",     pad: "sine",     drums: "none",    swing: 0,    cutoff: 1300 },
    eletronica: { bpm: 124, scale: "minor", lead: "sawtooth", bass: "square",   pad: "sawtooth", drums: "house",   swing: 0,    cutoff: 2500 }
  };

  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
  const PROGRESSIONS = {
    major: [[0, 4, 5, 3], [0, 3, 4, 4], [0, 5, 3, 4], [3, 4, 0, 0]],
    minor: [[0, 5, 3, 6], [0, 3, 4, 0], [0, 6, 5, 6], [5, 3, 0, 4]]
  };
  const DRUMS = {
    soft:   { kick: [0, 10],        snare: [4, 12], hat: [0, 4, 8, 12],   snareVol: 0.12, hatVol: 0.03 },
    rock:   { kick: [0, 8, 10],     snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], snareVol: 0.28, hatVol: 0.05 },
    pop:    { kick: [0, 8],         snare: [4, 12], hat: [2, 6, 10, 14],  snareVol: 0.22, hatVol: 0.05 },
    hiphop: { kick: [0, 7, 10],     snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], snareVol: 0.25, hatVol: 0.04 },
    house:  { kick: [0, 4, 8, 12],  snare: [4, 12], hat: [2, 6, 10, 14],  snareVol: 0.18, hatVol: 0.07 }
  };

  let ctx = null;
  let out = null;
  let noise = null;
  let bus = null;
  let timer = null;
  let song = null;
  let startTime = 0;
  let nextStep = 0;

  function rng(seed) { // gerador pseudoaleatório determinístico (mulberry32)
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function init(audioCtx, destination) {
    ctx = audioCtx;
    out = destination;
    const len = ctx.sampleRate;
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  // Compõe a estrutura da música a partir da semente.
  function compose(track) {
    const p = PRESETS[track.genre] || PRESETS.pop;
    const r = rng(track.seed || 1);
    const scale = SCALES[p.scale];
    const progs = PROGRESSIONS[p.scale];
    const prog = progs[Math.floor(r() * progs.length)];
    const root = 40 + Math.floor(r() * 8);
    const bpm = p.bpm + Math.floor(r() * 9) - 4;
    const stepDur = 60 / bpm / 4;

    const melody = [];
    let deg = 7 + Math.floor(r() * 4);
    for (let i = 0; i < 32; i++) {
      const prob = i % 4 === 0 ? 0.6 : i % 2 === 0 ? 0.35 : 0.1;
      if (r() < prob) {
        deg += [-2, -1, -1, 0, 1, 1, 2][Math.floor(r() * 7)];
        deg = Math.max(5, Math.min(14, deg));
        melody.push(deg);
      } else melody.push(null);
    }

    const bass = [0, 8];
    [3, 6, 10, 11, 14].forEach((s) => { if (r() < 0.35) bass.push(s); });

    return { p, scale, prog, root, stepDur, melody, bass, drums: DRUMS[p.drums] || null };
  }

  function degToMidi(s, deg, octave) {
    const o = Math.floor(deg / 7);
    const idx = ((deg % 7) + 7) % 7;
    return s.root + 12 * (octave + o) + s.scale[idx];
  }

  /* ---------- Instrumentos ---------- */
  function tone(midi, t, dur, type, vol, attack, cutoff) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = mtof(midi);
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    filter.Q.value = 0.8;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.05));
    osc.connect(filter).connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.1);
  }

  function kick(t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.85, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  function noiseHit(t, vol, freq, len) {
    const src = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = noise;
    f.type = "highpass";
    f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + len + 0.02);
  }

  /* ---------- Sequenciador ---------- */
  function stepTime(step) {
    const s = song;
    const swing = step % 2 === 1 ? s.p.swing * s.stepDur : 0;
    return startTime + step * s.stepDur + swing;
  }

  function playStep(step, t) {
    const s = song;
    const bar = Math.floor(step / 16);
    const i = step % 16;
    const chord = s.prog[bar % 4];
    const totalBars = Math.ceil(s.duration / (s.stepDur * 16));
    const intro = bar < 2;
    const outro = bar >= totalBars - 1;
    const sectionB = Math.floor(bar / 4) % 2 === 1;
    const barDur = s.stepDur * 16;
    const ambient = s.p.drums === "none";

    if (i === 0) {
      [0, 2, 4].forEach((k) => tone(degToMidi(s, chord + k, 1), t, barDur, s.p.pad, ambient ? 0.06 : 0.035, ambient ? 1.2 : 0.25, s.p.cutoff * 0.6));
    }
    if (!intro && s.bass.includes(i)) {
      tone(degToMidi(s, chord, 0), t, s.stepDur * 1.8, s.p.bass, 0.2, 0.005, 900);
    }
    const arpEvery = ambient ? 4 : 2;
    if (!intro && !sectionB && i % arpEvery === 0) {
      const off = [0, 2, 4, 7][(i / arpEvery) % 4];
      tone(degToMidi(s, chord + off, 2), t, s.stepDur * 1.6, s.p.lead, ambient ? 0.035 : 0.04, 0.01, s.p.cutoff);
    }
    if (sectionB) {
      const m = s.melody[(bar % 2) * 16 + i];
      if (m !== null) tone(degToMidi(s, m, 2), t, s.stepDur * (ambient ? 4 : 1.9), s.p.lead, 0.07, ambient ? 0.2 : 0.01, s.p.cutoff);
    }
    if (s.drums && !intro && !outro) {
      if (s.drums.kick.includes(i)) kick(t);
      if (s.drums.snare.includes(i)) noiseHit(t, s.drums.snareVol, 1300, 0.18);
      if (s.drums.hat.includes(i)) noiseHit(t, s.drums.hatVol, 7000, 0.05);
    }
  }

  function tick() {
    if (!song) return;
    const lookahead = document.hidden ? 1.6 : 0.15;
    const end = startTime + song.duration;
    while (stepTime(nextStep) < ctx.currentTime + lookahead && stepTime(nextStep) < end - 0.05) {
      playStep(nextStep, Math.max(stepTime(nextStep), ctx.currentTime));
      nextStep++;
    }
  }

  // Começa a tocar a faixa a partir de "offset" segundos.
  function start(track, offset) {
    stop();
    song = compose(track);
    song.duration = track.duration;
    offset = Math.max(0, Math.min(offset || 0, song.duration - 0.1));

    bus = ctx.createGain();
    bus.connect(out);
    startTime = ctx.currentTime - offset + 0.05;
    nextStep = Math.ceil(offset / song.stepDur);

    // fade-in curto e fade-out nos últimos 3 segundos
    const now = ctx.currentTime;
    const end = startTime + song.duration;
    bus.gain.setValueAtTime(0, now);
    bus.gain.linearRampToValueAtTime(1, now + 0.08);
    if (end - 3 > now + 0.1) {
      bus.gain.setValueAtTime(1, end - 3);
      bus.gain.linearRampToValueAtTime(0, end);
    }

    tick();
    timer = setInterval(tick, 25);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    if (bus) {
      const b = bus;
      const now = ctx.currentTime;
      b.gain.cancelScheduledValues(now);
      b.gain.setValueAtTime(b.gain.value, now);
      b.gain.linearRampToValueAtTime(0, now + 0.05);
      setTimeout(() => b.disconnect(), 150);
    }
    bus = null;
    song = null;
  }

  function position() { return ctx && song ? Math.max(0, ctx.currentTime - startTime) : 0; }

  return { init, start, stop, position, PRESETS };
})();
