/* =========================================================
   Sonicly — leitor de áudio
   Fica fixo no fundo do ecrã e continua a tocar enquanto o
   utilizador navega, porque o site é uma "single page app"
   (as páginas mudam sem recarregar).
   Toca ficheiros carregados (<audio>) ou faixas geradas (synth.js).
   ========================================================= */

const Player = (() => {
  const audio = new Audio();
  audio.preload = "metadata";

  let ctx = null;
  let master = null;
  let analyser = null;
  const listeners = [];

  const state = {
    queue: [],
    index: -1,
    playing: false,
    mode: null,      // "synth" | "audio"
    pos: 0,          // posição guardada quando está em pausa (synth)
    duration: 0,
    shuffle: false,
    repeat: false,
    volume: Store.settings().volume ?? 0.8
  };

  const $ = (id) => document.getElementById(id);

  function ensureContext() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = state.volume;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(analyser).connect(ctx.destination);
    ctx.createMediaElementSource(audio).connect(master);
    Synth.init(ctx, master);
  }

  function emit() { listeners.forEach((fn) => fn(state)); }

  const current = () => (state.index >= 0 ? Store.track(state.queue[state.index]) : null);

  function time() {
    if (state.mode === "audio") return audio.currentTime || 0;
    if (state.mode === "synth" && state.playing) return Synth.position();
    return state.pos;
  }

  function stopAll() {
    Synth.stop();
    audio.pause();
  }

  function load(index) {
    stopAll();
    state.index = index;
    state.pos = 0;
    const t = current();
    if (!t) return;
    const src = Store.trackAudio(t);
    if (src) {
      state.mode = "audio";
      state.duration = 0;
      audio.src = src;
    } else if (t.audioName) {
      // ficheiro grande que só existia na sessão anterior
      state.mode = "synth";
      state.duration = 50;
      UIkit.notification({ message: "O ficheiro original desta música já não está disponível; a tocar uma versão gerada.", pos: "bottom-center", timeout: 3500 });
    } else {
      state.mode = "synth";
      state.duration = t.duration;
    }
  }

  function play() {
    const t = current();
    if (!t) return;
    ensureContext();
    ctx.resume();
    if (state.mode === "audio") {
      audio.play().catch(() => {
        state.playing = false;
        emit();
      });
    } else {
      Synth.start(Object.assign({}, t, { duration: state.duration }), state.pos);
    }
    state.playing = true;
    updateMediaSession(t);
    emit();
  }

  function pause() {
    if (state.mode === "synth") state.pos = Synth.position();
    stopAll();
    state.playing = false;
    emit();
  }

  function toggle() {
    if (!current()) {
      const first = Store.allPosts()[0];
      if (first) playTrack(first.trackId, Store.allPosts().map((p) => p.trackId));
      return;
    }
    state.playing ? pause() : play();
  }

  // Toca uma faixa. "queue" é a lista que se segue (feed, playlist, etc.).
  function playTrack(trackId, queue) {
    if (current() && current().id === trackId && (!queue || queue[state.index] === trackId)) {
      toggle();
      return;
    }
    state.queue = queue && queue.length ? queue.slice() : [trackId];
    const i = state.queue.indexOf(trackId);
    load(i >= 0 ? i : 0);
    play();
  }

  function next(auto) {
    if (!state.queue.length) return;
    let i;
    if (state.shuffle && state.queue.length > 1) {
      do { i = Math.floor(Math.random() * state.queue.length); } while (i === state.index);
    } else {
      i = state.index + 1;
      if (i >= state.queue.length) {
        if (!state.repeat && auto) {
          stopAll();
          state.playing = false;
          state.pos = 0;
          emit();
          return;
        }
        i = 0;
      }
    }
    load(i);
    play();
  }

  function prev() {
    if (time() > 3 || state.queue.length < 2) { seek(0); return; }
    load((state.index - 1 + state.queue.length) % state.queue.length);
    play();
  }

  function seek(seconds) {
    seconds = Math.max(0, Math.min(seconds, state.duration || 0));
    if (state.mode === "audio") {
      audio.currentTime = seconds;
    } else {
      state.pos = seconds;
      if (state.playing) Synth.start(Object.assign({}, current(), { duration: state.duration }), seconds);
    }
  }

  function setVolume(v) {
    state.volume = v;
    if (master) master.gain.value = v;
    Store.setSetting("volume", v);
  }

  /* ---------- Integração com o sistema (teclas multimédia, ecrã bloqueado) ---------- */
  function updateMediaSession(t) {
    if (!("mediaSession" in navigator)) return;
    const artist = Store.user(t.artist);
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: artist ? artist.name : t.artist, album: "Sonicly" });
  }
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("play", play);
      navigator.mediaSession.setActionHandler("pause", pause);
      navigator.mediaSession.setActionHandler("nexttrack", () => next());
      navigator.mediaSession.setActionHandler("previoustrack", prev);
    } catch (e) { /* não suportado */ }
  }

  /* ---------- Eventos do elemento <audio> ---------- */
  audio.addEventListener("loadedmetadata", () => { state.duration = audio.duration || 0; emit(); });
  audio.addEventListener("ended", () => next(true));
  audio.addEventListener("error", () => {
    if (state.mode === "audio" && audio.src) {
      UIkit.notification({ message: "Não foi possível tocar este ficheiro.", status: "danger", pos: "bottom-center" });
      state.playing = false;
      emit();
    }
  });

  // Faixas geradas: verifica quando chegam ao fim (também com o separador em segundo plano).
  setInterval(() => {
    if (state.playing && state.mode === "synth" && Synth.position() >= state.duration) next(true);
  }, 250);

  /* ---------- Interface do leitor ---------- */
  const fmt = (s) => {
    s = Math.max(0, Math.floor(s || 0));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  };

  function setFill(input) {
    const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty("--fill", pct + "%");
  }

  let seeking = false;

  function bindUI() {
    const seek$ = $("pl-seek");
    const vol$ = $("pl-vol");

    $("pl-play").addEventListener("click", toggle);
    $("pl-next").addEventListener("click", () => next());
    $("pl-prev").addEventListener("click", prev);
    $("pl-shuffle").addEventListener("click", () => { state.shuffle = !state.shuffle; emit(); });
    $("pl-repeat").addEventListener("click", () => { state.repeat = !state.repeat; emit(); });
    $("pl-fav").addEventListener("click", () => {
      const t = current();
      if (!t) return;
      const on = Store.toggleFavorite(t.id);
      UIkit.notification({ message: on ? "Adicionada aos favoritos" : "Removida dos favoritos", pos: "bottom-center", timeout: 1600 });
      emit();
    });

    seek$.addEventListener("input", () => { seeking = true; setFill(seek$); $("pl-time").textContent = fmt((seek$.value / 1000) * state.duration); });
    seek$.addEventListener("change", () => { seek((seek$.value / 1000) * state.duration); seeking = false; });

    vol$.value = Math.round(state.volume * 100);
    setFill(vol$);
    vol$.addEventListener("input", () => { setVolume(vol$.value / 100); setFill(vol$); });

    // atalho: barra de espaços para tocar/pausar
    document.addEventListener("keydown", (e) => {
      if (e.code !== "Space" || document.body.classList.contains("auth-mode")) return;
      if (/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName)) return;
      e.preventDefault();
      toggle();
    });

    onChange(renderBar);
    renderBar();
    loop();
  }

  function renderBar() {
    const t = current();
    const playBtn = $("pl-play");
    playBtn.innerHTML = `<span uk-icon="icon: ${state.playing ? "pause" : "play"}; ratio: 1.3"></span>`;
    playBtn.setAttribute("aria-label", state.playing ? "Pausar" : "Tocar");
    $("pl-shuffle").classList.toggle("on", state.shuffle);
    $("pl-repeat").classList.toggle("on", state.repeat);
    const fav = $("pl-fav");
    fav.classList.toggle("on", !!t && Store.isFavorite(t.id));
    fav.style.visibility = t ? "visible" : "hidden";

    if (!t) return;
    const artist = Store.user(t.artist);
    $("pl-title").textContent = t.title;
    const a = $("pl-artist");
    a.textContent = artist ? artist.name : t.artist;
    a.href = "#/perfil/" + t.artist;
    const cover = $("pl-cover");
    cover.style.background = Views.coverBg(t);
    cover.textContent = Views.initials(t.title);
    $("pl-dur").textContent = fmt(state.duration);
    document.title = (state.playing ? "▶ " : "") + t.title + " — Sonicly";
  }

  function loop() {
    const seek$ = $("pl-seek");
    if (!seeking && current()) {
      const now = time();
      seek$.value = state.duration ? Math.min(1000, (now / state.duration) * 1000) : 0;
      setFill(seek$);
      $("pl-time").textContent = fmt(now);
      $("pl-dur").textContent = fmt(state.duration);
    }
    drawViz();
    requestAnimationFrame(loop);
  }

  const vizData = new Uint8Array(32);
  function drawViz() {
    const c = $("pl-viz");
    if (!c || c.offsetParent === null) return;
    const g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height);
    if (analyser && state.playing) analyser.getByteFrequencyData(vizData); else vizData.fill(0);
    g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#30d5c8";
    const bars = 16;
    const w = c.width / bars;
    for (let i = 0; i < bars; i++) {
      const v = vizData[i + 1] / 255;
      const h = Math.max(2, v * c.height);
      g.fillRect(i * w + 1, c.height - h, w - 2, h);
    }
  }

  function onChange(fn) { listeners.push(fn); }

  return {
    state, bindUI, playTrack, toggle, next, prev, seek, onChange,
    get currentId() { const t = current(); return t ? t.id : null; },
    stop() { stopAll(); state.playing = false; state.queue = []; state.index = -1; emit(); }
  };
})();
