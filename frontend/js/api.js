const API = {
  async listar(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const r = await fetch("/api/conteudos?" + qs);
    return r.json();
  },
  async stats() {
    const r = await fetch("/api/stats");
    return r.json();
  },
  async criar(payload) {
    const r = await fetch("/api/conteudo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return r.json();
  },
  async deletar(id) {
    const r = await fetch("/api/conteudo/" + id, { method: "DELETE" });
    return r.json();
  }
};

// Ícone SVG inline reutilizável
function icon(name, cls = "icon") {
  return `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

let toastTimer;
function toast(msg, tipo = "ok") {
  const el = document.getElementById("toast");
  el.innerHTML = `${icon(tipo === "ok" ? "check" : "x")} <span>${msg}</span>`;
  el.className = "show " + tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = ""), 2800);
}
