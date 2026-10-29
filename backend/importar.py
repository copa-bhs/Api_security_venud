import json, sys
from database import get_conn, init_db

def importar(caminho):
    init_db()
    with open(caminho, encoding="utf-8") as f:
        dados = json.load(f)
    if isinstance(dados, dict):
        dados = dados.get("itens") or dados.get("catalogo") or dados.get("data") or []
    conn = get_conn()
    ok = 0
    for item in dados:
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
                json.dumps(item.get("genres", []), ensure_ascii=False),
            ))
            ok += 1
        except Exception as e:
            print("⚠️", e)
    conn.commit(); conn.close()
    print(f"✅ {ok} importados")

if __name__ == "__main__":
    importar(sys.argv[1] if len(sys.argv) > 1 else "catalogo.json")
