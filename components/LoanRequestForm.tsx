
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { InventoryItem, User } from '../types';
import { Package, Calendar, AlertCircle, CheckCircle, Search } from 'lucide-react';

interface LoanRequestFormProps {
    user: User | null;
    onSuccess: () => void;
    onCancel: () => void;
}

const LoanRequestForm: React.FC<LoanRequestFormProps> = ({ user, onSuccess, onCancel }) => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [returnDate, setReturnDate] = useState('');
    const [observation, setObservation] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchAvailableItems();
    }, []);

    const fetchAvailableItems = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventory_items')
                .select('*')
                .eq('status', 'DISPONIVEL')
                .gt('available_quantity', 0)
                .order('name');

            if (error) throw error;

            // Map database columns (snake_case) to TypeScript interface (camelCase) if necessary
            // Assuming Supabase returns data matching the DB columns, but our interface might be camelCase.
            // Let's verify types.ts. The interface uses camelCase: availableQuantity. 
            // But Supabase returns snake_case by default unless mapped.
            // Ideally, we should use a consistent naming convention. 
            // For now, I will manually map if needed, or rely on JS flexibility.
            // Let's check the previous InventoryManager implementation to see how it handled it.
            // Actually, I'll just map it to be safe.

            const mappedItems: InventoryItem[] = (data || []).map((item: any) => ({
                id: item.id,
                name: item.name,
                description: item.description,
                totalQuantity: item.total_quantity,
                availableQuantity: item.available_quantity,
                details: item.details,
                status: item.status,
                createdAt: item.created_at,
                updatedAt: item.updated_at
            }));

            setItems(mappedItems);
        } catch (err) {
            console.error('Error fetching inventory:', err);
            setError('Erro ao carregar itens do estoque.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedItem) return;

        if (quantity > selectedItem.availableQuantity) {
            setError(`Quantidade indisponível. Máximo: ${selectedItem.availableQuantity}`);
            return;
        }

        try {
            setSubmitting(true);
            setError('');

            const { error } = await supabase
                .from('material_loans')
                .insert([{
                    user_id: user.id,
                    item_id: selectedItem.id,
                    quantity: quantity,
                    expected_return_date: returnDate,
                    status: 'PENDENTE',
                    observation: observation
                }]);

            if (error) throw error;

            alert('Solicitação de cautela enviada com sucesso!');
            onSuccess();
        } catch (err: any) {
            console.error('Error submitting loan request:', err);
            setError(err.message || 'Erro ao enviar solicitação.');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-2xl mx-auto border border-slate-100">
            <div className="bg-blue-600 px-8 py-6 flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-full">
                    <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Solicitar Cautela de Material</h2>
                    <p className="text-blue-100">Selecione o item e informe a previsão de devolução</p>
                </div>
            </div>

            <div className="p-8">
                {error && (
                    <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-100">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p className="font-medium">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Item Selection */}
                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-slate-700">Selecione o Material</label>

                        {!selectedItem ? (
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar material..."
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                                    {loading ? (
                                        <div className="p-4 text-center text-slate-400">Carregando estoque...</div>
                                    ) : filteredItems.length === 0 ? (
                                        <div className="p-4 text-center text-slate-400">Nenhum item disponível encontrado.</div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {filteredItems.map(item => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => { setSelectedItem(item); setQuantity(1); }}
                                                    className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex justify-between items-center group"
                                                >
                                                    <div>
                                                        <div className="font-bold text-slate-700 group-hover:text-blue-700">{item.name}</div>
                                                        <div className="text-xs text-slate-500">{item.description}</div>
                                                    </div>
                                                    <div className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-lg">
                                                        {item.availableQuantity} disp.
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-lg">
                                        <Package className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-blue-900">{selectedItem.name}</div>
                                        <div className="text-xs text-blue-600">Disponível: {selectedItem.availableQuantity}</div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedItem(null)}
                                    className="text-sm font-bold text-blue-600 hover:text-blue-800"
                                >
                                    Trocar
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Quantity */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700">Quantidade</label>
                            <input
                                type="number"
                                min="1"
                                max={selectedItem?.availableQuantity || 1}
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value))}
                                disabled={!selectedItem}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                            />
                        </div>

                        {/* Return Date */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700">Previsão de Devolução</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="datetime-local"
                                    required
                                    value={returnDate}
                                    onChange={(e) => setReturnDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Observation */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Observação (Opcional)</label>
                        <textarea
                            value={observation}
                            onChange={(e) => setObservation(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                            placeholder="Ex: Para uso na missão X..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !selectedItem || !returnDate}
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {submitting ? 'Enviando...' : (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Solicitar Cautela
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default LoanRequestForm;
