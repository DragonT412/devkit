import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "devkit.db")


async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


async def init_db():
    db = await get_db()
    await db.executescript("""
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            method TEXT NOT NULL,
            url TEXT NOT NULL,
            request_headers TEXT DEFAULT '{}',
            request_body TEXT DEFAULT '',
            status_code INTEGER,
            response_headers TEXT DEFAULT '{}',
            response_body TEXT DEFAULT '',
            duration_ms REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS collection_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            collection_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            method TEXT NOT NULL DEFAULT 'GET',
            url TEXT NOT NULL DEFAULT '',
            headers TEXT DEFAULT '{}',
            body TEXT DEFAULT '',
            FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
        );
    """)
    await db.commit()
    await db.close()
