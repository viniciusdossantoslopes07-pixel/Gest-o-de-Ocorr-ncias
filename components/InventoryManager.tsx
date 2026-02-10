
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { InventoryItem } from '../types';
import { Plus, Edit2, Trash2, Search, Package, AlertTriangle } from 'lucide-react';

interface InventoryManagerProps {
    user: any; // Using any for simplicity here, but should be User type
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ user }) => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        totalQuantity: 0,
        details: '', // JSON stringified for now or simple text
        status: 'DISPONIVEL' as 'DISPONIVEL' | 'MANUTENCAO' | 'BAIXADO'
    });

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('inventory_items')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching inventory:', error);
            alert('Erro ao carregar estoque.');
        } else {
            setItems(data || []);
        }
        setLoading(false);
    };

    const handleOpenModal = (item?: InventoryItem) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.name,
                description: item.description || '',
                totalQuantity: item.totalQuantity,
                details: JSON.stringify(item.details || {}, null, 2),
                status: item.status
            });
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                description: '',
                totalQuantity: 0,
                details: '{}',
                status: 'DISPONIVEL'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let parsedDetails = {};
        try {
            parsedDetails = JSON.parse(formData.details);
        } catch (err) {
            alert('Erro no formato JSON dos detalhes. Usando objeto vazio.');
        }

        const itemData = {
            name: formData.name,
            description: formData.description,
            total_quantity: formData.totalQuantity,
            available_quantity: editingItem ? (formData.totalQuantity - (editingItem.totalQuantity - editingItem.availableQuantity)) : formData.totalQuantity, // Simple logic: adjust available based on diff
            details: parsedDetails,
            status: formData.status
        };

        if (editingItem) {
            const { error } = await supabase
                .from('inventory_items')
                .update(itemData)
                .eq('id', editingItem.id);

            if (error) alert('Erro ao atualizar item: ' + error.message);
            else {
                alert('Item atualizado com sucesso!');
                setIsModalOpen(false);
                fetchItems();
            }
        } else {
            const { error } = await supabase
                .from('inventory_items')
                .insert([itemData]);

            if (error) alert('Erro ao criar item: ' + error.message);
            else {
                alert('Item criado com sucesso!');
                setIsModalOpen(false);
                fetchItems();
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este item?')) return;

        const { error } = await supabase
            .from('inventory_items')
            .delete()
            .eq('id', id);

        if (error) alert('Erro ao excluir item: ' + error.message);
        else fetchItems();
    };

    const filteredItems = items.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Package className="w-8 h-8 text-blue-600" />
                        Gestão de Estoque (Cautela)
                    </h2>
                    <p className="text-slate-500">Gerencie os materiais disponíveis para cautela.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Novo Item
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Buscar material..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map(item => (
                    <div key={item.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
                                <Package className="w-6 h-6" />
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.status === 'DISPONIVEL' ? 'bg-green-100 text-green-700' :
                                    item.status === 'MANUTENCAO' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {item.status}
                            </div>
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 mb-1">{item.name}</h3>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{item.description}</p>

                        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                            <div className="bg-slate-50 p-2 rounded">
                                <span className="block text-xs font-bold text-slate-400 uppercase">Total</span>
                                <span className="font-mono font-bold text-slate-700">{item.totalQuantity}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded">
                                <span className="block text-xs font-bold text-slate-400 uppercase">Disponível</span>
                                <span className={`font-mono font-bold ${item.availableQuantity > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                    {item.availableQuantity}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => handleOpenModal(item)}
                                className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" /> Editar
                            </button>
                            <button
                                onClick={() => handleDelete(item.id)}
                                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {loading && (
                <div className="text-center py-12 text-slate-500">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    Carregando estoque...
                </div>
            )}

            {!loading && filteredItems.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum item encontrado.</p>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                        <form onSubmit={handleSubmit}>
                            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-slate-800">
                                    {editingItem ? 'Editar Material' : 'Novo Material'}
                                </h3>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <Trash2 className="w-6 h-6 rotate-45" /> {/* Using Trash as X icon roughly or use dedicated X icon if available */}
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Nome do Material *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Descrição</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors resize-none"
                                        rows={3}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Quantidade Total *</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.totalQuantity}
                                            onChange={e => setFormData({ ...formData, totalQuantity: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
                                        <select
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
                                        >
                                            <option value="DISPONIVEL">Disponível</option>
                                            <option value="MANUTENCAO">Manutenção</option>
                                            <option value="BAIXADO">Baixado</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Detalhes (JSON - Opcional)</label>
                                    <textarea
                                        value={formData.details}
                                        onChange={e => setFormData({ ...formData, details: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors font-mono text-xs"
                                        rows={3}
                                        placeholder='{"marca": "Exemplo", "modelo": "X1"}'
                                    />
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-slate-50 rounded-b-2xl flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 rounded-lg transition-colors"
                                >
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
