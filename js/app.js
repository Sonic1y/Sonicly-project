/* =========================================================
   Sonicly — aplicação principal
   Router (páginas por #hash), ações dos botões e formulários.
   ========================================================= */

(() => {
  const view = document.getElementById("view");
  const filters = { query: "", genre: "" };
  let route = { name: "", parts: [] };

  const notify = (message, status) => UIkit.notification({ message, status, pos: "bottom-center", timeout: 2200 });
  const confirmBox = (message, ok = "Confirmar") => UIkit.modal.confirm(message, { labels: { ok, cancel: "Cancelar" }, stack: true });

  /* ---------- Tema ---------- */
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
  }

  /* ---------- Router ---------- */
  const PUBLIC = ["login", "registo"];

  function go(hash) {
    if (location.hash === hash) render(); else location.hash = hash;
  }

  function render() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    const name = parts[0] || "inicio";
    const me = Store.currentUser();

    if (!me && !PUBLIC.includes(name)) { location.replace("#/login"); return; }
    if (me && PUBLIC.includes(name)) { location.replace("#/inicio"); return; }

    const changed = route.name !== name || route.parts.join("/") !== parts.join("/");
    route = { name, parts };
    document.body.classList.toggle("auth-mode", !me);

    let html;
    switch (name) {
      case "login": html = Views.login(); break;
      case "registo": html = Views.register(); break;
      case "inicio": html = Views.home(filters); break;
      case "biblioteca": html = Views.library(parts[1] || "favoritos", parts[2]); break;
      case "perfil":
        html = parts[1] === "editar" ? Views.profile(me.username, true) : Views.profile(parts[1] || me.username, false);
        break;
      case "definicoes": html = Views.settings(); break;
      case "admin":
        if (!Store.isAdmin()) { location.replace("#/inicio"); return; }
        html = Views.admin();
        break;
      default: location.replace("#/inicio"); return;
    }
    view.innerHTML = html;

    document.querySelectorAll("[data-route]").forEach((a) => {
      const active = a.dataset.route === name && !(name === "perfil" && parts[1] && parts[1] !== "editar" && parts[1] !== me.username);
      a.classList.toggle("active", active);
      if (active) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.querySelectorAll(".admin-link").forEach((a) => { a.hidden = !Store.isAdmin(); });
    renderSideUser();
    if (changed) { window.scrollTo(0, 0); view.focus({ preventScroll: true }); }
    if (!Player.state.playing && Player.currentId === null) document.title = "Sonicly — Música independente";
  }

  function renderSideUser() {
    const me = Store.currentUser();
    const box = document.getElementById("side-user");
    box.innerHTML = me ? `${Views.avatar(me)}<div><div class="name">${Views.esc(me.name)}</div><small>@${Views.esc(me.username)}</small></div>` : "";
  }

  /* ---------- Atualizações sem recarregar a página ---------- */
  function refreshPlayingUI() {
    const id = Player.currentId;
    const playing = Player.state.playing;
    view.querySelectorAll(".cover-play").forEach((btn) => {
      const on = btn.dataset.track === id && playing;
      btn.parentElement.classList.toggle("playing", on);
      btn.innerHTML = `<span uk-icon="icon: ${on ? "pause" : "play"}; ratio: 1.4"></span>`;
    });
    view.querySelectorAll(".track-row").forEach((row) => {
      const btn = row.querySelector(".cover-play");
      const isCur = btn && btn.dataset.track === id;
      row.classList.toggle("playing", isCur);
      row.classList.toggle("paused", isCur && !playing);
      const title = row.querySelector(".tr-title");
      const eq = title.querySelector(".eq");
      if (isCur && !eq) title.insertAdjacentHTML("beforeend", ' <span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>');
      if (!isCur && eq) eq.remove();
    });
    view.querySelectorAll('[data-action="favorite"]').forEach((b) => b.classList.toggle("on", Store.isFavorite(b.dataset.track)));
  }

  function rerenderPost(postId, openComments) {
    const el = view.querySelector(`article[data-post="${postId}"]`);
    const p = Store.allPosts().find((x) => x.id === postId);
    if (!el || !p) return;
    const q = el.querySelector(".cover-play").dataset.queue;
    el.outerHTML = Views.post(p, q ? q.split(",") : [p.trackId], openComments);
  }

  /* ---------- Publicar ---------- */
  const publishModal = () => UIkit.modal("#publish-modal");
  const publishForm = document.getElementById("publish-form");

  function openPublish(draft) {
    publishForm.reset();
    publishForm.genre.innerHTML = GENRES.map((g) => `<option value="${g.id}">${g.name}</option>`).join("");
    publishForm.draftId.value = draft ? draft.id : "";
    if (draft) {
      publishForm.title.value = draft.title || "";
      publishForm.genre.value = draft.genre || GENRES[0].id;
      publishForm.desc.value = draft.desc || "";
    }
    document.getElementById("publish-heading").textContent = draft ? "Continuar rascunho" : "Publicar música";
    document.getElementById("publish-error").textContent = "";
    publishModal().show();
  }

  function publishValues() {
    return {
      id: publishForm.draftId.value || undefined,
      title: publishForm.title.value.trim(),
      genre: publishForm.genre.value,
      desc: publishForm.desc.value.trim(),
      file: publishForm.audio.files[0] || null
    };
  }

  publishForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("publish-error");
    const v = publishValues();
    if (!v.title) { err.textContent = "Dá um título à tua música."; publishForm.title.focus(); return; }
    if (v.file && !v.file.type.startsWith("audio/")) { err.textContent = "O ficheiro tem de ser de áudio."; return; }
    const btn = publishForm.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      const res = await Store.publish(v);
      if (v.id) Store.deleteDraft(v.id);
      publishModal().hide();
      notify(res.stored ? "Música publicada! 🎉" : "Música publicada. O ficheiro é grande, por isso só fica disponível até fechares o separador.", "success");
      filters.query = ""; filters.genre = "";
      go("#/inicio");
    } catch (ex) {
      err.textContent = "Não foi possível publicar. Tenta um ficheiro mais pequeno.";
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------- Playlists (janela) ---------- */
  let playlistTrack = null;

  function openPlaylistModal(trackId) {
    playlistTrack = trackId;
    renderPlaylistChoices();
    UIkit.modal("#playlist-modal").show();
  }

  function renderPlaylistChoices() {
    const pls = Store.lib().playlists;
    document.getElementById("playlist-choices").innerHTML = pls.length
      ? pls.map((pl) => {
          const has = pl.trackIds.includes(playlistTrack);
          return `<button class="btn btn-ghost btn-block" style="justify-content:space-between;margin-bottom:8px" data-action="pick-playlist" data-playlist="${pl.id}" ${has ? "disabled" : ""}>
            <span>${Views.esc(pl.name)}</span><small class="muted">${has ? "já adicionada" : pl.trackIds.length + " músicas"}</small></button>`;
        }).join("")
      : `<p class="muted">Ainda não tens playlists. Cria a primeira:</p>`;
  }

  document.getElementById("new-playlist-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = e.target.name;
    if (!input.value.trim()) return;
    const pl = Store.createPlaylist(input.value);
    Store.addToPlaylist(pl.id, playlistTrack);
    input.value = "";
    UIkit.modal("#playlist-modal").hide();
    notify(`Adicionada a “${Views.esc(pl.name)}”`);
    if (route.name === "biblioteca") render();
  });

  /* ---------- Perfil: reduzir imagem ---------- */
  function resizeImage(file, size = 160) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = c.height = size;
        const s = Math.min(img.width, img.height);
        c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /* ---------- Ações (cliques) ---------- */
  const actions = {
    play(el) {
      const queue = el.dataset.queue ? el.dataset.queue.split(",") : null;
      Player.playTrack(el.dataset.track, queue);
    },
    like(el) {
      const on = Store.toggleLike(el.dataset.post);
      const p = Store.allPosts().find((x) => x.id === el.dataset.post);
      view.querySelectorAll(`[data-action="like"][data-post="${el.dataset.post}"]`).forEach((b) => {
        b.classList.toggle("liked", on);
        b.setAttribute("aria-pressed", on);
        b.querySelector(".count").textContent = Store.likeCount(p);
      });
    },
    favorite(el) {
      const on = Store.toggleFavorite(el.dataset.track);
      notify(on ? "Adicionada aos favoritos" : "Removida dos favoritos");
      if (route.name === "biblioteca" && (route.parts[1] || "favoritos") === "favoritos") render(); else refreshPlayingUI();
      document.getElementById("pl-fav").classList.toggle("on", !!Player.currentId && Store.isFavorite(Player.currentId));
    },
    "toggle-comments"(el) {
      const box = el.closest(".post").querySelector(".comments");
      const open = box.classList.toggle("open");
      el.setAttribute("aria-expanded", open);
      if (open) box.querySelector("input").focus();
    },
    async "delete-post"(el) {
      try { await confirmBox("Apagar esta publicação? Esta ação não pode ser desfeita.", "Apagar"); } catch { return; }
      const p = Store.allPosts().find((x) => x.id === el.dataset.post);
      if (p && Player.currentId === p.trackId) Player.stop();
      Store.deletePost(el.dataset.post);
      notify("Publicação apagada");
      render();
    },
    "add-to-playlist"(el) { openPlaylistModal(el.dataset.track); },
    "pick-playlist"(el) {
      const pl = Store.lib().playlists.find((p) => p.id === el.dataset.playlist);
      Store.addToPlaylist(el.dataset.playlist, playlistTrack);
      UIkit.modal("#playlist-modal").hide();
      notify(`Adicionada a “${Views.esc(pl.name)}”`);
      if (route.name === "biblioteca") render();
    },
    "remove-from-playlist"(el) {
      Store.removeFromPlaylist(el.dataset.playlist, el.dataset.track);
      render();
    },
    async "delete-playlist"(el) {
      try { await confirmBox("Apagar esta playlist? As músicas não são apagadas.", "Apagar"); } catch { return; }
      Store.deletePlaylist(el.dataset.playlist);
      go("#/biblioteca/playlists");
    },
    "filter-genre"(el) {
      filters.genre = el.dataset.genre;
      view.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === el));
      document.getElementById("feed").innerHTML = Views.feed(filters);
    },
    guest() { Store.loginGuest(); go("#/inicio"); },
    "open-publish"() { if (Store.currentUser()) openPublish(); },
    "save-draft"() {
      const v = publishValues();
      if (!v.title && !v.desc) { document.getElementById("publish-error").textContent = "Escreve pelo menos um título para guardar o rascunho."; return; }
      Store.saveDraft({ id: v.id, title: v.title, genre: v.genre, desc: v.desc });
      publishModal().hide();
      notify(v.file ? "Rascunho guardado (o ficheiro de áudio não é guardado nos rascunhos)." : "Rascunho guardado");
      if (route.name === "biblioteca") render();
    },
    "edit-draft"(el) { openPublish(Store.lib().drafts.find((d) => d.id === el.dataset.draft)); },
    async "delete-draft"(el) {
      try { await confirmBox("Apagar este rascunho?", "Apagar"); } catch { return; }
      Store.deleteDraft(el.dataset.draft);
      render();
    },
    theme(el) {
      const t = el.dataset.themeValue;
      Store.setSetting("theme", t);
      applyTheme(t);
      render();
    },
    logout() { Player.stop(); Store.logout(); go("#/login"); },
    "logout-to-register"() { Player.stop(); Store.logout(); go("#/registo"); },
    "admin-edit-user"(el) {
      const u = Store.db.users[el.dataset.user];
      if (!u) return;
      document.getElementById("admin-modal-body").innerHTML = Views.adminUserForm(u);
      UIkit.modal("#admin-modal").show();
    },
    async "admin-delete-user"(el) {
      const u = el.dataset.user;
      try { await confirmBox(`Apagar a conta @${Views.esc(u)}? As músicas, comentários e gostos desta conta também são apagados. Esta ação não pode ser desfeita.`, "Apagar conta"); } catch { return; }
      try { Store.adminDeleteUser(u); notify(`Conta @${Views.esc(u)} apagada`); } catch (ex) { notify(ex.message, "danger"); }
      render();
    },
    async "admin-remove-post"(el) {
      const sample = el.dataset.sample === "true";
      try {
        await confirmBox(sample ? "Ocultar esta publicação de exemplo? Podes repô-la mais tarde." : "Apagar esta publicação? Esta ação não pode ser desfeita.", sample ? "Ocultar" : "Apagar");
      } catch { return; }
      const p = Store.allPosts().find((x) => x.id === el.dataset.post);
      if (p && Player.currentId === p.trackId) Player.stop();
      Store.adminRemovePost(el.dataset.post);
      notify(sample ? "Publicação ocultada" : "Publicação apagada");
      render();
    },
    "admin-restore-posts"() {
      Store.adminRestoreSamplePosts();
      notify("Publicações repostas");
      render();
    },
    async "admin-delete-comment"(el) {
      try { await confirmBox("Apagar este comentário?", "Apagar"); } catch { return; }
      Store.adminDeleteComment(el.dataset.post, el.dataset.comment);
      notify("Comentário apagado");
      render();
    },
    async reset() {
      try { await confirmBox("Apagar todas as contas, publicações e bibliotecas guardadas neste navegador?", "Apagar tudo"); } catch { return; }
      Player.stop();
      Store.reset();
      applyTheme("dark");
      notify("Dados apagados");
      go("#/login");
    }
  };

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.action];
    if (fn) { e.preventDefault(); fn(el); }
  });

  /* ---------- Formulários das páginas ---------- */
  view.addEventListener("submit", async (e) => {
    const form = e.target;
    e.preventDefault();
    const err = form.querySelector(".form-error");
    const fail = (m) => { if (err) err.textContent = m; };

    try {
      if (form.id === "login-form") {
        await Store.login(form.username.value, form.password.value);
        go("#/inicio");
      } else if (form.id === "register-form") {
        await Store.register({ name: form.name.value, username: form.username.value, email: form.email.value, password: form.password.value });
        notify("Conta criada. Bem-vindo ao Sonicly!", "success");
        go("#/inicio");
      } else if (form.dataset.form === "comment") {
        if (Store.addComment(form.dataset.post, form.text.value)) rerenderPost(form.dataset.post, true);
        const again = view.querySelector(`article[data-post="${form.dataset.post}"] .comments input`);
        if (again) again.focus();
      } else if (form.dataset.form === "new-playlist") {
        if (!form.name.value.trim()) return;
        const pl = Store.createPlaylist(form.name.value);
        notify(`Playlist “${Views.esc(pl.name)}” criada`);
        go("#/biblioteca/playlist/" + pl.id);
      } else if (form.id === "profile-form") {
        const name = form.name.value.trim();
        if (name.length < 2) return fail("Escreve o teu nome.");
        const patch = { name, bio: form.bio.value.trim(), color: (form.color.value || "#30d5c8") };
        const file = form.avatar.files[0];
        if (file) {
          if (!file.type.startsWith("image/")) return fail("A foto tem de ser uma imagem.");
          patch.avatar = await resizeImage(file);
        } else if (form.removeAvatar && form.removeAvatar.checked) {
          patch.avatar = null;
        }
        if (!Store.updateProfile(patch)) notify("Não foi possível guardar tudo (armazenamento cheio).", "warning");
        else notify("Perfil atualizado", "success");
        go("#/perfil");
      } else if (form.id === "account-form") {
        const name = form.name.value.trim();
        const email = form.email.value.trim();
        if (name.length < 2) return fail("Escreve o teu nome.");
        if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Email inválido.");
        Store.updateProfile({ name, email });
        notify("Alterações guardadas", "success");
        render();
      }
    } catch (ex) {
      fail(ex.message || "Ocorreu um erro.");
    }
  });

  /* ---------- Administração: editar utilizador (janela) ---------- */
  document.getElementById("admin-modal").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const err = form.querySelector(".form-error");
    const username = form.dataset.user;
    try {
      Store.adminUpdateUser(username, { name: form.name.value, email: form.email.value, bio: form.bio.value });
      if (form.password && form.password.value) await Store.adminSetPassword(username, form.password.value);
      UIkit.modal("#admin-modal").hide();
      notify(`Conta @${Views.esc(username)} atualizada`, "success");
      render();
    } catch (ex) {
      err.textContent = ex.message;
    }
  });

  view.addEventListener("input", (e) => {
    if (e.target.id === "search") {
      filters.query = e.target.value;
      document.getElementById("feed").innerHTML = Views.feed(filters);
    }
  });

  /* ---------- Arranque ---------- */
  applyTheme(Store.settings().theme);
  // Link de demonstração: index.html?convidado=1 entra logo como convidado.
  if (new URLSearchParams(location.search).has("convidado") && !Store.currentUser()) Store.loginGuest();

  Player.bindUI();
  Player.onChange(refreshPlayingUI);
  window.addEventListener("hashchange", render);
  render();
})();
