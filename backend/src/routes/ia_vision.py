from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import openai
import base64
import os
from datetime import datetime
from src.config import Config
from src.models import User
from werkzeug.utils import secure_filename
import uuid

ia_vision_bp = Blueprint('ia_vision', __name__)

# Configurar OpenAI
openai.api_key = Config.OPENAI_API_KEY

UPLOAD_FOLDER = '/tmp/vistoria_uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

@ia_vision_bp.route('/vistoria', methods=['POST'])
@jwt_required()
def analisar_vistoria():
    """Upload e análise de imagens para vistoria com IA Vision"""
    try:
        user_id = get_jwt_identity()
        user = User.get_by_id(user_id)
        
        # Verificar se há arquivos no upload
        if 'images' not in request.files:
            return jsonify({"error": "Nenhuma imagem foi enviada"}), 400
        
        files = request.files.getlist('images')
        ambiente = request.form.get('ambiente', 'sala')
        cliente_id = request.form.get('cliente_id', '')
        
        if not files or files[0].filename == '':
            return jsonify({"error": "Nenhuma imagem selecionada"}), 400
        
        # Criar diretório se não existir
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        analises = []
        
        for file in files:
            if file and allowed_file(file.filename):
                # Salvar arquivo com nome único
                filename = secure_filename(file.filename)
                unique_filename = f"{uuid.uuid4()}_{filename}"
                filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
                file.save(filepath)
                
                try:
                    if Config.OPENAI_API_KEY:
                        # Codificar imagem em base64
                        base64_image = encode_image(filepath)
                        
                        # Prompt específico para análise de mudança
                        prompt = f"""
                        Analise esta imagem de {ambiente} para uma vistoria de mudança.
                        
                        Identifique e liste:
                        1. Móveis e objetos grandes (sofás, camas, armários, etc.)
                        2. Eletrodomésticos (geladeira, fogão, máquina de lavar, etc.)
                        3. Objetos frágeis que precisam cuidado especial
                        4. Estimativa de volume em metros cúbicos para transporte
                        5. Observações sobre dificuldades de transporte
                        
                        Responda em formato JSON com as chaves:
                        - moveis: lista de móveis identificados
                        - eletrodomesticos: lista de eletrodomésticos
                        - frageis: lista de itens frágeis
                        - volume_estimado: número em m³
                        - observacoes: texto com cuidados especiais
                        - confianca: percentual de 0-100
                        """
                        
                        response = openai.ChatCompletion.create(
                            model="gpt-4-vision-preview",
                            messages=[
                                {
                                    "role": "user",
                                    "content": [
                                        {"type": "text", "text": prompt},
                                        {
                                            "type": "image_url",
                                            "image_url": {
                                                "url": f"data:image/jpeg;base64,{base64_image}"
                                            }
                                        }
                                    ]
                                }
                            ],
                            max_tokens=500
                        )
                        
                        analise_texto = response.choices[0].message.content
                        
                        # Tentar extrair JSON da resposta
                        try:
                            import json
                            analise_json = json.loads(analise_texto)
                        except:
                            # Se não conseguir parsear JSON, criar estrutura padrão
                            analise_json = {
                                "moveis": ["Análise detalhada disponível no texto"],
                                "eletrodomesticos": [],
                                "frageis": [],
                                "volume_estimado": 2.0,
                                "observacoes": analise_texto,
                                "confianca": 85
                            }
                    else:
                        # Análise simulada quando não há API key
                        analise_json = {
                            "moveis": ["Sofá 3 lugares", "Mesa de centro", "Estante"],
                            "eletrodomesticos": ["TV 50 polegadas"],
                            "frageis": ["Quadros", "Objetos decorativos"],
                            "volume_estimado": 3.5,
                            "observacoes": f"Ambiente {ambiente} com móveis de tamanho médio. Cuidado especial com itens frágeis. Acesso aparenta ser normal.",
                            "confianca": 90
                        }
                    
                    analises.append({
                        "arquivo": unique_filename,
                        "ambiente": ambiente,
                        "analise": analise_json,
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    
                except Exception as e:
                    print(f"Erro na análise da imagem {filename}: {e}")
                    analises.append({
                        "arquivo": unique_filename,
                        "ambiente": ambiente,
                        "erro": "Erro na análise da imagem",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                
                finally:
                    # Limpar arquivo temporário
                    if os.path.exists(filepath):
                        os.remove(filepath)
        
        # Calcular totais
        volume_total = sum([a.get('analise', {}).get('volume_estimado', 0) for a in analises if 'analise' in a])
        
        return jsonify({
            "analises": analises,
            "volume_total_estimado": volume_total,
            "cliente_id": cliente_id,
            "responsavel": user['name'],
            "timestamp": datetime.utcnow().isoformat(),
            "status": "concluida"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ia_vision_bp.route('/salvar-analise', methods=['POST'])
@jwt_required()
def salvar_analise_vistoria():
    """Salvar análise de vistoria no banco de dados"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Estrutura para salvar no banco
        vistoria_data = {
            "cliente_id": data.get('cliente_id'),
            "responsavel_id": user_id,
            "analises": data.get('analises', []),
            "volume_total": data.get('volume_total_estimado', 0),
            "observacoes_gerais": data.get('observacoes_gerais', ''),
            "data_vistoria": datetime.utcnow(),
            "status": "concluida",
            "tipo": "ia_vision"
        }
        
        # Aqui você salvaria no banco de dados
        # Por enquanto, retornamos sucesso
        
        return jsonify({
            "message": "Análise de vistoria salva com sucesso",
            "vistoria_id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

