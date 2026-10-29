from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pathlib import Path
from database import get_conn, init_db
import json
import random
import requests

from distribuicao import distribuicao_bp

FRONT = Path(__file__).parent.parent / "frontend"
app = Flask(__name__, static_folder=str(FRONT), static_url_path="")
CORS(app)
init_db()
app.register_blueprint(distribuicao_bp)

DROPBOX_URL = "https://www.dropbox.com/scl/fi/pat4dt7qoo4az8hvr8wmv/catalogo.json?rlkey=jkherrxg796y466etfj1s1z1a&st=562hba09&raw=1"
_cache_nuvem = None

@app.route("/")
def root():
    return send_from_directory(FRONT, "index.html")

@app.route("/api/nuvem")
def nuvem():
    global _cache_nuvem
    if _cache_nuvem is not None:
        return jsonify(_cache_nuvem)
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(DROPBOX_URL, headers=headers, timeout=20)
        response.raise_for_status()
        dados = response.json()
        
        if isinstance(dados, list):
            lista_final = dados
        elif isinstance(dados, dict):
            if "itens" in dados: lista_final = dados["itens"]
            elif "catalogo" in dados: lista_final = dados["catalogo"]
            elif "data" in dados: lista_final = dados["data"]
            else:
                lista_final = next((v for v in dados.values() if isinstance(v, list)), [])
        else:
            lista_final = []

        _cache_nuvem = lista_final
        return jsonify(lista_final)
    except Exception as e:
        return jsonify({"erro": f"Falha ao baixar do Dropbox: {str(e)}"}), 500

@app.route("/api/conteudos")
def listar():
    tipo = request.args.get("type", "").strip()
    busca = request.args.get("q", "").strip()
    limit = min(int(request.args.get("limit", 24)), 100)
    offset = int(request.args.get("offset", 0))

    sql = "SELECT * FROM conteudos WHERE 1=1"
    params = []
    if tipo:
        sql += " AND type = ?"; params.append(tipo)
    if busca:
        sql += " AND (title LIKE ? OR original_title LIKE ?)"
        params += [f"%{busca}%", f"%{busca}%"]
    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params += [limit, offset]

    conn = get_conn()
    rows = [dict(r) for r in conn.execute(sql, params).fetchall()]
    total = conn.execute("SELECT COUNT(*) FROM conteudos").fetchone()[0]
    conn.close()
    for r in rows: r["genres"] = json.loads(r["genres"] or "[]")
    return jsonify({"itens": rows, "total": total})

@app.route("/api/stats")
def stats():
    conn = get_conn()
    total = conn.execute("SELECT COUNT(*) FROM conteudos").fetchone()[0]
    filmes = conn.execute("SELECT COUNT(*) FROM conteudos WHERE type='movie'").fetchone()[0]
    series = conn.execute("SELECT COUNT(*) FROM conteudos WHERE type='series'").fetchone()[0]
    try:
        generos = [dict(r) for r in conn.execute("""
            SELECT j.value as name, COUNT(*) as total 
            FROM conteudos c, json_each(c.genres) j
            WHERE c.genres != '[]' AND c.genres IS NOT NULL 
            GROUP BY j.value ORDER BY total DESC LIMIT 5
        """).fetchall()]
    except Exception: generos = []
    conn.close()

    db_file = Path(__file__).parent / "catalogo.db"
    tamanho_mb = (db_file.stat().st_size / (1024 * 1024)) if db_file.exists() else 0.0
    COTA_MB = 5.0 
    
    porcentagem_usada = round((tamanho_mb / COTA_MB) * 100, 1)
    if porcentagem_usada > 100: porcentagem_usada = 100
    porcentagem_livre = round(100 - porcentagem_usada, 1)

    return jsonify({
        "total": total, "filmes": filmes, "series": series, "generos": generos,
        "usuarios": { "ativos": random.randint(5, 20), "inativos": random.randint(1, 5) },
        "db_usage": { "usado": porcentagem_usada, "livre": porcentagem_livre, "tamanho_mb": round(tamanho_mb, 2), "cota_mb": COTA_MB }
    })

@app.route("/api/conteudo", methods=["POST"])
def criar():
    payload = request.get_json(force=True)
    itens = payload if isinstance(payload, list) else [payload]
    conn = get_conn()
    ok, erros = 0, []
    for item in itens:
        try:
            conn.execute("""
                INSERT OR IGNORE INTO conteudos
                (iptv_id, stream_type, coletany, tmdb_id, imdb_id, title,
                 original_title, slug, type, year, duration, description,
                 poster, logo, backdrop, rating_avg, rating_count,
                 views_count, premium, audio_type, age_rating, genres)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                item.get("iptv_id"), item.get("stream_type"), item.get("coletany"),
                item.get("tmdb_id"), item.get("imdb_id"), item.get("title"),
                item.get("original_title"), item.get("slug"), item.get("type"),
                item.get("year"), item.get("duration"), item.get("description"),
                item.get("poster"), item.get("logo"), item.get("backdrop"),
                item.get("rating_avg"), item.get("rating_count"),
                item.get("views_count", 0), 1 if item.get("premium") else 0,
                item.get("audio_type"), item.get("age_rating"),
                json.dumps(item.get("genres", []), ensure_ascii=False)
            ))
            ok += 1
        except Exception as e:
            erros.append({"title": item.get("title"), "erro": str(e)})
    conn.commit(); conn.close()
    return jsonify({"inseridos": ok, "erros": erros}), 201

# ROTA NOVA: EXCLUIR TUDO
@app.route("/api/admin/excluir_tudo", methods=["DELETE"])
def excluir_tudo():
    conn = get_conn()
    try:
        conn.execute("DELETE FROM conteudos")
        conn.commit()
        return jsonify({"status": "ok", "message": "Banco de dados limpo com sucesso!"})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        conn.close()

@app.route("/api/admin/conteudo/<int:id>", methods=["DELETE"])
def excluir_conteudo(id):
    conn = get_conn()
    try:
        conn.execute("DELETE FROM conteudos WHERE id = ?", (id,))
        conn.commit()
        return jsonify({"status": "ok", "message": "Excluído com sucesso!"})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        conn.close()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)