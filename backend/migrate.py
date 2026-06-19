import sqlite3
conn = sqlite3.connect("src/legacy_moving.db")
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print("Tables:", tables)
if "guarda_moveis" in tables:
    cur.execute("PRAGMA table_info(guarda_moveis)")
    cols = [r[1] for r in cur.fetchall()]
    print("Columns:", cols)
    if "metros_quadrados" not in cols:
        cur.execute("ALTER TABLE guarda_moveis ADD COLUMN metros_quadrados REAL")
        print("Added metros_quadrados")
    if "metros_cubicos" not in cols:
        cur.execute("ALTER TABLE guarda_moveis ADD COLUMN metros_cubicos REAL")
        print("Added metros_cubicos")
    conn.commit()
else:
    print("Table guarda_moveis not found - will be created on next server start")
conn.close()
print("done")
