"""Migration Sprint 6 — adds new tables and columns."""
import sqlite3

conn = sqlite3.connect("src/legacy_moving.db")
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = {r[0] for r in cur.fetchall()}
print("Existing tables:", sorted(tables))

# ── Organizer new columns ────────────────────────────────────────────────────
if "organizers" in tables:
    cur.execute("PRAGMA table_info(organizers)")
    cols = {r[1] for r in cur.fetchall()}
    for col, defn in [
        ("empresa", "TEXT"),
        ("cidade", "TEXT"),
        ("observacoes", "TEXT"),
        ("classificacao", "TEXT DEFAULT 'bronze'"),
        ("meta_mensal", "REAL DEFAULT 0"),
    ]:
        if col not in cols:
            cur.execute(f"ALTER TABLE organizers ADD COLUMN {col} {defn}")
            print(f"  + organizers.{col}")

# ── etapas_operacionais ──────────────────────────────────────────────────────
if "etapas_operacionais" not in tables:
    cur.execute("""
        CREATE TABLE etapas_operacionais (
            id INTEGER PRIMARY KEY,
            os_id INTEGER NOT NULL REFERENCES ordens_servico(id),
            data DATETIME,
            tipo TEXT DEFAULT 'transporte',
            quantidade_ajudantes INTEGER DEFAULT 0,
            quantidade_caminhoes INTEGER DEFAULT 0,
            equipe TEXT,
            veiculos TEXT,
            observacoes TEXT,
            status TEXT DEFAULT 'agendada',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("  + table etapas_operacionais")

# ── fechamentos_operacionais ─────────────────────────────────────────────────
if "fechamentos_operacionais" not in tables:
    cur.execute("""
        CREATE TABLE fechamentos_operacionais (
            id INTEGER PRIMARY KEY,
            os_id INTEGER NOT NULL UNIQUE REFERENCES ordens_servico(id),
            organizer_id INTEGER REFERENCES organizers(id),
            receita_bruta REAL DEFAULT 0,
            custo_equipe REAL DEFAULT 0,
            custo_caminhoes REAL DEFAULT 0,
            custo_materiais REAL DEFAULT 0,
            custo_pedagio REAL DEFAULT 0,
            custo_alimentacao REAL DEFAULT 0,
            custo_hospedagem REAL DEFAULT 0,
            custo_freelancers REAL DEFAULT 0,
            custo_outros REAL DEFAULT 0,
            lucro_liquido REAL DEFAULT 0,
            margem_percentual REAL DEFAULT 0,
            comissao_organizer REAL DEFAULT 0,
            percentual_comissao REAL DEFAULT 10.0,
            observacoes TEXT,
            status TEXT DEFAULT 'rascunho',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("  + table fechamentos_operacionais")

# ── comissoes ────────────────────────────────────────────────────────────────
if "comissoes" not in tables:
    cur.execute("""
        CREATE TABLE comissoes (
            id INTEGER PRIMARY KEY,
            organizer_id INTEGER NOT NULL REFERENCES organizers(id),
            os_id INTEGER REFERENCES ordens_servico(id),
            fechamento_id INTEGER REFERENCES fechamentos_operacionais(id),
            valor REAL DEFAULT 0,
            percentual REAL DEFAULT 10.0,
            status TEXT DEFAULT 'pendente',
            data_pagamento DATETIME,
            observacoes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("  + table comissoes")

conn.commit()
conn.close()
print("Migration complete.")
