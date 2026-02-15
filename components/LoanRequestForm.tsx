
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Package, Search, CheckCircle, AlertCircle, X, Plus, Trash2, Send } from 'lucide-react';

interface StockItem {
    id: string;
    material: string;
    tipo_de_material: string;
    qtdisponivel: number;
    entrada: number;
    saida: number;
}

interface SelectedItem {
    id_material: string;
    material: string;
    quantidade: number;
    disponivel: number;
}

interface LoanRequestFormProps {
    user: any;
    onSuccess: () => void;
    onCancel: () => void;
}

const LoanRequestForm: React.FC<LoanRequestFormProps> = ({ user, onSuccess, onCancel }) => {
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [selectedBatch, setSelectedBatch] = useState<SelectedItem[]>([]);

    useEffect(() => {
        fetchAvailableItems();
    }, []);

    const fetchAvailableItems = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('gestao_estoque')
                .select('*')
                .order('material');

            if (error) throw error;

            setItems(data || []);
        } catch (err) {
            console.error('Error fetching inventory:', err);
            setError('Erro ao carregar itens do estoque.');
        } finally {
            setLoading(false);
        }
    };

    const addToBatch = (item: StockItem) => {
        const available = item.entrada - item.saida;
        const qtdInput = document.getElementById(`qtd-${item.id}`) as HTMLInputElement;
        const qtd = qtdInput ? parseInt(qtdInput.value) : 1;

        if (selectedBatch.some(i => i.id_material === item.id)) {
            alert('Item já adicionado na lista!');
            return;
        }

        setSelectedBatch([...selectedBatch, {
            id_material: item.id,
            material: item.material,
            quantidade: qtd,
            disponivel: available
        }]);
    };

    const removeFromBatch = (id: string) => {
        setSelectedBatch(selectedBatch.filter(i => i.id_material !== id));
    };

    const handleSubmitBatch = async () => {
        if (!user || selectedBatch.length === 0) return;

        try {
            setSubmitting(true);

            const inserts = selectedBatch.map(item => ({
                id_material: item.id_material,
                id_usuario: user.id,
                status: 'Pendente',
                observacao: '',
                quantidade: item.quantidade
            }));

            const { error } = await supabase
                .from('movimentacao_cautela')
                .insert(inserts);

            if (error) throw error;

            alert('Todas as solicitações foram enviadas com sucesso! Aguarde aprovação.');
            onSuccess();
        } catch (err: any) {
            console.error('Error submitting batch request:', err);
            alert('Erro ao enviar solicitações: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tipo_de_material?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-xl overflow-hidden sm:max-w-6xl mx-auto border border-slate-100 animate-fade-in flex flex-col max-h-[90vh]">
            <div className="bg-blue-600 px-4 py-4 sm:px-8 sm:py-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="bg-white/20 p-2 sm:p-3 rounded-full shrink-0">
                        <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-2xl font-bold text-white truncate">Solicitar Material</h2>
                        <p className="text-blue-100 text-[10px] sm:text-sm truncate">Selecione um ou mais materiais para sua cautela</p>
                    </div>
                </div>
                <button
                    onClick={onCancel}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Available Materials List */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto border-r border-slate-100 bg-slate-50/50">
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar material no estoque..."
                            className="w-full pl-9 sm:pl-10 pr-4 py-3 text-sm sm:text-base bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            <div className="text-center py-12 text-slate-400 font-medium">Carregando estoque...</div>
                        ) : filteredItems.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-medium italic">
                                Nenhum material encontrado.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {filteredItems.map(item => {
                                    const available = item.entrada - item.saida;
                                    const hasStock = available > 0;
                                    const isAdded = selectedBatch.some(i => i.id_material === item.id);

                                    return (
                                        <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border rounded-2xl transition-all gap-4 ${isAdded ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 hover:border-blue-300 hover:shadow-lg shadow-sm'}`}>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-bold text-slate-900 truncate">{item.material}</h3>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.tipo_de_material}</p>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <span className="block text-[9px] uppercase font-bold text-slate-400 leading-tight">Estoque</span>
                                                    <span className={`font-mono font-black ${hasStock ? 'text-blue-600' : 'text-red-500'}`}>
                                                        {available}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={available}
                                                        defaultValue="1"
                                                        id={`qtd-${item.id}`}
                                                        disabled={isAdded || !hasStock}
                                                        className="w-14 h-10 px-2 border border-slate-300 rounded-xl text-center text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            if (val > available) e.target.value = String(available);
                                                            if (val < 1) e.target.value = "1";
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => addToBatch(item)}
                                                        disabled={submitting || !hasStock || isAdded}
                                                        className={`h-10 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isAdded ? 'bg-green-100 text-green-700' : hasStock ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                                    >
                                                        {isAdded ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                        {isAdded ? 'Adicionado' : 'Adicionar'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Selected Items (Cart) */}
                <div className="w-full md:w-80 lg:w-96 bg-white p-4 sm:p-6 overflow-y-auto flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-6 shrink-0">
                        <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-600" />
                            Itens Selecionados ({selectedBatch.length})
                        </h3>
                    </div>

                    <div className="flex-1 space-y-3 min-h-[100px]">
                        {selectedBatch.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 opacity-60">
                                <Plus className="w-8 h-8 opacity-20" />
                                <p className="text-xs font-bold text-center">Nenhum item selecionado.<br />Clique em "+" para adicionar.</p>
                            </div>
                        ) : (
                            selectedBatch.map(item => (
                                <div key={item.id_material} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between group animate-scale-in">
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-800 text-xs truncate">{item.material}</p>
                                        <p className="text-[10px] text-slate-500 font-medium">Qtd: <span className="font-bold text-blue-600">{item.quantidade}</span></p>
                                    </div>
                                    <button
                                        onClick={() => removeFromBatch(item.id_material)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-6 space-y-3 pt-6 border-t border-slate-100 shrink-0">
                        <button
                            onClick={handleSubmitBatch}
                            disabled={submitting || selectedBatch.length === 0}
                            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                            {submitting ? 'Enviando...' : 'Enviar Solicitação'}
                        </button>
                        <button
                            onClick={onCancel}
                            disabled={submitting}
                            className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all opacity-80"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoanRequestForm;
