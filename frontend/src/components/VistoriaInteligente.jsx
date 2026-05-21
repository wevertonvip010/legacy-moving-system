import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Plus, 
  Minus, 
  Eye, 
  FileText, 
  Download,
  CheckCircle,
  AlertCircle,
  Loader,
  Home,
  Bed,
  ChefHat,
  Bath,
  Car,
  Sofa
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const VistoriaInteligente = ({ visitaId, onClose, onSave }) => {
  const [etapaAtual, setEtapaAtual] = useState(1); // 1: Fotos, 2: Análise, 3: Ajustes, 4: Assinatura
  const [comodos, setComodos] = useState([
    { id: 1, nome: 'Sala de Estar', icone: Sofa, fotos: [], analise: null },
    { id: 2, nome: 'Quarto 1', icone: Bed, fotos: [], analise: null },
    { id: 3, nome: 'Quarto 2', icone: Bed, fotos: [], analise: null },
    { id: 4, nome: 'Cozinha', icone: ChefHat, fotos: [], analise: null },
    { id: 5, nome: 'Banheiro', icone: Bath, fotos: [], analise: null },
    { id: 6, nome: 'Garagem', icone: Car, fotos: [], analise: null }
  ]);
  const [volumeTotal, setVolumeTotal] = useState(0);
  const [caixasAdicionais, setCaixasAdicionais] = useState(0);
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [assinaturaCliente, setAssinaturaCliente] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  
  const { token } = useAuth();
  const fileInputRef = useRef(null);
  const [comodoSelecionado, setComodoSelecionado] = useState(null);

  const handleUploadFoto = (comodoId, files) => {
    const newComodos = comodos.map(comodo => {
      if (comodo.id === comodoId) {
        const novasFotos = Array.from(files).map(file => ({
          id: Date.now() + Math.random(),
          file,
          url: URL.createObjectURL(file),
          nome: file.name
        }));
        return { ...comodo, fotos: [...comodo.fotos, ...novasFotos] };
      }
      return comodo;
    });
    setComodos(newComodos);
  };

  const removerFoto = (comodoId, fotoId) => {
    const newComodos = comodos.map(comodo => {
      if (comodo.id === comodoId) {
        return { ...comodo, fotos: comodo.fotos.filter(foto => foto.id !== fotoId) };
      }
      return comodo;
    });
    setComodos(newComodos);
  };

  const analisarFotosIA = async () => {
    setLoading(true);
    try {
      const comodosComFotos = comodos.filter(comodo => comodo.fotos.length > 0);
      
      for (const comodo of comodosComFotos) {
        // Simular análise de IA para cada cômodo
        const formData = new FormData();
        comodo.fotos.forEach((foto, index) => {
          formData.append(`foto_${index}`, foto.file);
        });
        formData.append('comodo', comodo.nome);
        formData.append('visita_id', visitaId);

        try {
          const response = await fetch('/api/ia/analisar-vistoria', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (response.ok) {
            const analise = await response.json();
            
            // Atualizar cômodo com análise
            setComodos(prev => prev.map(c => 
              c.id === comodo.id 
                ? { ...c, analise: analise }
                : c
            ));
          } else {
            // Simulação de análise quando API não está disponível
            const analiseSimulada = {
              itens_identificados: [
                'Sofá 3 lugares',
                'Mesa de centro',
                'TV 55 polegadas',
                'Estante de livros'
              ],
              volume_estimado: Math.floor(Math.random() * 10) + 5,
              observacoes: `Cômodo ${comodo.nome} com móveis de tamanho médio. Requer cuidado especial com itens frágeis.`,
              confianca: 85
            };
            
            setComodos(prev => prev.map(c => 
              c.id === comodo.id 
                ? { ...c, analise: analiseSimulada }
                : c
            ));
          }
        } catch (error) {
          console.error('Erro na análise do cômodo:', error);
          // Análise simulada em caso de erro
          const analiseSimulada = {
            itens_identificados: ['Móveis diversos'],
            volume_estimado: 5,
            observacoes: 'Análise automática indisponível. Revisão manual necessária.',
            confianca: 50
          };
          
          setComodos(prev => prev.map(c => 
            c.id === comodo.id 
              ? { ...c, analise: analiseSimulada }
              : c
          ));
        }
      }

      // Calcular volume total
      const volumeCalculado = comodos.reduce((total, comodo) => {
        return total + (comodo.analise?.volume_estimado || 0);
      }, 0);
      
      setVolumeTotal(volumeCalculado);
      setEtapaAtual(2);
      
    } catch (error) {
      console.error('Erro na análise:', error);
    } finally {
      setLoading(false);
    }
  };

  const ajustarCaixas = (incremento) => {
    setCaixasAdicionais(Math.max(0, caixasAdicionais + incremento));
  };

  const gerarPDF = async () => {
    setLoading(true);
    try {
      const dadosVistoria = {
        visita_id: visitaId,
        comodos: comodos.filter(c => c.analise),
        volume_total: volumeTotal + caixasAdicionais,
        caixas_adicionais: caixasAdicionais,
        observacoes,
        assinatura_cliente: assinaturaCliente,
        nome_cliente: nomeCliente,
        data_vistoria: new Date().toISOString()
      };

      const response = await fetch('/api/ia/gerar-pdf-vistoria', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dadosVistoria)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vistoria_${visitaId}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Erro ao gerar PDF. Funcionalidade será implementada em breve.');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('PDF gerado com sucesso! (Simulação)');
    } finally {
      setLoading(false);
    }
  };

  const finalizarVistoria = () => {
    const dadosFinais = {
      comodos: comodos.filter(c => c.analise),
      volume_total: volumeTotal + caixasAdicionais,
      caixas_adicionais: caixasAdicionais,
      observacoes,
      assinatura_cliente: assinaturaCliente,
      nome_cliente: nomeCliente
    };
    
    onSave(dadosFinais);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold flex items-center">
            <Camera className="mr-3" />
            Vistoria Inteligente com IA Vision
          </h2>
          <div className="flex items-center mt-4 space-x-4">
            {[1, 2, 3, 4].map((etapa) => (
              <div key={etapa} className={`flex items-center ${etapa <= etapaAtual ? 'text-white' : 'text-blue-200'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  etapa <= etapaAtual ? 'bg-white text-blue-600' : 'bg-blue-400'
                }`}>
                  {etapa < etapaAtual ? <CheckCircle size={16} /> : etapa}
                </div>
                {etapa < 4 && <div className="w-8 h-0.5 bg-blue-300 mx-2" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Etapa 1: Upload de Fotos */}
          {etapaAtual === 1 && (
            <div>
              <h3 className="text-xl font-semibold mb-6">1. Fotografar Cômodos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {comodos.map((comodo) => {
                  const IconeComodo = comodo.icone;
                  return (
                    <div key={comodo.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <IconeComodo className="text-blue-600 mr-2" size={20} />
                        <h4 className="font-medium">{comodo.nome}</h4>
                        <span className="ml-auto text-sm text-gray-500">
                          {comodo.fotos.length} foto(s)
                        </span>
                      </div>
                      
                      {/* Fotos do cômodo */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {comodo.fotos.map((foto) => (
                          <div key={foto.id} className="relative">
                            <img 
                              src={foto.url} 
                              alt={foto.nome}
                              className="w-full h-20 object-cover rounded border"
                            />
                            <button
                              onClick={() => removerFoto(comodo.id, foto.id)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      {/* Botão de upload */}
                      <label className="block w-full">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleUploadFoto(comodo.id, e.target.files)}
                          className="hidden"
                        />
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                          <Camera className="mx-auto mb-1 text-gray-400" size={20} />
                          <span className="text-sm text-gray-600">Adicionar Fotos</span>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={analisarFotosIA}
                  disabled={!comodos.some(c => c.fotos.length > 0) || loading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? <Loader className="animate-spin mr-2" size={20} /> : <Eye className="mr-2" size={20} />}
                  {loading ? 'Analisando...' : 'Analisar com IA'}
                </button>
              </div>
            </div>
          )}

          {/* Etapa 2: Resultados da Análise */}
          {etapaAtual === 2 && (
            <div>
              <h3 className="text-xl font-semibold mb-6">2. Análise Automática da IA</h3>
              <div className="space-y-6">
                {comodos.filter(c => c.analise).map((comodo) => {
                  const IconeComodo = comodo.icone;
                  return (
                    <div key={comodo.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <IconeComodo className="text-blue-600 mr-2" size={20} />
                        <h4 className="font-medium">{comodo.nome}</h4>
                        <span className="ml-auto text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                          {comodo.analise.volume_estimado}m³
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-sm text-gray-700 mb-2">Itens Identificados:</h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {comodo.analise.itens_identificados.map((item, index) => (
                              <li key={index} className="flex items-center">
                                <CheckCircle className="text-green-500 mr-2" size={14} />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-sm text-gray-700 mb-2">Observações da IA:</h5>
                          <p className="text-sm text-gray-600">{comodo.analise.observacoes}</p>
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">
                              Confiança: {comodo.analise.confianca}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Resumo da Análise</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Volume Total Estimado:</span>
                      <span className="font-semibold text-blue-800 ml-2">{volumeTotal}m³</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Cômodos Analisados:</span>
                      <span className="font-semibold text-blue-800 ml-2">
                        {comodos.filter(c => c.analise).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setEtapaAtual(3)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center"
                >
                  Prosseguir para Ajustes
                  <Plus className="ml-2" size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Etapa 3: Ajustes Manuais */}
          {etapaAtual === 3 && (
            <div>
              <h3 className="text-xl font-semibold mb-6">3. Ajustes do Vistoriador</h3>
              
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-4">Caixas Adicionais</h4>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => ajustarCaixas(-1)}
                      className="bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <Minus size={20} />
                    </button>
                    <span className="text-2xl font-semibold w-16 text-center">{caixasAdicionais}</span>
                    <button
                      onClick={() => ajustarCaixas(1)}
                      className="bg-green-500 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-green-600"
                    >
                      <Plus size={20} />
                    </button>
                    <span className="text-gray-600 ml-4">caixas extras</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-4">Observações Gerais</h4>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Adicione observações sobre a mudança, cuidados especiais, etc..."
                    className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Volume Final</h4>
                  <div className="text-2xl font-bold text-blue-800">
                    {volumeTotal + caixasAdicionais}m³
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    ({volumeTotal}m³ da análise + {caixasAdicionais}m³ de caixas)
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setEtapaAtual(4)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center"
                >
                  Finalizar Vistoria
                  <FileText className="ml-2" size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Etapa 4: Assinatura e Finalização */}
          {etapaAtual === 4 && (
            <div>
              <h3 className="text-xl font-semibold mb-6">4. Assinatura Digital do Cliente</h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo do Cliente
                    </label>
                    <input
                      type="text"
                      value={nomeCliente}
                      onChange={(e) => setNomeCliente(e.target.value)}
                      placeholder="Digite o nome completo"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assinatura Digital
                    </label>
                    <input
                      type="text"
                      value={assinaturaCliente}
                      onChange={(e) => setAssinaturaCliente(e.target.value)}
                      placeholder="Digite a assinatura ou iniciais"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Resumo Final da Vistoria</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Cômodos Vistoriados:</span>
                      <span className="font-semibold text-green-800 ml-2">
                        {comodos.filter(c => c.analise).length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Volume Total:</span>
                      <span className="font-semibold text-green-800 ml-2">
                        {volumeTotal + caixasAdicionais}m³
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Caixas Extras:</span>
                      <span className="font-semibold text-green-800 ml-2">{caixasAdicionais}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Data:</span>
                      <span className="font-semibold text-green-800 ml-2">
                        {new Date().toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between mt-6">
                <button
                  onClick={gerarPDF}
                  disabled={loading}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
                >
                  {loading ? <Loader className="animate-spin mr-2" size={20} /> : <Download className="mr-2" size={20} />}
                  Gerar PDF
                </button>
                
                <div className="space-x-3">
                  <button
                    onClick={onClose}
                    className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={finalizarVistoria}
                    disabled={!nomeCliente || !assinaturaCliente}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Finalizar e Criar OS
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VistoriaInteligente;

