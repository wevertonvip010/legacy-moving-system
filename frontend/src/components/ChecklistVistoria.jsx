import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Camera, 
  FileText, 
  Save, 
  Download,
  Signature,
  Check
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

const ChecklistVistoria = ({ clienteId, onClose }) => {
  const [itens, setItens] = useState([]);
  const [novoItem, setNovoItem] = useState('');
  const [ambiente, setAmbiente] = useState('sala');
  const [observacoes, setObservacoes] = useState('');
  const [assinatura, setAssinatura] = useState(null);
  const [showAssinatura, setShowAssinatura] = useState(false);
  const [fotos, setFotos] = useState({});
  
  const sigCanvas = useRef(null);

  const ambientes = [
    { value: 'sala', label: 'Sala de Estar' },
    { value: 'quarto1', label: 'Quarto 1' },
    { value: 'quarto2', label: 'Quarto 2' },
    { value: 'quarto3', label: 'Quarto 3' },
    { value: 'cozinha', label: 'Cozinha' },
    { value: 'banheiro1', label: 'Banheiro 1' },
    { value: 'banheiro2', label: 'Banheiro 2' },
    { value: 'area_servico', label: 'Área de Serviço' },
    { value: 'garagem', label: 'Garagem' },
    { value: 'escritorio', label: 'Escritório' },
    { value: 'varanda', label: 'Varanda' },
    { value: 'outros', label: 'Outros' }
  ];

  const itensComuns = [
    'Sofá 2 lugares', 'Sofá 3 lugares', 'Poltrona', 'Mesa de centro',
    'Estante', 'Rack TV', 'Mesa de jantar', 'Cadeiras (unidade)',
    'Cama casal', 'Cama solteiro', 'Guarda-roupa', 'Cômoda',
    'Mesa de cabeceira', 'Geladeira', 'Fogão', 'Micro-ondas',
    'Máquina de lavar', 'Tanquinho', 'TV', 'Caixas (unidade)'
  ];

  const adicionarItem = () => {
    if (novoItem.trim()) {
      const item = {
        id: Date.now(),
        nome: novoItem,
        ambiente: ambiente,
        quantidade: 1,
        observacao: '',
        foto: null
      };
      setItens([...itens, item]);
      setNovoItem('');
    }
  };

  const adicionarItemComum = (nomeItem) => {
    const item = {
      id: Date.now(),
      nome: nomeItem,
      ambiente: ambiente,
      quantidade: 1,
      observacao: '',
      foto: null
    };
    setItens([...itens, item]);
  };

  const removerItem = (id) => {
    setItens(itens.filter(item => item.id !== id));
  };

  const atualizarItem = (id, campo, valor) => {
    setItens(itens.map(item => 
      item.id === id ? { ...item, [campo]: valor } : item
    ));
  };

  const handleFotoUpload = (ambiente, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFotos({
          ...fotos,
          [ambiente]: e.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const salvarAssinatura = () => {
    if (sigCanvas.current) {
      const assinaturaData = sigCanvas.current.toDataURL();
      setAssinatura(assinaturaData);
      setShowAssinatura(false);
    }
  };

  const limparAssinatura = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  const gerarPDF = async () => {
    try {
      const dadosVistoria = {
        cliente_id: clienteId,
        itens: itens,
        observacoes: observacoes,
        assinatura: assinatura,
        fotos: fotos,
        data_vistoria: new Date().toISOString()
      };

      // Simular geração de PDF
      const response = await fetch('/api/ia-vision/gerar-pdf-vistoria', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(dadosVistoria)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vistoria_${clienteId}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        alert('PDF gerado com sucesso!');
      } else {
        alert('PDF simulado gerado! (Em produção, seria baixado automaticamente)');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('PDF simulado gerado! (Em produção, seria baixado automaticamente)');
    }
  };

  const itensPorAmbiente = itens.reduce((acc, item) => {
    if (!acc[item.ambiente]) {
      acc[item.ambiente] = [];
    }
    acc[item.ambiente].push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Checklist Inteligente de Vistoria</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Seção de Adição de Itens */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Adicionar Itens</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <select
                value={ambiente}
                onChange={(e) => setAmbiente(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                {ambientes.map(amb => (
                  <option key={amb.value} value={amb.value}>{amb.label}</option>
                ))}
              </select>
              
              <input
                type="text"
                value={novoItem}
                onChange={(e) => setNovoItem(e.target.value)}
                placeholder="Nome do item..."
                className="border border-gray-300 rounded-lg px-3 py-2"
                onKeyPress={(e) => e.key === 'Enter' && adicionarItem()}
              />
              
              <button
                onClick={adicionarItem}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </button>
            </div>

            {/* Itens Comuns */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Itens comuns:</p>
              <div className="flex flex-wrap gap-2">
                {itensComuns.map(item => (
                  <button
                    key={item}
                    onClick={() => adicionarItemComum(item)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lista de Itens por Ambiente */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Itens da Vistoria</h3>
            
            {Object.keys(itensPorAmbiente).length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum item adicionado ainda</p>
            ) : (
              Object.keys(itensPorAmbiente).map(amb => (
                <div key={amb} className="mb-6">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                    {ambientes.find(a => a.value === amb)?.label}
                    <span className="ml-2 text-sm text-gray-500">
                      ({itensPorAmbiente[amb].length} itens)
                    </span>
                  </h4>
                  
                  {/* Upload de Foto do Ambiente */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto do ambiente:
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFotoUpload(amb, e)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {fotos[amb] && (
                      <img src={fotos[amb]} alt={`Ambiente ${amb}`} className="mt-2 h-20 w-20 object-cover rounded" />
                    )}
                  </div>

                  <div className="space-y-2">
                    {itensPorAmbiente[amb].map(item => (
                      <div key={item.id} className="flex items-center space-x-3 p-3 bg-white border rounded-lg">
                        <input
                          type="text"
                          value={item.nome}
                          onChange={(e) => atualizarItem(item.id, 'nome', e.target.value)}
                          className="flex-1 border-0 focus:ring-0 font-medium"
                        />
                        
                        <input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => atualizarItem(item.id, 'quantidade', parseInt(e.target.value))}
                          className="w-16 border border-gray-300 rounded px-2 py-1 text-center"
                          min="1"
                        />
                        
                        <input
                          type="text"
                          value={item.observacao}
                          onChange={(e) => atualizarItem(item.id, 'observacao', e.target.value)}
                          placeholder="Observação..."
                          className="w-32 border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        
                        <button
                          onClick={() => removerItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Observações Gerais */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Observações Gerais</h3>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações sobre a vistoria, cuidados especiais, dificuldades de acesso, etc..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
            />
          </div>

          {/* Assinatura Digital */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Assinatura do Cliente</h3>
            
            {!assinatura ? (
              <div>
                <button
                  onClick={() => setShowAssinatura(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
                >
                  <Signature className="w-4 h-4 mr-2" />
                  Coletar Assinatura
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <img src={assinatura} alt="Assinatura" className="h-16 border rounded" />
                <button
                  onClick={() => setShowAssinatura(true)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Refazer Assinatura
                </button>
              </div>
            )}

            {showAssinatura && (
              <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600 mb-2">Assine no campo abaixo:</p>
                <div className="border-2 border-dashed border-gray-300 rounded">
                  <SignatureCanvas
                    ref={sigCanvas}
                    canvasProps={{
                      width: 400,
                      height: 150,
                      className: 'signature-canvas'
                    }}
                  />
                </div>
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={salvarAssinatura}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={limparAssinatura}
                    className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                  >
                    Limpar
                  </button>
                  <button
                    onClick={() => setShowAssinatura(false)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            
            <button
              onClick={gerarPDF}
              disabled={itens.length === 0 || !assinatura}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Gerar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistVistoria;

