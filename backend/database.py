import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "catalogo.db"

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS conteudos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        iptv_id TEXT UNIQUE,
        stream_type TEXT,
        coletany TEXT,
        tmdb_id INTEGER,
        imdb_id TEXT,
        title TEXT NOT NULL,
        original_title TEXT,
        slug TEXT UNIQUE,
        type TEXT,
        year INTEGER,
        duration INTEGER,
        description TEXT,
        poster TEXT,
        logo TEXT,
        backdrop TEXT,
        rating_avg REAL,
        rating_count INTEGER,
        views_count INTEGER DEFAULT 0,
        premium INTEGER DEFAULT 0,
        audio_type TEXT,
        age_rating TEXT,
        genres TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_type ON conteudos(type);
    CREATE INDEX IF NOT EXISTS idx_coletany ON conteudos(coletany);
    CREATE INDEX IF NOT EXISTS idx_title ON conteudos(title);
    """)
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("✅ Banco criado em", DB_PATH)
