/* =========================================================
   Sonicly — páginas (vistas)
   Cada função devolve o HTML de uma página. Os cliques são
   tratados em app.js através de atributos data-action.
   ========================================================= */

const Views = (() => {
  /* ---------- Utilitários ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const genreName = (id) => (GENRES.find((g) => g.id === id) || { name: id }).name;

  function coverBg(t) {
    const [a, b] = COVER_COLORS[t.colors % COVER_COLORS.length];
    return `linear-gradient(135deg, ${a}, ${b})`;
  }

  function initials(text) {
    return String(text || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  }

  function timeAgo(ts) {
    const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return "agora mesmo";
    const m = Math.floor(s / 60);
    if (m < 60) return `há ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `há ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 30) return `há ${d} ${d === 1 ? "dia" : "dias"}`;
    return new Date(ts).toLocaleDateString("pt-PT");
  }

  const fmtDur = (s) => (s ? Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0") : "—");

  function avatar(u, cls = "") {
    if (!u) return `<span class="avatar ${cls}">?</span>`;
    if (u.avatar) return `<span class="avatar ${cls}" style="background-image:url('${u.avatar}')" role="img" aria-label="${esc(u.name)}"></span>`;
    return `<span class="avatar ${cls}" style="background:${esc(u.color || "#30d5c8")}" aria-hidden="true">${esc(initials(u.name))}</span>`;
  }

  function cover(t, size, queue) {
    const playing = Player.currentId === t.id && Player.state.playing;
    const q = queue ? esc(queue.join(",")) : "";
    return `<div class="cover ${size} ${playing ? "playing" : ""}" style="background:${coverBg(t)}">
      ${esc(initials(t.title))}
      <button class="cover-play" data-action="play" data-track="${t.id}" data-queue="${q}" aria-label="${playing ? "Pausar" : "Tocar"} ${esc(t.title)}">
        <span uk-icon="icon: ${playing ? "pause" : "play"}; ratio: 1.4"></span>
      </button>
    </div>`;
  }

  const empty = (icon, title, text, extra = "") => `
    <div class="empty">
      <span uk-icon="icon: ${icon}; ratio: 2"></span>
      <h3>${title}</h3>
      <p>${text}</p>${extra}
    </div>`;

  /* ---------- Login e registo ---------- */
  function authShell(inner) {
    return `<section class="auth">
      <div class="auth-hero">
        <a class="brand" href="#/login"><img src="assets/logo.svg" alt="" width="34" height="34"><span>Sonicly</span></a>
        <div>
          <h1>A tua música merece ser ouvida.</h1>
          <p>Publica as tuas músicas, recebe gostos e comentários de ouvintes reais e descobre novos artistas independentes.</p>
        </div>
        <div class="hero-bars" aria-hidden="true">
          ${Array.from({ length: 24 }, (_, i) => `<span style="animation-delay:${(i * 0.13) % 1.2}s"></span>`).join("")}
        </div>
      </div>
      <div class="auth-panel"><div class="auth-card">${inner}</div></div>
    </section>`;
  }

  function login() {
    return authShell(`
      <h2>Entrar</h2>
      <p class="muted">Bem-vindo de volta ao Sonicly.</p>
      <form id="login-form" class="form-stack" novalidate>
        <label>Nome de utilizador
          <input class="uk-input" name="username" autocomplete="username" required>
        </label>
        <label>Palavra-passe
          <input class="uk-input" type="password" name="password" autocomplete="current-password" required>
        </label>
        <p class="form-error" role="alert"></p>
        <button class="btn btn-accent btn-block" type="submit">Entrar</button>
        <div class="divider">ou</div>
        <button class="btn btn-ghost btn-block" type="button" data-action="guest">Explorar como convidado</button>
      </form>
      <p class="auth-switch">Ainda não tens conta? <a href="#/registo">Cria uma conta</a></p>`);
  }

  function register() {
    return authShell(`
      <h2>Criar conta</h2>
      <p class="muted">Começa a partilhar a tua música em segundos.</p>
      <form id="register-form" class="form-stack" novalidate>
        <label>Nome (artista ou banda)
          <input class="uk-input" name="name" autocomplete="name" maxlength="40" required>
        </label>
        <label>Nome de utilizador
          <input class="uk-input" name="username" autocomplete="username" maxlength="20" placeholder="ex.: maria_beats" required>
        </label>
        <label>Email
          <input class="uk-input" type="email" name="email" autocomplete="email" required>
        </label>
        <label>Palavra-passe
          <input class="uk-input" type="password" name="password" autocomplete="new-password" minlength="6" required>
        </label>
        <p class="form-error" role="alert"></p>
        <button class="btn btn-accent btn-block" type="submit">Criar conta</button>
      </form>
      <p class="auth-switch">Já tens conta? <a href="#/login">Entrar</a></p>`);
  }

  /* ---------- Início (feed) ---------- */
  function home(filters) {
    const chips = [{ id: "", name: "Tudo" }].concat(GENRES).map((g) =>
      `<button class="chip ${filters.genre === g.id ? "active" : ""}" data-action="filter-genre" data-genre="${g.id}">${g.name}</button>`).join("");
    return `
      <div class="page-head">
        <h1>Início</h1>
        <div class="search">
          <span uk-icon="search"></span>
          <input class="uk-input" id="search" type="search" placeholder="Procurar músicas, artistas ou géneros" value="${esc(filters.query)}" aria-label="Procurar">
        </div>
      </div>
      <div class="chips" role="group" aria-label="Filtrar por género">${chips}</div>
      <div class="feed" id="feed">${feed(filters)}</div>`;
  }

  function filterPosts(posts, filters) {
    const q = (filters.query || "").trim().toLowerCase();
    return posts.filter((p) => {
      const t = Store.track(p.trackId);
      if (!t) return false;
      if (filters.genre && t.genre !== filters.genre) return false;
      if (!q) return true;
      const a = Store.user(p.author);
      return [t.title, a && a.name, p.author, genreName(t.genre), p.text].join(" ").toLowerCase().includes(q);
    });
  }

  function feed(filters) {
    const posts = filterPosts(Store.allPosts(), filters);
    if (!posts.length) return empty("search", "Sem resultados", "Experimenta outra pesquisa ou outro género.");
    const queue = posts.map((p) => p.trackId);
    return posts.map((p) => post(p, queue)).join("");
  }

  function post(p, queue, openComments = false) {
    const t = Store.track(p.trackId);
    const a = Store.user(p.author);
    const liked = Store.isLiked(p.id);
    const fav = Store.isFavorite(t.id);
    const comments = Store.comments(p.id);
    const me = Store.currentUser();
    return `<article class="post" data-post="${p.id}">
      <div class="post-head">
        ${avatar(a)}
        <div>
          <a href="#/perfil/${esc(p.author)}">${esc(a ? a.name : p.author)}</a>
          <small>@${esc(p.author)} · ${timeAgo(p.createdAt)}</small>
        </div>
        <span class="tag">${esc(genreName(t.genre))}</span>
      </div>
      <div class="post-track">
        ${cover(t, "cover-lg", queue)}
        <div>
          <h3>${esc(t.title)}</h3>
          ${p.text ? `<p>${esc(p.text)}</p>` : ""}
          ${t.audioName ? `<small class="muted"><span uk-icon="icon: file-text; ratio: .8"></span> ${esc(t.audioName)}</small>` : ""}
        </div>
      </div>
      <div class="post-actions">
        <button class="icon-btn ${liked ? "liked" : ""}" data-action="like" data-post="${p.id}" aria-pressed="${liked}">
          <span uk-icon="heart"></span> <span class="count">${Store.likeCount(p)}</span> <span class="label">gostos</span>
        </button>
        <button class="icon-btn" data-action="toggle-comments" data-post="${p.id}" aria-expanded="${openComments}">
          <span uk-icon="comment"></span> ${comments.length} <span class="label">${comments.length === 1 ? "comentário" : "comentários"}</span>
        </button>
        <span class="spacer"></span>
        <button class="icon-btn ${fav ? "on" : ""}" data-action="favorite" data-track="${t.id}" title="Favorito" aria-label="Favorito" aria-pressed="${fav}"><span uk-icon="bookmark"></span></button>
        <button class="icon-btn" data-action="add-to-playlist" data-track="${t.id}" title="Adicionar a playlist" aria-label="Adicionar a playlist"><span uk-icon="list"></span></button>
        ${me && p.author === me.username ? `<button class="icon-btn" data-action="delete-post" data-post="${p.id}" title="Apagar" aria-label="Apagar publicação"><span uk-icon="trash"></span></button>` : ""}
      </div>
      <div class="comments ${openComments ? "open" : ""}">
        ${comments.map((c) => { const u = Store.user(c.user); return `
          <div class="comment">
            ${avatar(u, "avatar-sm")}
            <div class="bubble"><strong>${esc(u ? u.name : c.user)}</strong> <small class="muted">${timeAgo(c.createdAt)}</small><p>${esc(c.text)}</p></div>
          </div>`; }).join("")}
        <form class="inline-form" data-form="comment" data-post="${p.id}">
          <input class="uk-input" name="text" maxlength="300" placeholder="Escreve um comentário..." aria-label="Comentário" required>
          <button class="btn btn-accent btn-sm" type="submit">Enviar</button>
        </form>
      </div>
    </article>`;
  }

  /* ---------- Lista de faixas ---------- */
  function trackRow(t, queue, extra = "") {
    const a = Store.user(t.artist);
    const playing = Player.currentId === t.id;
    return `<div class="track-row ${playing ? "playing" : ""} ${playing && !Player.state.playing ? "paused" : ""}">
      ${cover(t, "cover-sm", queue)}
      <div class="tr-info">
        <div class="tr-title">${esc(t.title)} ${playing ? '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>' : ""}</div>
        <div class="tr-sub"><a href="#/perfil/${esc(t.artist)}" class="muted">${esc(a ? a.name : t.artist)}</a> · ${esc(genreName(t.genre))}</div>
      </div>
      <span class="tr-time">${fmtDur(t.duration)}</span>
      <button class="icon-btn ${Store.isFavorite(t.id) ? "on" : ""}" data-action="favorite" data-track="${t.id}" aria-label="Favorito"><span uk-icon="bookmark"></span></button>
      ${extra}
    </div>`;
  }

  /* ---------- Biblioteca ---------- */
  const LIB_TABS = [
    { id: "favoritos", name: "Favoritos" },
    { id: "albuns", name: "Álbuns" },
    { id: "playlists", name: "Playlists" },
    { id: "rascunhos", name: "Rascunhos" }
  ];

  function library(tab, param) {
    const tabs = LIB_TABS.map((x) => `<li class="${tab === x.id || (tab === "album" && x.id === "albuns") || (tab === "playlist" && x.id === "playlists") ? "uk-active" : ""}"><a href="#/biblioteca/${x.id}">${x.name}</a></li>`).join("");
    let body = "";
    if (tab === "albuns") body = albums();
    else if (tab === "album") body = album(param);
    else if (tab === "playlists") body = playlists();
    else if (tab === "playlist") body = playlist(param);
    else if (tab === "rascunhos") body = drafts();
    else body = favorites();
    return `
      <div class="page-head"><h1>Biblioteca</h1></div>
      <ul class="uk-subnav uk-subnav-pill lib-tabs">${tabs}</ul>
      <div class="section">${body}</div>`;
  }

  function favorites() {
    const ids = Store.lib().favorites.filter((id) => Store.track(id));
    if (!ids.length) return empty("bookmark", "Ainda sem favoritos", "Carrega no ícone <span uk-icon=\"icon: bookmark; ratio: .8\"></span> de uma música para a guardares aqui.", `<a class="btn btn-accent" href="#/inicio">Explorar o feed</a>`);
    return `<div class="page-head"><h2>${ids.length} ${ids.length === 1 ? "música" : "músicas"}</h2>
      <button class="btn btn-accent btn-sm" data-action="play" data-track="${ids[0]}" data-queue="${ids.join(",")}"><span uk-icon="play"></span> Tocar tudo</button></div>
      <div class="track-list">${ids.map((id) => trackRow(Store.track(id), ids)).join("")}</div>`;
  }

  function albumList() {
    const list = SAMPLE_ARTISTS.map((a) => ({ id: a.username, title: a.album, artist: a, tracks: SAMPLE_TRACKS.filter((t) => t.artist === a.username) }));
    const me = Store.currentUser();
    const mine = Store.db.tracks.filter((t) => t.artist === me.username);
    if (mine.length) list.unshift({ id: me.username, title: "Os meus uploads", artist: me, tracks: mine });
    return list;
  }

  function albums() {
    return `<div class="card-grid">${albumList().map((al) => `
      <div class="card">
        ${cover(al.tracks[0], "", al.tracks.map((t) => t.id))}
        <div><h3><a href="#/biblioteca/album/${esc(al.id)}" style="color:inherit">${esc(al.title)}</a></h3>
        <p>${esc(al.artist.name)} · ${al.tracks.length} ${al.tracks.length === 1 ? "faixa" : "faixas"}</p></div>
      </div>`).join("")}</div>`;
  }

  function album(id) {
    const al = albumList().find((x) => x.id === id);
    if (!al) return empty("warning", "Álbum não encontrado", "", `<a class="btn btn-ghost" href="#/biblioteca/albuns">Voltar</a>`);
    const ids = al.tracks.map((t) => t.id);
    return `<a href="#/biblioteca/albuns" class="muted"><span uk-icon="arrow-left"></span> Álbuns</a>
      <div class="post-track" style="margin:16px 0 20px">
        ${cover(al.tracks[0], "cover-lg", ids)}
        <div><small class="muted">ÁLBUM</small><h2 style="margin:0">${esc(al.title)}</h2>
        <p><a href="#/perfil/${esc(al.artist.username)}">${esc(al.artist.name)}</a> · ${ids.length} ${ids.length === 1 ? "faixa" : "faixas"}</p></div>
      </div>
      <div class="track-list">${al.tracks.map((t) => trackRow(t, ids)).join("")}</div>`;
  }

  function playlists() {
    const pls = Store.lib().playlists;
    const form = `<form class="inline-form" data-form="new-playlist" style="max-width:420px;margin:0 0 20px">
      <input class="uk-input" name="name" maxlength="40" placeholder="Nome da nova playlist" aria-label="Nome da nova playlist" required>
      <button class="btn btn-accent" type="submit"><span uk-icon="plus"></span> Criar</button></form>`;
    if (!pls.length) return form + empty("list", "Ainda sem playlists", "Cria uma playlist e junta as tuas músicas preferidas.");
    return form + `<div class="card-grid">${pls.map((pl) => {
      const first = Store.track(pl.trackIds[0]);
      return `<div class="card">
        ${first ? cover(first, "", pl.trackIds) : `<div class="cover" style="background:var(--surface-2)"><span uk-icon="icon: list; ratio: 2"></span></div>`}
        <div><h3><a href="#/biblioteca/playlist/${pl.id}" style="color:inherit">${esc(pl.name)}</a></h3>
        <p>${pl.trackIds.length} ${pl.trackIds.length === 1 ? "música" : "músicas"}</p></div>
      </div>`; }).join("")}</div>`;
  }

  function playlist(id) {
    const pl = Store.lib().playlists.find((p) => p.id === id);
    if (!pl) return empty("warning", "Playlist não encontrada", "", `<a class="btn btn-ghost" href="#/biblioteca/playlists">Voltar</a>`);
    const ids = pl.trackIds.filter((x) => Store.track(x));
    return `<a href="#/biblioteca/playlists" class="muted"><span uk-icon="arrow-left"></span> Playlists</a>
      <div class="page-head" style="margin-top:16px">
        <div><small class="muted">PLAYLIST</small><h2 style="margin:0">${esc(pl.name)}</h2><p class="muted" style="margin:0">${ids.length} ${ids.length === 1 ? "música" : "músicas"}</p></div>
        <div style="display:flex;gap:8px">
          ${ids.length ? `<button class="btn btn-accent btn-sm" data-action="play" data-track="${ids[0]}" data-queue="${ids.join(",")}"><span uk-icon="play"></span> Tocar</button>` : ""}
          <button class="btn btn-danger btn-sm" data-action="delete-playlist" data-playlist="${pl.id}"><span uk-icon="trash"></span> Apagar</button>
        </div>
      </div>
      ${ids.length ? `<div class="track-list">${ids.map((x) => trackRow(Store.track(x), ids,
        `<button class="icon-btn" data-action="remove-from-playlist" data-playlist="${pl.id}" data-track="${x}" aria-label="Remover da playlist" title="Remover"><span uk-icon="close"></span></button>`)).join("")}</div>`
      : empty("list", "Playlist vazia", "Adiciona músicas a partir do feed com o ícone <span uk-icon=\"icon: list; ratio: .8\"></span>.")}`;
  }

  function drafts() {
    const list = Store.lib().drafts;
    if (!list.length) return empty("file-edit", "Sem rascunhos", "Quando guardares uma música como rascunho, ela aparece aqui.", `<button class="btn btn-accent" data-action="open-publish">Nova música</button>`);
    return `<div class="track-list" style="gap:10px">${list.map((d) => `
      <div class="draft-row">
        <span uk-icon="icon: file-edit; ratio: 1.3" class="muted"></span>
        <div class="tr-info">
          <div class="tr-title">${esc(d.title || "Sem título")}</div>
          <div class="tr-sub">${esc(genreName(d.genre))} · editado ${timeAgo(d.updatedAt)}</div>
        </div>
        <button class="btn btn-ghost btn-sm" data-action="edit-draft" data-draft="${d.id}">Continuar</button>
        <button class="icon-btn" data-action="delete-draft" data-draft="${d.id}" aria-label="Apagar rascunho"><span uk-icon="trash"></span></button>
      </div>`).join("")}</div>`;
  }

  /* ---------- Perfil ---------- */
  const PROFILE_COLORS = ["#30d5c8", "#1b4f72", "#7b2d8e", "#e4572e", "#f7c948", "#3a0ca3", "#2b8a3e", "#3d3d3d"];

  function profile(username, editing) {
    const me = Store.currentUser();
    const u = Store.user(username || me.username);
    if (!u) return empty("user", "Perfil não encontrado", "Este utilizador não existe.", `<a class="btn btn-ghost" href="#/inicio">Voltar ao início</a>`);
    const own = u.username === me.username;
    const posts = Store.allPosts().filter((p) => p.author === u.username);
    const likes = posts.reduce((n, p) => n + Store.likeCount(p), 0);
    const queue = posts.map((p) => p.trackId);

    const edit = own && editing ? `
      <div class="panel section">
        <h2>Editar perfil</h2>
        <form id="profile-form" class="form-stack" novalidate>
          <label>Foto de perfil <small class="muted">(imagem, será reduzida)</small>
            <input class="uk-input" type="file" name="avatar" accept="image/*">
          </label>
          ${u.avatar ? `<label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="removeAvatar"> Remover foto atual</label>` : ""}
          <label>Nome
            <input class="uk-input" name="name" maxlength="40" value="${esc(u.name)}" required>
          </label>
          <label>Biografia
            <textarea class="uk-textarea" name="bio" rows="3" maxlength="200">${esc(u.bio)}</textarea>
          </label>
          <fieldset style="border:0;padding:0;margin:0">
            <legend style="font-weight:500;margin-bottom:6px">Cor de fundo</legend>
            <div class="color-options">${PROFILE_COLORS.map((c) => `
              <label><input type="radio" name="color" value="${c}" ${u.color === c ? "checked" : ""}><span style="background:${c}" title="${c}"></span></label>`).join("")}
            </div>
          </fieldset>
          <p class="form-error" role="alert"></p>
          <div class="form-actions">
            <a class="btn btn-ghost" href="#/perfil">Cancelar</a>
            <button class="btn btn-accent" type="submit">Guardar</button>
          </div>
        </form>
      </div>` : "";

    return `
      <div class="profile-banner" style="background:linear-gradient(135deg, ${esc(u.color)}, ${esc(u.color)}99)"></div>
      <div class="profile-card">
        <div class="profile-top">
          ${avatar(u, "avatar-xl")}
          <div class="info">
            <h1>${esc(u.name)}</h1>
            <span class="muted">@${esc(u.username)}${u.guest ? " · conta de convidado" : ""}</span>
          </div>
          ${own && !editing ? `<a class="btn btn-ghost" href="#/perfil/editar"><span uk-icon="pencil"></span> Editar perfil</a>` : ""}
        </div>
        ${u.bio ? `<p class="profile-bio">${esc(u.bio)}</p>` : own ? `<p class="profile-bio muted">Ainda não escreveste uma biografia.</p>` : ""}
        <div class="stats">
          <div><strong>${posts.length}</strong><span>músicas</span></div>
          <div><strong>${likes}</strong><span>gostos</span></div>
          ${own ? `<div><strong>${Store.lib().favorites.length}</strong><span>favoritos</span></div>` : ""}
        </div>
      </div>
      ${edit}
      <div class="section">
        <h2>${own ? "As minhas músicas" : "Músicas"}</h2>
        <div class="feed">${posts.length ? posts.map((p) => post(p, queue)).join("") :
          own ? empty("upload", "Ainda não publicaste nada", "Publica a tua primeira música e recebe feedback.", `<button class="btn btn-accent" data-action="open-publish">Publicar música</button>`)
              : empty("album", "Sem músicas", "Este artista ainda não publicou nada.")}
        </div>
      </div>`;
  }

  /* ---------- Definições ---------- */
  function settings() {
    const me = Store.currentUser();
    const theme = Store.settings().theme;
    return `
      <div class="page-head"><h1>Definições</h1></div>
      <div class="settings">
        <div class="panel">
          <h2>Aparência</h2>
          <div class="setting-row">
            <div><strong>Tema</strong><p>Escolhe entre o modo escuro e o modo claro.</p></div>
            <div class="theme-switch" role="group" aria-label="Tema">
              <button class="theme-option ${theme === "dark" ? "active" : ""}" data-action="theme" data-theme-value="dark" aria-pressed="${theme === "dark"}"><span uk-icon="star"></span> Escuro</button>
              <button class="theme-option ${theme === "light" ? "active" : ""}" data-action="theme" data-theme-value="light" aria-pressed="${theme === "light"}"><span uk-icon="happy"></span> Claro</button>
            </div>
          </div>
        </div>

        ${Store.isAdmin() ? `
        <div class="panel">
          <h2>Administração</h2>
          <div class="setting-row">
            <div><strong>Painel de administração</strong><p>Gerir contas, publicações e comentários.</p></div>
            <a class="btn btn-accent" href="#/admin"><span uk-icon="lock"></span> Abrir</a>
          </div>
        </div>` : ""}

        ${me.guest ? `
        <div class="panel">
          <h2>Conta</h2>
          <div class="setting-row">
            <div><strong>Estás a usar uma conta de convidado</strong><p>Cria uma conta para publicares com o teu nome.</p></div>
            <button class="btn btn-accent" data-action="logout-to-register">Criar conta</button>
          </div>
        </div>` : `
        <div class="panel">
          <h2>Conta</h2>
          <form id="account-form" class="form-stack" novalidate>
            <label>Nome <input class="uk-input" name="name" maxlength="40" value="${esc(me.name)}" required></label>
            <label>Email <input class="uk-input" type="email" name="email" value="${esc(me.email)}" required></label>
            <p class="form-error" role="alert"></p>
            <div class="form-actions"><button class="btn btn-accent" type="submit">Guardar alterações</button></div>
          </form>
        </div>`}

        <div class="panel">
          <h2>Sessão</h2>
          <div class="setting-row">
            <div><strong>Terminar sessão</strong><p>Sessão iniciada como @${esc(me.username)}.</p></div>
            <button class="btn btn-ghost" data-action="logout"><span uk-icon="sign-out"></span> Sair</button>
          </div>
        </div>

        <div class="panel">
          <h2>Dados do protótipo</h2>
          <div class="setting-row">
            <div><strong>Apagar dados locais</strong><p>Remove contas, publicações e bibliotecas guardadas neste navegador.</p></div>
            <button class="btn btn-danger" data-action="reset">Apagar tudo</button>
          </div>
        </div>
        <p class="muted" style="font-size:.85rem">Sonicly · protótipo da PAP · os dados ficam guardados apenas neste navegador.</p>
      </div>`;
  }

  /* ---------- Administração ---------- */
  function admin() {
    const users = Store.adminUsers();
    const posts = Store.allPosts();
    const comments = Store.adminComments();
    const likesGiven = Object.values(Store.db.likes).reduce((n, l) => n + l.length, 0);
    const hidden = Store.db.hiddenPosts.length;
    const date = (ts) => (ts ? new Date(ts).toLocaleDateString("pt-PT") : "—");
    const postTitle = (id) => { const p = Store.allPosts().find((x) => x.id === id); const t = p && Store.track(p.trackId); return t ? t.title : "(publicação removida)"; };

    const userRows = users.map((u) => {
      const n = posts.filter((p) => p.author === u.username).length;
      const role = Store.isAdmin(u.username) ? `<span class="tag">admin</span>` : u.guest ? `<span class="tag tag-muted">convidado</span>` : "";
      return `<tr>
        <td><div class="cell-user">${avatar(u, "avatar-sm")}<div><strong>${esc(u.name)}</strong> ${role}<small>@${esc(u.username)}</small></div></div></td>
        <td>${u.email ? esc(u.email) : '<span class="muted">—</span>'}</td>
        <td><span class="muted" title="As palavras-passe são guardadas encriptadas (hash) e não podem ser vistas.">${u.guest ? "sem palavra-passe" : "•••••••• (protegida)"}</span></td>
        <td>${date(u.createdAt)}</td>
        <td>${n}</td>
        <td class="cell-actions">
          <button class="btn btn-ghost btn-sm" data-action="admin-edit-user" data-user="${esc(u.username)}"><span uk-icon="icon: pencil; ratio: .8"></span> Editar</button>
          ${u.username !== Store.db.session ? `<button class="icon-btn" data-action="admin-delete-user" data-user="${esc(u.username)}" aria-label="Apagar ${esc(u.username)}" title="Apagar conta"><span uk-icon="trash"></span></button>` : ""}
        </td>
      </tr>`;
    }).join("");

    const postRows = posts.map((p) => {
      const t = Store.track(p.trackId);
      const a = Store.user(p.author);
      const sample = !Store.db.posts.some((x) => x.id === p.id);
      return `<tr>
        <td><strong>${esc(t.title)}</strong>${sample ? ' <span class="tag tag-muted">exemplo</span>' : ""}</td>
        <td><a href="#/perfil/${esc(p.author)}">${esc(a ? a.name : p.author)}</a></td>
        <td>${Store.likeCount(p)}</td>
        <td>${Store.comments(p.id).length}</td>
        <td>${date(p.createdAt)}</td>
        <td class="cell-actions"><button class="icon-btn" data-action="admin-remove-post" data-post="${p.id}" data-sample="${sample}" title="${sample ? "Ocultar" : "Apagar"}" aria-label="${sample ? "Ocultar" : "Apagar"} publicação"><span uk-icon="${sample ? "ban" : "trash"}"></span></button></td>
      </tr>`;
    }).join("");

    const commentRows = comments.map((c) => {
      const u = Store.user(c.user);
      return `<div class="comment">
        ${avatar(u, "avatar-sm")}
        <div class="bubble"><strong>${esc(u ? u.name : c.user)}</strong> <small class="muted">em “${esc(postTitle(c.postId))}” · ${timeAgo(c.createdAt)}</small><p>${esc(c.text)}</p></div>
        <button class="icon-btn" data-action="admin-delete-comment" data-post="${c.postId}" data-comment="${c.id}" aria-label="Apagar comentário" title="Apagar comentário"><span uk-icon="trash"></span></button>
      </div>`;
    }).join("");

    return `
      <div class="page-head">
        <h1>Administração</h1>
        <span class="tag"><span uk-icon="icon: lock; ratio: .8"></span> Só administradores</span>
      </div>

      <div class="admin-stats">
        <div class="panel"><strong>${users.length}</strong><span>contas</span></div>
        <div class="panel"><strong>${posts.length}</strong><span>publicações</span></div>
        <div class="panel"><strong>${comments.length}</strong><span>comentários</span></div>
        <div class="panel"><strong>${likesGiven}</strong><span>gostos dados</span></div>
      </div>

      <p class="admin-note muted"><span uk-icon="info"></span><span>Este protótipo não tem servidor: aqui aparecem as contas e publicações criadas <strong>neste navegador</strong>. As palavras-passe são guardadas encriptadas e não podem ser vistas, mas podes definir uma nova em “Editar”.</span></p>

      <div class="section">
        <h2>Utilizadores</h2>
        <div class="table-wrap"><table class="admin-table">
          <thead><tr><th>Utilizador</th><th>Email</th><th>Palavra-passe</th><th>Criado</th><th>Músicas</th><th></th></tr></thead>
          <tbody>${userRows}</tbody>
        </table></div>
      </div>

      <div class="section">
        <div class="page-head" style="margin-bottom:12px">
          <h2 style="margin:0">Publicações</h2>
          ${hidden ? `<button class="btn btn-ghost btn-sm" data-action="admin-restore-posts">Repor ${hidden} ${hidden === 1 ? "publicação oculta" : "publicações ocultas"}</button>` : ""}
        </div>
        <div class="table-wrap"><table class="admin-table">
          <thead><tr><th>Música</th><th>Artista</th><th>Gostos</th><th>Coment.</th><th>Data</th><th></th></tr></thead>
          <tbody>${postRows}</tbody>
        </table></div>
      </div>

      <div class="section">
        <h2>Comentários dos utilizadores</h2>
        ${comments.length ? `<div class="panel">${commentRows}</div>` : empty("comments", "Sem comentários", "Os comentários feitos pelos utilizadores aparecem aqui.")}
      </div>`;
  }

  function adminUserForm(u) {
    return `
      <h2 class="modal-title">Editar @${esc(u.username)}</h2>
      <form id="admin-user-form" class="form-stack" data-user="${esc(u.username)}" novalidate>
        <label>Nome <input class="uk-input" name="name" maxlength="40" value="${esc(u.name)}" required></label>
        <label>Email <input class="uk-input" type="email" name="email" value="${esc(u.email)}" ${u.guest ? "disabled" : ""}></label>
        <label>Biografia <textarea class="uk-textarea" name="bio" rows="2" maxlength="200">${esc(u.bio)}</textarea></label>
        ${u.guest ? "" : `<label>Nova palavra-passe <small class="muted">(deixa vazio para manter a atual)</small>
          <input class="uk-input" type="password" name="password" autocomplete="new-password" minlength="6"></label>`}
        <p class="form-error" role="alert"></p>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost uk-modal-close">Cancelar</button>
          <button type="submit" class="btn btn-accent">Guardar</button>
        </div>
      </form>`;
  }

  return {
    esc, coverBg, initials, avatar, genreName,
    login, register, home, feed, post, library, profile, settings, admin, adminUserForm
  };
})();
