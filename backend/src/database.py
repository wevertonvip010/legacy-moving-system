import logging
from datetime import datetime

class MockCollection:
    def __init__(self):
        self.data = []
        self.counter = 1
    
    def find_one(self, query=None):
        if not query:
            return self.data[0] if self.data else None
        
        for item in self.data:
            match = True
            for key, value in query.items():
                if key not in item or item[key] != value:
                    match = False
                    break
            if match:
                return item
        return None
    
    def find(self, query=None):
        if not query:
            return self.data
        
        results = []
        for item in self.data:
            match = True
            for key, value in query.items():
                if key not in item or item[key] != value:
                    match = False
                    break
            if match:
                results.append(item)
        return results
    
    def insert_one(self, data):
        data['_id'] = str(self.counter)
        self.counter += 1
        self.data.append(data)
        return type('Result', (), {'inserted_id': data['_id']})()
    
    def update_one(self, query, update):
        item = self.find_one(query)
        if item:
            if '$set' in update:
                item.update(update['$set'])
            return type('Result', (), {'modified_count': 1})()
        return type('Result', (), {'modified_count': 0})()
    
    def sort(self, field, direction=-1):
        return sorted(self.data, key=lambda x: x.get(field, ''), reverse=(direction == -1))

class MockDatabase:
    def __init__(self):
        self.users = MockCollection()
        self.clientes = MockCollection()
        self.leads = MockCollection()
        self.licitacoes = MockCollection()
        self.orcamentos = MockCollection()
        self.financeiro = MockCollection()
        self.guarda_moveis = MockCollection()
        self.estoque = MockCollection()
        self.programacoes = MockCollection()
        self.metas = MockCollection()
        self.ordens_servico = MockCollection()

class Database:
    _instance = None
    _db = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._db is None:
            try:
                # Usar banco em memória para desenvolvimento
                self._db = MockDatabase()
                logging.info("Usando banco de dados em memória para desenvolvimento")
                
            except Exception as e:
                logging.error(f"Erro ao configurar banco: {e}")
                self._db = MockDatabase()
    
    @property
    def db(self):
        return self._db

# Instância global do banco
db = Database().db

