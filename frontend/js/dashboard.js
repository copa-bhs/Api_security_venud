const Dashboard = {
  nuvemData: [],
  nuvemFiltrada: [],
  bancoData: [],
  filtroAtual: "todos",
  nuvemPage: 0,
  nuvemLimit: 20,

  renderDonut(percent, color, size=120, stroke=14) {
    const radius = (size - stroke) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="${stroke}"/>
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="${color}" stroke-width="${stroke}" 
                stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"
                style="transition: stroke-dashoffset 1s ease;"/>
      </svg>
    `;
  },

  renderAgeRating(age) {
    if (!age) return '';
    let bg = 'var(--ok)'; let text = '#fff';
    const a = String(age).toUpperCase();
    if (a === '12') { bg = '#f59e0b'; text = '#000'; }
    else if (a === '14') { bg = '#f97316'; text = '#fff'; }
    else if (a === '16') { bg = '#ef4444'; text = '#fff'; }
    else if (a === '18') { bg = '#000'; text = '#fff'; }
    return `<div style="position: absolute; top: 8px; right: 8px; background: ${bg}; color: ${text}; font-size: 11px; font-weight: 800; padding: 2px 6px; border-radius: 4px; z-index: 2;">${a}</div>`;
  },

  async render(el) {
    // PROTEÇÃO 2: Adiciona um timestamp para forçar a API a não vir do cache
    const t = new Date().getTime();
    const res = await fetch("/api/stats?t=" + t);
    const s = await res.json();

    el.innerHTML = `
      <div id="drawer" class="drawer">
        <div class="drawer-header">
          <div class="logo">${icon("film")} <span>Admin</span></div>
          <button class="btn-icon" onclick="document.getElementById('drawer').classList.remove('open'); document.getElementById('drawer-overlay').classList.remove('open');">${icon("x")}</button>
        </div>
        <div class="drawer-menu">
          <button class="drawer-item active" data-tab="tab-main">${icon("chart")} Dashboard</button>
          <button class="drawer-item" data-tab="tab-adicionar">${icon("plus")} Adicionar Mídia</button>
          <button class="drawer-item" data-tab="tab-nuvem">${icon("upload")} Importar Mídias</button>
          <button class="drawer-item" data-tab="tab-usuarios">${icon("users")} Usuários</button>
          <button class="drawer-item" data-tab="tab-config">${icon("settings")} Configurações</button>
        </div>
      </div>

      <div class="dash-container">
        <header class="dash-topbar">
          <div class="dash-title">
            <button class="btn-menu" onclick="document.getElementById('drawer').classList.add('open'); document.getElementById('drawer-overlay').classList.add('open');">
              ${icon("menu")}
            </button>
            <h1>Dashboard</h1>
          </div>
          <span class="badge-status">SQLite Online</span>
        </header>

        <section id="tab-main" class="tab-content active">
          <div class="charts-grid">
            <div class="chart-card">
              <div class="chart-header"><h3>${icon("film")} Catálogo</h3><span>${s.total} itens totais</span></div>
              <div class="chart-body">
                <div class="donut-wrapper">
                  ${this.renderDonut(100, "var(--accent)")}
                  <div class="donut-center"><strong>${s.total}</strong><small>Itens</small></div>
                </div>
                <div class="chart-legend">
                  <div class="legend-item"><div class="legend-left"><span class="dot" style="background:var(--accent)"></span> Filmes</div> <b>${s.filmes}</b></div>
                  <div class="legend-item"><div class="legend-left"><span class="dot" style="background:var(--cyan)"></span> Séries</div> <b>${s.series}</b></div>
                </div>
              </div>
            </div>
            <div class="chart-card">
              <div class="chart-header"><h3>${icon("users")} Usuários</h3><span>Atividade</span></div>
              <div class="chart-body">
                <div class="donut-wrapper">
                  ${this.renderDonut(Math.round((s.usuarios.ativos / (s.usuarios.ativos + s.usuarios.inativos)) * 100) || 0, "var(--ok)")}
                  <div class="donut-center"><strong>${Math.round((s.usuarios.ativos / (s.usuarios.ativos + s.usuarios.inativos)) * 100) || 0}%</strong><small>Ativos</small></div>
                </div>
                <div class="chart-legend">
                  <div class="legend-item"><div class="legend-left"><span class="dot" style="background:var(--ok)"></span> Ativos</div> <b>${s.usuarios.ativos}</b></div>
                  <div class="legend-item"><div class="legend-left"><span class="dot" style="background:var(--border)"></span> Inativos</div> <b>${s.usuarios.inativos}</b></div>
                </div>
              </div>
            </div>
            <div class="chart-card">
              <div class="chart-header"><h3>${icon("database")} Armazenamento</h3><span>Banco de Dados</span></div>
              <div class="chart-body">
                <div class="donut-wrapper">
                  ${this.renderDonut(s.db_usage.usado, "var(--warn)")}
                  <div class="donut-center"><strong>${s.db_usage.tamanho_mb} <span style="font-size:14px">MB</span></strong><small>Usado</small></div>
                </div>
                <div class="chart-legend">
                  <div class="legend-item"><div class="legend-left"><span class="dot" style="background:var(--warn)"></span> Ocupado</div> <b>${s.db_usage.usado}%</b></div>
                  <div class="legend-item"><div class="legend-left"><span class="dot" style="background:var(--border)"></span> Livre</div> <b>${s.db_usage.livre}%</b></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="tab-adicionar" class="tab-content">
          <div class="panel-header"><h2>${icon("plus")} Adicionar Novo Conteúdo</h2></div>
          <div class="form-grid">
            <div class="form-group"><label>Título *</label><input type="text" id="f-title" placeholder="Ex: Interestelar"></div>
            <div class="form-group"><label>Tipo</label><select id="f-type"><option value="movie">Filme</option><option value="series">Série</option></select></div>
            <div class="form-group"><label>Ano</label><input type="number" id="f-year" placeholder="2014"></div>
            <div class="form-group"><label>Categoria</label><input type="text" id="f-coletany" placeholder="Ex: Lançamentos"></div>
            <div class="form-group" style="grid-column: 1 / -1;"><label>URL do Pôster</label><input type="url" id="f-poster" placeholder="https://..."></div>
          </div>
          <div class="form-actions"><button id="btn-salvar-form" class="btn-primary">${icon("check")} Salvar no Banco</button></div>
        </section>

        <section id="tab-nuvem" class="tab-content">
          <div class="panel-header" style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap;">
            <div>
              <h2>${icon("upload")} Importar Mídias</h2>
              <p class="sub">Importe em massa do catálogo na nuvem. Itens já importados são ignorados.</p>
            </div>
            <button id="btn-excluir-tudo" class="btn-ghost" style="color:var(--accent); border-color:var(--accent);">
              ${icon("trash")} Limpar Banco de Dados
            </button>
          </div>

          <div class="cloud-controls">
            <div class="input-group">
              <label>Qtd. Importar (apenas novos)</label>
              <input type="number" id="qtd-importar" value="50" min="1">
            </div>
            <button id="btn-importar-massa" class="btn-primary">${icon("upload")} Importar Massa</button>
          </div>

          <div id="progress-container" class="hidden">
            <div class="progress-info"><span id="progress-text">Enviando...</span><span id="progress-pct">0%</span></div>
            <div class="progress-bar"><div id="progress-fill" class="progress-fill"></div></div>
          </div>

          <div class="categories-bar">
            <button class="cat-btn active" data-type="todos">Todos</button>
            <button class="cat-btn" data-type="movie">Filmes</button>
            <button class="cat-btn" data-type="series">Séries</button>
            <button class="cat-btn" data-type="anime">Animes</button>
          </div>

          <div id="nuvem-lista" class="grid" style="margin-top: 16px;">
            <div class="loading" style="grid-column: 1/-1">${icon("spinner","icon spin")} Carregando catálogo...</div>
          </div>
        </section>

        <section id="tab-usuarios" class="tab-content">
          <div class="panel-header"><h2>${icon("users")} Usuários</h2></div>
        </section>
        <section id="tab-config" class="tab-content">
          <div class="panel-header"><h2>${icon("settings")} Configurações</h2></div>
        </section>
      </div>
    `;

    this.carregarNuvemAuto();

    document.getElementById("btn-excluir-tudo").onclick = async () => {
      if(!confirm("Tem certeza que deseja APAGAR TODOS os filmes e séries do banco?")) return;
      try {
        await fetch("/api/admin/excluir_tudo", { method: "DELETE" });
        toast("Banco de dados limpo!");
        Dashboard.render(el);
      } catch(e) {
        toast("Erro ao limpar", "err");
      }
    };

    document.querySelectorAll(".drawer-item[data-tab]").forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".drawer-item").forEach(b => b.classList.remove("active"));
        document.getElementById(btn.dataset.tab).classList.add("active");
        btn.classList.add("active");
        document.getElementById('drawer').classList.remove('open');
        document.getElementById('drawer-overlay').classList.remove('open');
      };
    });

    document.querySelectorAll(".cat-btn").forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.filtroAtual = btn.dataset.type;
        this.renderizarListaNuvem();
      };
    });

    document.getElementById("btn-importar-massa").onclick = () => this.importarMassa();
    
    document.getElementById("btn-salvar-form").onclick = async () => {
      const payload = {
        title: document.getElementById("f-title").value,
        type: document.getElementById("f-type").value,
        year: parseInt(document.getElementById("f-year").value) || null,
        coletany: document.getElementById("f-coletany").value,
        poster: document.getElementById("f-poster").value
      };
      if(!payload.title) return toast("O título é obrigatório", "err");
      const btn = document.getElementById("btn-salvar-form");
      btn.disabled = true; btn.innerHTML = `${icon("spinner","icon spin")} Salvando...`;
      try {
        await API.criar(payload);
        toast("Salvo com sucesso!");
        Dashboard.render(el);
      } catch(e) {
        toast("Erro ao salvar", "err");
        btn.disabled = false; btn.innerHTML = `${icon("check")} Salvar no Banco`;
      }
    };
  },

  async carregarNuvemAuto() {
    const lista = document.getElementById("nuvem-lista");
    // PROTEÇÃO 3: Força a atualização das listas com timestamp
    const t = new Date().getTime();
    try {
      const res = await fetch("/api/nuvem?t=" + t);
      const data = await res.json();
      if (data.erro) throw new Error(data.erro);
      this.nuvemData = data;

      const resBanco = await fetch("/api/conteudos?limit=9999&t=" + t);
      const dataBanco = await resBanco.json();
      this.bancoData = dataBanco.itens;

      this.renderizarListaNuvem();
      toast(`${data.length} itens carregados da nuvem!`);
    } catch (e) {
      lista.innerHTML = `<div class="empty" style="grid-column: 1/-1; color:var(--accent)"><p>Erro: ${e.message}</p></div>`;
    }
  },

  renderizarListaNuvem() {
    const lista = document.getElementById("nuvem-lista");
    let filtrados = this.nuvemData;
    
    if (this.filtroAtual !== "todos") {
      if (this.filtroAtual === "anime") {
        filtrados = filtrados.filter(i => (i.genres && i.genres.some(g => g.toLowerCase().includes('animation'))) || (i.title && i.title.toLowerCase().includes('anime')));
      } else {
        filtrados = filtrados.filter(i => i.type === this.filtroAtual);
      }
    }

    this.nuvemFiltrada = filtrados;
    this.nuvemPage = 0;

    if(!filtrados.length) {
      lista.innerHTML = `<div class="empty" style="grid-column:1/-1;">Nenhum item encontrado.</div>`;
      return;
    }

    lista.innerHTML = "";
    this.carregarMaisItens();
  },

  carregarMaisItens() {
    const lista = document.getElementById("nuvem-lista");
    const start = this.nuvemPage * this.nuvemLimit;
    const end = start + this.nuvemLimit;
    const itensParaMostrar = this.nuvemFiltrada.slice(start, end);

    const html = itensParaMostrar.map(i => {
      const jaExiste = this.bancoData.some(b => b.title === i.title);
      
      return `
      <article class="card" style="${jaExiste ? 'opacity: 0.6;' : ''}">
        <div class="poster">
          ${i.poster ? `<img src="${i.poster}" loading="lazy">` : `<div class="no-img">${icon("film")}</div>`}
          ${this.renderAgeRating(i.age_rating)}
          <span class="badge ${i.type}" style="position:absolute; top:8px; left:8px; background:rgba(0,0,0,0.7); color:#fff;">
            ${i.type === 'movie' ? 'Filme' : (i.type === 'series' ? 'Série' : 'Anime')}
          </span>
        </div>
        <div class="info">
          <h3 title="${i.title}">${i.title}</h3>
          <button class="btn-primary" style="padding:8px; font-size:12px; margin-top:6px;" 
            ${jaExiste ? 'disabled' : `onclick="Dashboard.importarItem('${i.id || i.tmdb_id || i.title}')"`}>
            ${jaExiste ? icon("check") + ' Já importado' : icon("upload") + ' Importar'}
          </button>
        </div>
      </article>
      `;
    }).join("");

    lista.insertAdjacentHTML('beforeend', html);
    this.nuvemPage++;
  },

  async importarMassa() {
    const qtd = parseInt(document.getElementById("qtd-importar").value) || 0;
    if (qtd < 1) return toast("Digite uma quantidade válida", "err");

    const novosParaImportar = this.nuvemData.filter(i => !this.bancoData.some(b => b.title === i.title));
    
    if (novosParaImportar.length === 0) {
      return toast("Todos os itens da nuvem já estão no banco de dados!", "err");
    }

    const itensParaImportar = novosParaImportar.slice(0, qtd);
    const total = itensParaImportar.length;

    if (total === 0) return toast("Nenhum item novo para importar.", "err");

    const progContainer = document.getElementById("progress-container");
    const progFill = document.getElementById("progress-fill");
    const progText = document.getElementById("progress-text");
    const progPct = document.getElementById("progress-pct");

    progContainer.classList.remove("hidden");
    progFill.style.width = "0%";
    progText.textContent = `Enviando ${total} novos itens...`;
    progPct.textContent = "0%";

    let inseridos = 0;
    const batchSize = 10; 

    for (let i = 0; i < total; i += batchSize) {
      const lote = itensParaImportar.slice(i, i + batchSize);
      try {
        const r = await API.criar(lote);
        inseridos += r.inseridos;
      } catch (e) {}
      const progresso = Math.round(((i + batchSize) / total) * 100);
      progFill.style.width = `${Math.min(progresso, 100)}%`;
      progPct.textContent = `${Math.min(progresso, 100)}%`;
    }

    progText.textContent = "Concluído!";
    toast(`${inseridos} novos itens importados!`);
    setTimeout(() => progContainer.classList.add("hidden"), 3000);
    
    this.carregarNuvemAuto();
  },

  async importarItem(id) {
    const item = this.nuvemData.find(i => (i.id || i.tmdb_id || i.title) == id);
    if (!item) return;
    toast("Importando...");
    try {
      await API.criar(item);
      toast("Adicionado ao banco!");
      this.bancoData.push(item); 
      this.renderizarListaNuvem();
    } catch (e) {
      toast("Erro ao importar", "err");
    }
  }
};