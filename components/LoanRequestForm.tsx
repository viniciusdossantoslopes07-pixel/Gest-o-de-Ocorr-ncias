
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Package, Search, CheckCircle, AlertCircle, X } from 'lucide-react';

interface StockItem {
    id: string;
    material: string;
    tipo_de_material: string;
    qtdisponivel: number; // Will calculate
    entrada: number;
    saida: number;
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

    const handleRequest = async (item: StockItem, qtd: number = 1) => {
        if (!user) return;

        // Basic availability check (optional, since approval is required)
        const available = item.entrada - item.saida;
        if (available <= 0) {
            if (!confirm('Este item consta como indisponível (0). Deseja solicitar assim mesmo?')) return;
        }

        try {
            setSubmitting(true);

            const { error } = await supabase
                .from('movimentacao_cautela')
                .insert([{
                    id_material: item.id,
                    id_usuario: user.id,
                    status: 'Pendente',
                    observacao: '',
                    quantidade: qtd
                }]);

            if (error) throw error;

            alert('Solicitação enviada com sucesso! Aguarde aprovação.');
            onSuccess();
        } catch (err: any) {
            console.error('Error submitting request:', err);
            alert('Erro ao solicitar: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tipo_de_material?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-xl overflow-hidden sm:max-w-4xl mx-auto border border-slate-100 animate-fade-in flex flex-col">
            <div className="bg-blue-600 px-4 py-4 sm:px-8 sm:py-6 flex items-center gap-3 sm:gap-4 shrink-0">
                <div className="bg-white/20 p-2 sm:p-3 rounded-full shrink-0">
                    <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                    <h2 className="text-lg sm:text-2xl font-bold text-white truncate">Solicitar Material</h2>
                    <p className="text-blue-100 text-[10px] sm:text-base truncate">Selecione o item para iniciar a cautela</p>
                </div>
                <button
                    onClick={onCancel}
                    className="ml-auto p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all sm:hidden"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="p-4 sm:p-8 flex-1 overflow-y-auto custom-scrollbar">
                {/* Search */}
                <div className="relative mb-4 sm:mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar material..."
                        className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-8 text-slate-400">Carregando itens...</div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">Nenhum item encontrado.</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:gap-4">
                            {filteredItems.map(item => {
                                const available = item.entrada - item.saida;
                                const hasStock = available > 0;

                                return (
                                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all gap-4">
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-slate-900 truncate">{item.material}</h3>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">{item.tipo_de_material}</p>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 border-t sm:border-t-0 pt-3 sm:pt-0">
                                            <div className="text-left sm:text-right">
                                                <span className="block text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 leading-tight">Disponível</span>
                                                <span className={`font-mono font-bold ${hasStock ? 'text-blue-600' : 'text-red-500'}`}>
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
                                                    className="w-14 sm:w-16 h-10 px-2 border border-slate-300 rounded-lg text-center text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        if (val > available) e.target.value = String(available);
                                                        if (val < 1) e.target.value = "1";
                                                    }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        const qtdInput = document.getElementById(`qtd-${item.id}`) as HTMLInputElement;
                                                        const qtd = qtdInput ? parseInt(qtdInput.value) : 1;
                                                        handleRequest(item, qtd);
                                                    }}
                                                    disabled={submitting || !hasStock}
                                                    className="flex-1 sm:flex-none h-10 px-4 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                                >
                                                    Solicitar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-6 sm:mt-8 flex justify-end shrink-0">
                    <button
                        onClick={onCancel}
                        className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-slate-100 sm:bg-transparent text-slate-500 font-bold hover:bg-slate-200 sm:hover:bg-slate-100 rounded-xl transition-all"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoanRequestForm;
