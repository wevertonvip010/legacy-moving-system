import urllib.request, json, datetime

BASE = 'http://localhost:5000/api'
TODAY = datetime.date.today().isoformat()

def req(method, path, data=None, token=None):
    url = BASE + path
    body = json.dumps(data).encode() if data is not None else None
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {'_error': e.code, '_body': e.read().decode()[:300]}

# 1. Login
print('1. Login...')
r = req('POST', '/auth/login', {'cpf': '12345678901', 'password': '123456'})
TOKEN = r.get('token')
assert TOKEN, f'Login falhou: {r}'
print('   OK')

# 2. Create lead
print('2. Criando lead...')
r = req('POST', '/leads', {
    'nome': 'Maria Teste Silva',
    'telefone': '(11) 99999-1234',
    'email': 'maria.teste@email.com',
    'origem': 'instagram',
    'cidade_origem': 'Sao Paulo',
    'cidade_destino': 'Rio de Janeiro'
}, TOKEN)
lid = r.get('id')
assert lid, f'Lead falhou: {r}'
print(f'   Lead id={lid}')

# 3. Classify
print('3. Classificando AA...')
r = req('PUT', f'/leads/{lid}', {'classificacao': 'AA', 'status': 'contato_feito'}, TOKEN)
assert r.get('classificacao') == 'AA', f'Classify falhou: {r}'
print('   OK')

# 4. Convert to orcamento
print('4. Convertendo em orcamento...')
r = req('POST', f'/leads/{lid}/converter', {}, TOKEN)
oid = r.get('id') or (r.get('orcamento') or {}).get('id')
if not oid:
    orcs = req('GET', '/orcamentos', token=TOKEN)
    orcs = orcs if isinstance(orcs, list) else orcs.get('orcamentos', [])
    oid = orcs[-1]['id'] if orcs else None
assert oid, f'Converter falhou: {r}'
print(f'   Orcamento id={oid}')

# 5. Approve via POST /aprovar
print('5. Aprovando orcamento...')
r = req('POST', f'/orcamentos/{oid}/aprovar', {}, TOKEN)
cid = (r.get('cadastro') or {}).get('id')
assert cid, f'Aprovar falhou: {r}'
print(f'   CadastroComplementar id={cid}')

# 6. Complete cadastro (requires cpf_cnpj + data_confirmada)
print('6. Completando cadastro...')
r = req('PUT', f'/cadastro-complementar/{cid}', {
    'cpf_cnpj': '987.654.321-00',
    'dados_para_contrato': 'Mudanca residencial completa. Valor acordado R$3.500.',
    'data_confirmada': TODAY,
    'orig_rua': 'Av. Paulista', 'orig_numero': '1000', 'orig_bairro': 'Bela Vista',
    'orig_cidade': 'Sao Paulo', 'orig_estado': 'SP', 'orig_cep': '01310-100',
    'dest_rua': 'Av. Rio Branco', 'dest_numero': '500', 'dest_bairro': 'Centro',
    'dest_cidade': 'Rio de Janeiro', 'dest_estado': 'RJ', 'dest_cep': '20040-020'
}, TOKEN)
assert r.get('status') == 'completo', f'Cadastro completo falhou: {r}'
print('   status=completo')

# 7. Generate contract
print('7. Gerando contrato...')
r = req('POST', f'/cadastro-complementar/{cid}/gerar-contrato', {}, TOKEN)
ctid = r.get('id') or (r.get('contrato') or {}).get('id')
assert ctid, f'Gerar contrato falhou: {r}'
print(f'   Contrato id={ctid}')

# 7b. Sign contract
print('7b. Assinando contrato...')
r = req('PUT', f'/contratos/{ctid}', {'status': 'assinado'}, TOKEN)
assert r.get('status') == 'assinado', f'Assinar contrato falhou: {r}'
print('   status=assinado')

# 8. Generate OS
print('8. Gerando OS...')
r = req('POST', f'/contratos/{ctid}/gerar-os', {}, TOKEN)
osid = r.get('id') or (r.get('os') or {}).get('id')
assert osid, f'Gerar OS falhou: {r}'
print(f'   OS id={osid}')

# 9. Start OS
print('9. Iniciando OS...')
r = req('POST', f'/os/{osid}/iniciar', {}, TOKEN)
assert r.get('status') == 'em_andamento', f'Iniciar OS falhou: {r}'
print('   status=em_andamento')

# 10. Conclude OS
print('10. Concluindo OS...')
r = req('POST', f'/os/{osid}/concluir', {'valor_total': 3500.0}, TOKEN)
rid = r.get('recibo_id') or (r.get('recibo') or {}).get('id')
if not rid:
    recibos = req('GET', '/recibos', token=TOKEN)
    recibos = recibos if isinstance(recibos, list) else recibos.get('recibos', [])
    rid = recibos[-1]['id'] if recibos else None
assert rid, f'Concluir OS falhou: {r}'
print(f'   OS concluida, Recibo id={rid}')

# 11. Confirm payment
print('11. Confirmando pagamento...')
r = req('POST', f'/recibos/{rid}/receber', {'forma_pagamento': 'pix', 'data_pagamento': TODAY}, TOKEN)
assert r.get('status') in ('pago', 'recebido'), f'Confirmar pagamento falhou: {r}'
print(f'   Recibo confirmado: status={r.get("status")} numero={r.get("numero")}')

print()
print('=== PIPELINE COMPLETO ===')
print(f'Lead={lid} | Orc={oid} | Cad={cid} | Contrato={ctid} | OS={osid} | Recibo={rid}')
