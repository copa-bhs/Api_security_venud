const Router = {
  routes: { home: Home, dashboard: Dashboard },
  parse() {
    const hash = location.hash.replace(/^#\//, "") || "dashboard";
    return this.routes[hash] ? hash : "dashboard";
  },
  async render() {
    const rota = this.parse();
    const app = document.getElementById("app");
    app.innerHTML = `<div class="loading" style="height:100vh;display:flex;align-items:center;justify-content:center"><svg class="icon spin" style="width:40px;height:40px;color:var(--accent)"><use href="#i-spinner"/></svg></div>`;
    await this.routes[rota].render(app);
  }
};

window.addEventListener("hashchange", () => Router.render());
window.addEventListener("DOMContentLoaded", () => {
  // Força a URL para #/dashboard se estiver na raiz ou na home antiga
  if (!location.hash || location.hash === "#/home" && !sessionStorage.getItem("visited_home")) {
    location.hash = "#/dashboard";
  }
  Router.render();
});
