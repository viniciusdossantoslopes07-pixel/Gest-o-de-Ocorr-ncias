
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Package, Search, CheckCircle, AlertCircle } from 'lucide-react';

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

    const handleRequest = async (item: StockItem) => {
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
                    observacao: ''
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
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl mx-auto border border-slate-100 animate-fade-in">
            <div className="bg-blue-600 px-8 py-6 flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-full">
                    <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Solicitar Material</h2>
                    <p className="text-blue-100">Selecione o item desejado para iniciar a cautela</p>
                </div>
            </div>

            <div className="p-8">
                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar material..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
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
                        <div className="grid grid-cols-1 gap-4">
                            {filteredItems.map(item => {
                                const available = item.entrada - item.saida;
                                const hasStock = available > 0;

                                return (
                                    <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all">
                                        <div>
                                            <h3 className="font-bold text-slate-900">{item.material}</h3>
                                            <p className="text-xs text-slate-500 font-bold uppercase">{item.tipo_de_material}</p>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <span className="block text-[10px] uppercase font-bold text-slate-400">Disponível</span>
                                                <span className={`font-mono font-bold ${hasStock ? 'text-blue-600' : 'text-red-500'}`}>
                                                    {available}
                                                </span>
                                            </div>

                                            <button
                                                onClick={() => handleRequest(item)}
                                                disabled={submitting}
                                                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                            >
                                                Solicitar
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoanRequestForm;
