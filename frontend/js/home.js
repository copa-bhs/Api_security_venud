const Home = {
  state: { type: "", coletany: "", q: "", page: 0, limit: 24 },

  async render(el) {
    el.innerHTML = `
      <div class="home-container">
        <!-- TOPBAR COM BOTÃO DE VOLTAR -->
        <header class="home-topbar">
          <button class="btn-back" onclick="location.hash='#/dashboard'">
            ${icon("chevron-l")} Voltar ao Dashboard
          </button>
        </header>

        <section class="hero">
          <h1>Explore o catálogo</h1>
          <p class="sub">Filmes, séries e novelas reunidos em um só lugar.</p>
          <form id="filtros" class="filtros">
            <div class="search">
              ${icon("search")}
              <input name="q" placeholder="Buscar título…" value="${this.state.q}" autocomplete="off">
            </div>
            <select name="type">
              <option value="">Todos</option>
              <option value="movie" ${this.state.type==="movie"?"selected":""}>Filmes</option>
              <option value="series" ${this.state.type==="series"?"selected":""}>Séries</option>
            </select>
            <button type="submit" class="btn-primary">Filtrar</button>
          </form>
        </section>
        <section id="grid" class="grid"></section>
        <div id="paginacao" class="paginacao"></div>
      </div>
    `;
    
    el.querySelector("#filtros").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      this.state.q = f.get("q") || "";
      this.state.type = f.get("type") || "";
      this.state.page = 0;
      this.carregar();
    });
    this.carregar();
  },

  async carregar() {
    const grid = document.getElementById("grid");
    grid.innerHTML = `<div class="loading">${icon("spinner","icon spin")} Carregando…</div>`;
    const { itens, total } = await API.listar({
      q: this.state.q, type: this.state.type,
      limit: this.state.limit,
      offset: this.state.page * this.state.limit
    });
    
    if (!itens.length) {
      grid.innerHTML = `<div class="empty">${icon("search","icon big")}<p>Nenhum resultado encontrado</p></div>`;
      document.getElementById("paginacao").innerHTML = "";
      return;
    }
    
    grid.innerHTML = itens.map(i => this.card(i)).join("");
    
    grid.querySelectorAll(".btn-del").forEach(b => {
      b.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm("Excluir este título do catálogo?")) return;
        await API.deletar(b.dataset.id);
        toast("Título excluído");
        this.carregar();
      };
    });
    this.paginacao(total);
  },

  card(i) {
    const img = i.poster || i.backdrop || i.logo || "";
    const genres = (i.genres || []).slice(0, 3).join(" · ");
    return `
      <article class="card">
        <div class="poster">
          ${img ? `<img src="${img}" alt="${i.title}" loading="lazy">` : `<div class="no-img">${icon("film","icon big")}</div>`}
          ${i.premium ? `<span class="premium-tag">${icon("star")} Premium</span>` : ""}
        </div>
        <div class="info">
          <h3 title="${i.title}">${i.title}</h3>
          <p class="year">${i.year || "—"}</p>
          <div class="badges">
            <span class="badge ${i.type}">
              ${icon(i.type === "movie" ? "movie" : "tv")} ${i.type || "?"}
            </span>
          </div>
          <div class="meta">
            <span>${icon("star")} ${i.rating_avg ?? "—"}</span>
            <span>${icon("audio")} ${i.audio_type || "—"}</span>
          </div>
          <button class="btn-del" data-id="${i.id}" title="Excluir">${icon("trash")}</button>
        </div>
      </article>`;
  },

  paginacao(total) {
    const p = document.getElementById("paginacao");
    const totalPages = Math.ceil(total / this.state.limit);
    if (totalPages <= 1) { p.innerHTML = ""; return; }
    p.innerHTML = `
      <button ${this.state.page===0?"disabled":""} id="prev" class="btn-ghost">${icon("chevron-l")} Anterior</button>
      <span>${this.state.page+1} / ${totalPages}</span>
      <button ${this.state.page>=totalPages-1?"disabled":""} id="next" class="btn-ghost">Próxima ${icon("chevron-r")}</button>`;
    p.querySelector("#prev")?.addEventListener("click", () => { this.state.page--; this.carregar(); });
    p.querySelector("#next")?.addEventListener("click", () => { this.state.page++; this.carregar(); });
  }
};
