/* =========================================================
   Sonicly — armazenamento de dados
   Protótipo sem servidor: tudo é guardado no localStorage
   do navegador. Numa versão futura, estas funções seriam
   substituídas por pedidos a uma API / base de dados.
   ========================================================= */

const Store = (() => {
  const KEY = "sonicly-db-v1";
  // Contas com acesso ao painel de administração.
  const ADMINS = ["mylifeshooter23"];
  const sessionAudio = new Map(); // áudio carregado que não coube no armazenamento

  const empty = () => ({
    seededAt: Date.now(),
    users: {},
    session: null,
    posts: [],
    tracks: [],
    likes: {},
    comments: {},
    lib: {},
    hiddenPosts: [],
    settings: { theme: "dark", volume: 0.8 }
  });

  let db = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(empty(), JSON.parse(raw));
    } catch (e) { /* armazenamento indisponível: usa memória */ }
    return empty();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
      return true;
    } catch (e) {
      return false;
    }
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignora */ }
    db = empty();
  }

  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- Palavras-passe ---------- */
  async function hash(text) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("sonicly:" + text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    let h = 0; // alternativa simples se o navegador não suportar SHA-256
    for (const c of "sonicly:" + text) h = (h * 31 + c.charCodeAt(0)) | 0;
    return "x" + h.toString(16);
  }

  /* ---------- Utilizadores ---------- */
  function user(username) {
    if (db.users[username]) return db.users[username];
    const a = SAMPLE_ARTISTS.find((x) => x.username === username);
    return a ? Object.assign({ sample: true, avatar: null }, a) : null;
  }

  function currentUser() {
    return db.session ? db.users[db.session] || null : null;
  }

  function validUsername(u) { return /^[a-z0-9_.]{3,20}$/.test(u); }

  async function register({ name, username, email, password }) {
    username = (username || "").trim().toLowerCase();
    if (!name || name.trim().length < 2) throw new Error("Escreve o teu nome.");
    if (!validUsername(username)) throw new Error("O nome de utilizador deve ter 3–20 caracteres (letras minúsculas, números, _ ou .).");
    if (user(username) || ["convidado", "editar", "admin"].includes(username)) throw new Error("Esse nome de utilizador já existe.");
    if (!/^\S+@\S+\.\S+$/.test(email || "")) throw new Error("Email inválido.");
    if (!password || password.length < 6) throw new Error("A palavra-passe precisa de pelo menos 6 caracteres.");
    db.users[username] = {
      username, name: name.trim(), email: email.trim(),
      passHash: await hash(password),
      bio: "", color: "#30d5c8", avatar: null, createdAt: Date.now()
    };
    db.session = username;
    save();
    return db.users[username];
  }

  async function login(username, password) {
    username = (username || "").trim().toLowerCase();
    const u = db.users[username];
    if (!u || u.guest || u.passHash !== (await hash(password || ""))) {
      throw new Error("Nome de utilizador ou palavra-passe incorretos.");
    }
    db.session = username;
    save();
    return u;
  }

  function loginGuest() {
    if (!db.users.convidado) {
      db.users.convidado = {
        username: "convidado", name: "Convidado", email: "", guest: true,
        bio: "A explorar música nova no Sonicly.", color: "#30d5c8", avatar: null, createdAt: Date.now()
      };
    }
    db.session = "convidado";
    save();
  }

  function logout() { db.session = null; save(); }

  function updateProfile(patch) {
    const u = currentUser();
    if (!u) return;
    Object.assign(u, patch);
    return save();
  }

  /* ---------- Músicas ---------- */
  function allTracks() { return SAMPLE_TRACKS.concat(db.tracks); }

  function track(id) {
    return SAMPLE_TRACKS.find((t) => t.id === id) || db.tracks.find((t) => t.id === id) || null;
  }

  function trackAudio(t) {
    return t.audio || sessionAudio.get(t.id) || null;
  }

  /* ---------- Publicações ---------- */
  function allPosts() {
    const sample = SAMPLE_POSTS.map((p) => {
      const t = track(p.trackId);
      return { id: p.id, trackId: p.trackId, author: t.artist, text: p.text, createdAt: db.seededAt - p.ago, baseLikes: p.likes };
    });
    return sample.concat(db.posts)
      .filter((p) => !db.hiddenPosts.includes(p.id))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  // Cria uma música + publicação do utilizador atual.
  async function publish({ title, genre, desc, file }) {
    const me = currentUser();
    const t = {
      id: uid("t"), title: title.trim(), artist: me.username, genre,
      seed: Math.floor(Math.random() * 1000) + 200,
      duration: 50, colors: Math.floor(Math.random() * COVER_COLORS.length),
      audio: null, audioName: null
    };
    let stored = true;
    if (file) {
      t.audioName = file.name;
      t.duration = null; // é lida do ficheiro quando tocar
      if (file.size <= 2.5 * 1024 * 1024) {
        t.audio = await readFileAsDataURL(file);
      }
      db.tracks.push(t);
      if (!t.audio || !save()) {
        // ficheiro grande demais para o localStorage: fica só nesta sessão
        t.audio = null;
        sessionAudio.set(t.id, URL.createObjectURL(file));
        stored = false;
      }
    } else {
      db.tracks.push(t);
    }
    db.posts.push({ id: uid("p"), trackId: t.id, author: me.username, text: (desc || "").trim(), createdAt: Date.now(), baseLikes: 0 });
    save();
    return { track: t, stored };
  }

  function deletePost(postId, asAdmin) {
    const p = db.posts.find((x) => x.id === postId);
    if (!p || (p.author !== db.session && !(asAdmin && isAdmin()))) return;
    db.posts = db.posts.filter((x) => x.id !== postId);
    db.tracks = db.tracks.filter((t) => t.id !== p.trackId);
    delete db.likes[postId];
    delete db.comments[postId];
    Object.values(db.lib).forEach((l) => {
      l.favorites = l.favorites.filter((id) => id !== p.trackId);
      l.playlists.forEach((pl) => { pl.trackIds = pl.trackIds.filter((id) => id !== p.trackId); });
    });
    save();
  }

  /* ---------- Gostos e comentários ---------- */
  function likeCount(post) { return (post.baseLikes || 0) + (db.likes[post.id] || []).length; }
  function isLiked(postId) { return (db.likes[postId] || []).includes(db.session); }

  function toggleLike(postId) {
    const list = db.likes[postId] || (db.likes[postId] = []);
    const i = list.indexOf(db.session);
    if (i >= 0) list.splice(i, 1); else list.push(db.session);
    save();
    return i < 0;
  }

  function comments(postId) {
    const base = (SAMPLE_COMMENTS[postId] || []).map((c, i) => ({ id: postId + "c" + i, user: c.user, text: c.text, createdAt: db.seededAt - (i + 1) * 1800 * 1000 }));
    return base.concat(db.comments[postId] || []);
  }

  function addComment(postId, text) {
    text = text.trim();
    if (!text) return null;
    const c = { id: uid("c"), user: db.session, text: text.slice(0, 300), createdAt: Date.now() };
    (db.comments[postId] || (db.comments[postId] = [])).push(c);
    save();
    return c;
  }

  /* ---------- Biblioteca ---------- */
  function lib() {
    const u = db.session;
    if (!db.lib[u]) db.lib[u] = { favorites: [], playlists: [], drafts: [] };
    return db.lib[u];
  }

  function isFavorite(trackId) { return !!db.session && lib().favorites.includes(trackId); }

  function toggleFavorite(trackId) {
    const f = lib().favorites;
    const i = f.indexOf(trackId);
    if (i >= 0) f.splice(i, 1); else f.unshift(trackId);
    save();
    return i < 0;
  }

  function createPlaylist(name) {
    const pl = { id: uid("pl"), name: name.trim().slice(0, 40), trackIds: [], createdAt: Date.now() };
    lib().playlists.push(pl);
    save();
    return pl;
  }

  function addToPlaylist(plId, trackId) {
    const pl = lib().playlists.find((p) => p.id === plId);
    if (!pl) return false;
    if (pl.trackIds.includes(trackId)) return false;
    pl.trackIds.push(trackId);
    save();
    return true;
  }

  function removeFromPlaylist(plId, trackId) {
    const pl = lib().playlists.find((p) => p.id === plId);
    if (pl) { pl.trackIds = pl.trackIds.filter((id) => id !== trackId); save(); }
  }

  function deletePlaylist(plId) {
    lib().playlists = lib().playlists.filter((p) => p.id !== plId);
    save();
  }

  function saveDraft(d) {
    const drafts = lib().drafts;
    const existing = d.id && drafts.find((x) => x.id === d.id);
    if (existing) Object.assign(existing, d, { updatedAt: Date.now() });
    else drafts.unshift(Object.assign({}, d, { id: uid("d"), updatedAt: Date.now() }));
    save();
  }

  function deleteDraft(id) {
    lib().drafts = lib().drafts.filter((d) => d.id !== id);
    save();
  }

  /* ---------- Administração ---------- */
  function isAdmin(username) {
    const u = username || db.session;
    return !!u && ADMINS.includes(u) && !!db.users[u];
  }

  function requireAdmin() {
    if (!isAdmin()) throw new Error("Sem permissão de administrador.");
  }

  function adminUsers() {
    return Object.values(db.users).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  function adminUpdateUser(username, { name, email, bio }) {
    requireAdmin();
    const u = db.users[username];
    if (!u) throw new Error("Utilizador não encontrado.");
    if (!name || name.trim().length < 2) throw new Error("O nome precisa de pelo menos 2 caracteres.");
    if (!u.guest && !/^\S+@\S+\.\S+$/.test(email || "")) throw new Error("Email inválido.");
    Object.assign(u, { name: name.trim(), email: (email || "").trim(), bio: (bio || "").trim() });
    save();
  }

  async function adminSetPassword(username, password) {
    requireAdmin();
    const u = db.users[username];
    if (!u || u.guest) throw new Error("Esta conta não usa palavra-passe.");
    if (!password || password.length < 6) throw new Error("A palavra-passe precisa de pelo menos 6 caracteres.");
    u.passHash = await hash(password);
    save();
  }

  function adminDeleteUser(username) {
    requireAdmin();
    if (username === db.session) throw new Error("Não podes apagar a tua própria conta aqui.");
    if (!db.users[username]) return;
    db.posts.filter((p) => p.author === username).forEach((p) => {
      delete db.likes[p.id];
      delete db.comments[p.id];
    });
    const trackIds = db.tracks.filter((t) => t.artist === username).map((t) => t.id);
    db.posts = db.posts.filter((p) => p.author !== username);
    db.tracks = db.tracks.filter((t) => t.artist !== username);
    Object.keys(db.likes).forEach((k) => { db.likes[k] = db.likes[k].filter((u) => u !== username); });
    Object.keys(db.comments).forEach((k) => { db.comments[k] = db.comments[k].filter((c) => c.user !== username); });
    Object.values(db.lib).forEach((l) => {
      l.favorites = l.favorites.filter((id) => !trackIds.includes(id));
      l.playlists.forEach((pl) => { pl.trackIds = pl.trackIds.filter((id) => !trackIds.includes(id)); });
    });
    delete db.lib[username];
    delete db.users[username];
    save();
  }

  // Remove uma publicação: as dos utilizadores são apagadas; as de exemplo ficam ocultas.
  function adminRemovePost(postId) {
    requireAdmin();
    if (db.posts.some((p) => p.id === postId)) deletePost(postId, true);
    else if (!db.hiddenPosts.includes(postId)) { db.hiddenPosts.push(postId); save(); }
  }

  function adminRestoreSamplePosts() {
    requireAdmin();
    db.hiddenPosts = [];
    save();
  }

  function adminDeleteComment(postId, commentId) {
    requireAdmin();
    db.comments[postId] = (db.comments[postId] || []).filter((c) => c.id !== commentId);
    save();
  }

  // Todos os comentários feitos por utilizadores (os de exemplo não contam).
  function adminComments() {
    const out = [];
    Object.entries(db.comments).forEach(([postId, list]) => list.forEach((c) => out.push(Object.assign({ postId }, c))));
    return out.sort((a, b) => b.createdAt - a.createdAt);
  }

  /* ---------- Definições ---------- */
  function settings() { return db.settings; }
  function setSetting(k, v) { db.settings[k] = v; save(); }

  return {
    get db() { return db; },
    save, reset, user, currentUser, register, login, loginGuest, logout, updateProfile,
    allTracks, track, trackAudio, allPosts, publish, deletePost,
    likeCount, isLiked, toggleLike, comments, addComment,
    lib, isFavorite, toggleFavorite, createPlaylist, addToPlaylist, removeFromPlaylist, deletePlaylist,
    saveDraft, deleteDraft, settings, setSetting,
    isAdmin, adminUsers, adminUpdateUser, adminSetPassword, adminDeleteUser,
    adminRemovePost, adminRestoreSamplePosts, adminDeleteComment, adminComments
  };
})();
