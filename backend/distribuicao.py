import json
import random
import string
import httpx
from flask import Blueprint, request, jsonify, Response
from database import get_conn

distribuicao_bp = Blueprint('distribuicao', __name__)

# ==========================================
# FUNÇÕES AUXILIARES
# ==========================================
def formatar_item(row):
    """Pega os dados do SQLite e formata para o App (SEM o link original)."""
    item = dict(row)
    return {
        "id": item.get("iptv_id") or item.get("id"),
        "title": item.get("title"),
        "original_title": item.get("original_title"),
        "poster": item.get("poster"),
        "backdrop": item.get("backdrop"),
        "year": item.get("year"),
        "age_rating": item.get("age_rating", "L"),
        "rating": item.get("rating_avg"),
        "type": item.get("type"),
        # Link camuflado para o player
        "stream_url": f"{request.host_url}api/app/stream/{item.get('slug')}"
    }

# ==========================================
# 1. ROTA DE LISTAGEM (Filmes e Séries)
# ==========================================
@distribuicao_bp.route('/api/app/filmes', methods=['GET'])
def app_filmes():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM conteudos WHERE type = 'movie' ORDER BY created_at DESC").fetchall()
    conn.close()
    return jsonify({"total": len(rows), "items": [formatar_item(r) for r in rows]})

@distribuicao_bp.route('/api/app/series', methods=['GET'])
def app_series():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM conteudos WHERE type = 'series' ORDER BY created_at DESC").fetchall()
    conn.close()
    return jsonify({"total": len(rows), "items": [formatar_item(r) for r in rows]})

# ==========================================
# 2. ROTA DE PESQUISA
# ==========================================
@distribuicao_bp.route('/api/app/search', methods=['GET'])
def app_busca():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({"erro": "Parâmetro de busca 'q' é obrigatório."}), 400

    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM conteudos WHERE title LIKE ? OR original_title LIKE ?", 
        (f"%{query}%", f"%{query}%")
    ).fetchall()
    conn.close()
    
    return jsonify({"total": len(rows), "query": query, "items": [formatar_item(r) for r in rows]})

# ==========================================
# 3. ROTAS DE INFORMAÇÕES
# ==========================================
@distribuicao_bp.route('/api/app/filme/<int:id>', methods=['GET'])
def app_filme_info(id):
    conn = get_conn()
    row = conn.execute("SELECT * FROM conteudos WHERE id = ? AND type = 'movie'", (id,)).fetchone()
    conn.close()

    if not row:
        return jsonify({"erro": "Filme não encontrado."}), 404

    item = formatar_item(row)
    item["description"] = row["description"]
    item["genres"] = json.loads(row["genres"] or "[]")
    item["duration"] = row["duration"]
    item["logo"] = row["logo"]
    return jsonify(item)

@distribuicao_bp.route('/api/app/serie/<int:id>', methods=['GET'])
def app_serie_info(id):
    conn = get_conn()
    row = conn.execute("SELECT * FROM conteudos WHERE id = ? AND type = 'series'", (id,)).fetchone()
    conn.close()

    if not row:
        return jsonify({"erro": "Série não encontrada."}), 404

    item = formatar_item(row)
    item["description"] = row["description"]
    item["genres"] = json.loads(row["genres"] or "[]")
    item["logo"] = row["logo"]
    return jsonify(item)

# ==========================================
# 4. O PLAYER (PROXY REVERSO DINÂMICO)
# ==========================================
# ⚠️ COLOQUE AQUI AS CREDENCIAIS DO SEU PAINEL IPTV
IPTV_URL = "http://SEU_SERVIDOR_IPTV.com"
IPTV_USER = "seu_usuario"
IPTV_PASS = "sua_senha"

@distribuicao_bp.route('/api/app/stream/<slug>', methods=['GET'])
async def app_stream(slug):
    # 1. Busca o item no banco (SEM o link original)
    conn = get_conn()
    row = conn.execute("SELECT iptv_id, type FROM conteudos WHERE slug = ?", (slug,)).fetchone()
    conn.close()

    if not row:
        return jsonify({"erro": "Conteúdo não encontrado."}), 404

    iptv_id = row["iptv_id"]
    tipo = row["type"]
    
    if not iptv_id:
        return jsonify({"erro": "Este item não possui ID de IPTV válido."}), 400

    # 2. Consulta a API da IPTV em tempo real para pegar a URL real
    base_api = f"{IPTV_URL}/player_api.php?username={IPTV_USER}&password={IPTV_PASS}"
    
    if tipo == "movie":
        url_info = f"{base_api}&action=get_vod_info&vod_id={iptv_id}"
    else:
        # Para séries, você precisaria do ID do episódio, mas usaremos a raiz para exemplo
        url_info = f"{base_api}&action=get_series_info&series_id={iptv_id}"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Puxa os dados da IPTV
            res_info = await client.get(url_info)
            data_info = res_info.json()
            
            # Extrai a URL de stream (varia conforme a IPTV, mas geralmente fica em 'movie_data' ou 'episodes')
            url_original = None
            if tipo == "movie" and "movie_data" in data_info:
                url_original = data_info["movie_data"].get("stream_url")
                if not url_original and "container_extension" in data_info["movie_data"]:
                    ext = data_info["movie_data"]["container_extension"]
                    url_original = f"{IPTV_URL}/movie/{IPTV_USER}/{IPTV_PASS}/{iptv_id}.{ext}"

            if not url_original:
                return jsonify({"erro": "URL de vídeo não encontrada na IPTV."}), 404

            # 3. Faz o Proxy Reverso do vídeo real
            headers = {"User-Agent": "Mozilla/5.0"}
            if "Range" in request.headers: 
                headers["Range"] = request.headers["Range"]

            req_video = client.build_request("GET", url_original, headers=headers)
            res_video = await client.send(req_video, stream=True)
            
            resp_headers = {h: res_video.headers[h] for h in ("content-type", "content-length", "content-range", "accept-ranges") if h in res_video.headers}
            resp_headers["Access-Control-Allow-Origin"] = "*"
            
            return Response(res_video.aiter_bytes(), status_code=res_video.status_code, headers=resp_headers)

    except Exception as e:
        return jsonify({"erro": f"Falha no proxy: {str(e)}"}), 502