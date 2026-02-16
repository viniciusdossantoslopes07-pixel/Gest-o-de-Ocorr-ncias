
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
    const [showCartMobile, setShowCartMobile] = useState(false);

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
        <div className="bg-slate-50 w-full h-full sm:h-auto sm:rounded-3xl shadow-2xl overflow-hidden sm:max-w-6xl mx-auto border border-white/20 animate-fade-in flex flex-col max-h-[95vh] relative text-slate-900">
            {/* Header com Gradient Premium */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-4 py-6 sm:px-10 sm:py-8 flex items-center justify-between shrink-0 shadow-lg relative z-10">
                <div className="flex items-center gap-4 sm:gap-6">
                    <div className="bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/20 shadow-inner">
                        <Package className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-pulse" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">Solicitar Material</h2>
                        <p className="text-blue-100/80 text-xs sm:text-base font-medium flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-300" />
                            Monte sua cautela com múltiplos itens de uma vez
                        </p>
                    </div>
                </div>
                <button
                    onClick={onCancel}
                    className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-2xl transition-all border border-transparent hover:border-white/20"
                >
                    <X className="w-7 h-7" />
                </button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Lista de Materiais Disponíveis */}
                <div className="flex-1 p-4 sm:p-8 overflow-y-auto bg-white/40 backdrop-blur-sm custom-scrollbar">
                    <div className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-xl p-1 mb-8 rounded-2xl shadow-sm border border-slate-200/50">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="O que você precisa hoje?"
                                className="w-full pl-12 pr-6 py-4 text-sm sm:text-lg bg-white border-none rounded-xl focus:ring-0 transition-all outline-none font-medium placeholder:text-slate-300"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 pb-20 sm:pb-0">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Consultando Estoque Real...</p>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                                <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                                <p className="font-bold">Nenhum material encontrado.</p>
                                <p className="text-sm">Tente buscar por outro termo ou categoria.</p>
                            </div>
                        ) : (
                            filteredItems.map(item => {
                                const available = item.entrada - item.saida;
                                const hasStock = available > 0;
                                const isAdded = selectedBatch.some(i => i.id_material === item.id);

                                return (
                                    <div key={item.id} className={`group relative flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white border-2 rounded-2xl transition-all duration-300 gap-6 ${isAdded ? 'border-blue-500 shadow-blue-100 ring-4 ring-blue-50' : 'border-slate-100 hover:border-blue-200 hover:shadow-2xl shadow-sm active:scale-[0.98]'}`}>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`w-2 h-2 rounded-full ${hasStock ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">{item.tipo_de_material}</p>
                                            </div>
                                            <h3 className="font-black text-slate-800 text-lg group-hover:text-blue-600 transition-colors uppercase truncate">{item.material}</h3>
                                            <p className="text-xs text-slate-500 font-medium">Cod: {item.id.slice(0, 8)}</p>
                                        </div>

                                        <div className="flex items-center gap-6 sm:gap-8 justify-between sm:justify-end">
                                            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 text-center min-w-[80px]">
                                                <span className="block text-[9px] uppercase font-black text-slate-400 mb-0.5">Disponível</span>
                                                <span className={`text-xl font-black ${hasStock ? 'text-blue-600' : 'text-red-500'}`}>
                                                    {available}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={available}
                                                        defaultValue="1"
                                                        id={`qtd-${item.id}`}
                                                        disabled={isAdded || !hasStock}
                                                        className="w-14 h-12 bg-white border-2 border-slate-100 rounded-xl text-center text-lg font-black text-slate-700 outline-none focus:border-blue-500 transition-all disabled:opacity-50"
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            if (val > available) e.target.value = String(available);
                                                            if (val < 1) e.target.value = "1";
                                                        }}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => addToBatch(item)}
                                                    disabled={submitting || !hasStock || isAdded}
                                                    className={`h-12 px-6 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 ${isAdded ? 'bg-emerald-500 text-white shadow-emerald-200' : hasStock ? 'bg-slate-900 text-white hover:bg-blue-600 shadow-slate-200' : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none border-dashed'}`}
                                                >
                                                    {isAdded ? <CheckCircle className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                                    {isAdded ? 'OK' : 'Selecionar'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Painel Lateral - Carrinho de Itens (Desktop) */}
                <div className={`hidden md:flex w-80 lg:w-96 bg-white p-6 h-full flex-col shadow-[-15px_0_40px_rgba(0,0,0,0.03)] border-l border-slate-100 relative z-20`}>
                    <div className="flex items-center justify-between mb-8 shrink-0">
                        <h3 className="font-black text-slate-900 uppercase text-sm tracking-widest flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-lg">
                                <Send className="w-4 h-4 text-white" />
                            </div>
                            Sua Lista
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px]">{selectedBatch.length}</span>
                        </h3>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar px-1">
                        {selectedBatch.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 py-20 grayscale opacity-40">
                                <div className="p-6 bg-slate-100 rounded-full">
                                    <Package className="w-12 h-12" />
                                </div>
                                <p className="text-xs font-black text-center uppercase tracking-tighter">Nenhum item<br />na lista de cautela</p>
                            </div>
                        ) : (
                            selectedBatch.map(item => (
                                <div key={item.id_material} className="p-4 bg-slate-50/80 border-2 border-slate-100 rounded-2xl flex items-center justify-between group hover:border-blue-200 transition-all animate-scale-in">
                                    <div className="min-w-0">
                                        <p className="font-black text-slate-800 text-xs uppercase truncate leading-tight">{item.material}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Quantidade:</span>
                                            <span className="font-black text-blue-600 text-sm">{item.quantidade}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeFromBatch(item.id_material)}
                                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-8 space-y-4 pt-8 border-t-2 border-slate-50 shrink-0">
                        <button
                            onClick={handleSubmitBatch}
                            disabled={submitting || selectedBatch.length === 0}
                            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-sm tracking-[0.15em] hover:bg-blue-700 shadow-2xl shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Finalizar Solicitação
                                </>
                            )}
                        </button>
                        <button
                            onClick={onCancel}
                            className="w-full bg-slate-100 text-slate-500 py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>

            {/* Barra de Ação Mobile (Sticky Bottom) - CORREÇÃO CRÍTICA SOLICITADA */}
            <div className={`md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-xl border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] z-50 transition-transform duration-500 ease-in-out ${selectedBatch.length > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="max-w-md mx-auto flex gap-3">
                    <button
                        onClick={() => setShowCartMobile(!showCartMobile)}
                        className="relative bg-slate-100 text-slate-700 h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 active:scale-95"
                    >
                        <Package className="w-6 h-6" />
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black h-6 w-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white">{selectedBatch.length}</span>
                    </button>
                    <button
                        onClick={handleSubmitBatch}
                        disabled={submitting || selectedBatch.length === 0}
                        className="flex-1 bg-blue-600 text-white h-14 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                    >
                        <Send className="w-4 h-4" />
                        {submitting ? 'Enviando...' : `Solicitar Solicitação (${selectedBatch.length})`}
                    </button>
                </div>
            </div>

            {/* Modal de Carrinho Mobile */}
            {showCartMobile && (
                <div className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] animate-fade-in flex items-end p-4" onClick={() => setShowCartMobile(false)}>
                    <div className="bg-white w-full max-h-[70vh] rounded-3xl p-6 flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-black text-slate-900 uppercase text-xs">Itens Selecionados</h3>
                            <button onClick={() => setShowCartMobile(false)} className="p-2 bg-slate-100 rounded-full"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 mb-6">
                            {selectedBatch.map(item => (
                                <div key={item.id_material} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm uppercase">{item.material}</p>
                                        <p className="text-xs text-blue-600 font-black">Qtd: {item.quantidade}</p>
                                    </div>
                                    <button onClick={() => removeFromBatch(item.id_material)} className="text-red-500 p-2"><Trash2 className="w-5 h-5" /></button>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => {
                                setShowCartMobile(false);
                                handleSubmitBatch();
                            }}
                            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-sm tracking-widest"
                        >
                            Confirmar e Enviar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoanRequestForm;
