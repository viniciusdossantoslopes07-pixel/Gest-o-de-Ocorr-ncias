import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Plus, Edit2, Trash2, Search, Package } from 'lucide-react';
import { MATERIAL_TYPES, GESTAO_MATERIAL_SETORES } from '../constants';

interface StockItem {
    id: string;
    material: string;
    tipo_de_material: string;
    setor: string;
    endereco: string;
    entrada: number;
    saida: number;
    qtdisponivel: number;
}

interface InventoryManagerProps {
    user: any;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ user }) => {
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterSector, setFilterSector] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<StockItem | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        material: '',
        tipo_de_material: '',
        setor: '',
        endereco: '',
        entrada: 0,
        saida: 0
    });

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('gestao_estoque')
            .select('*')
            .order('material');

        if (error) {
            console.error('Error fetching inventory:', error);
            alert('Erro ao carregar estoque.');
        } else {
            setItems(data || []);
        }
        setLoading(false);
    };

    const handleOpenModal = (item?: StockItem) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                material: item.material,
                tipo_de_material: item.tipo_de_material || '',
                setor: item.setor || '',
                endereco: item.endereco || '',
                entrada: item.entrada,
                saida: item.saida
            });
        } else {
            setEditingItem(null);
            setFormData({
                material: '',
                tipo_de_material: '',
                setor: '',
                endereco: '',
                entrada: 0,
                saida: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const itemData = {
            material: formData.material,
            tipo_de_material: formData.tipo_de_material,
            setor: formData.setor,
            endereco: formData.endereco,
            entrada: formData.entrada,
            saida: formData.saida
        };

        if (editingItem) {
            const { error } = await supabase
                .from('gestao_estoque')
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
                .from('gestao_estoque')
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
            .from('gestao_estoque')
            .delete()
            .eq('id', id);

        if (error) alert('Erro ao excluir item: ' + error.message);
        else fetchItems();
    };

    const filteredItems = items.filter(i => {
        const matchesSearch = i.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.tipo_de_material?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.setor?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = filterCategory === '' || i.tipo_de_material === filterCategory;
        const matchesSector = filterSector === '' || i.setor === filterSector;

        return matchesSearch && matchesCategory && matchesSector;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Package className="w-8 h-8 text-blue-600" />
                        Gestão de Estoque (SAP-03)
                    </h2>
                    <p className="text-slate-500">Gerencie o inventário e controle de materiais.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Novo Item
                </button>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar material..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium shadow-sm transition-all min-w-[150px]"
                    >
                        <option value="">Todas as Categorias</option>
                        {MATERIAL_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>

                    <select
                        value={filterSector}
                        onChange={e => setFilterSector(e.target.value)}
                        className="px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium shadow-sm transition-all min-w-[150px]"
                    >
                        <option value="">Todos os Setores</option>
                        {GESTAO_MATERIAL_SETORES.map(sector => (
                            <option key={sector} value={sector}>{sector}</option>
                        ))}
                    </select>

                    {(filterCategory || filterSector || searchTerm) && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setFilterCategory('');
                                setFilterSector('');
                            }}
                            className="px-4 py-3 text-blue-600 font-bold text-sm hover:bg-blue-50 rounded-xl transition-all whitespace-nowrap"
                        >
                            Limpar Filtros
                        </button>
                    )}
                </div>
            </div>

            {/* Table View */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">Material</th>
                                <th className="px-4 py-3">Tipo de Material</th>
                                <th className="px-4 py-3">Setor</th>
                                <th className="px-4 py-3">Endereço</th>
                                <th className="px-4 py-3 text-center">Entrada</th>
                                <th className="px-4 py-3 text-center">Saída</th>
                                <th className="px-4 py-3 text-center bg-blue-50 text-blue-700">Qtd Disponível</th>
                                <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredItems.map(item => {
                                const available = item.entrada - item.saida; // Client-side calc for display
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-slate-900">{item.material}</td>
                                        <td className="px-4 py-3 text-slate-600">{item.tipo_de_material}</td>
                                        <td className="px-4 py-3 text-slate-600">{item.setor}</td>
                                        <td className="px-4 py-3 text-slate-600">{item.endereco}</td>
                                        <td className="px-4 py-3 text-center font-mono text-slate-700">{item.entrada}</td>
                                        <td className="px-4 py-3 text-center font-mono text-red-600">{item.saida}</td>
                                        <td className="px-4 py-3 text-center font-mono font-bold bg-blue-50 text-blue-700">
                                            {available}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(item)}
                                                    className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredItems.length === 0 && !loading && (
                    <div className="p-8 text-center text-slate-400">
                        Nenhum item encontrado.
                    </div>
                )}
                {loading && (
                    <div className="p-8 text-center text-slate-400">
                        Carregando estoque...
                    </div>
                )}
            </div>

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
                                    <Trash2 className="w-6 h-6 rotate-45" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Material *</label>
                                    <input
                                        type="text"
                                        value={formData.material}
                                        onChange={e => setFormData({ ...formData, material: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Material</label>
                                        <select
                                            value={formData.tipo_de_material}
                                            onChange={e => setFormData({ ...formData, tipo_de_material: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors bg-white"
                                        >
                                            <option value="">Selecione...</option>
                                            {MATERIAL_TYPES.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Setor</label>
                                        <select
                                            value={formData.setor}
                                            onChange={e => setFormData({ ...formData, setor: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors bg-white"
                                        >
                                            <option value="">Selecione...</option>
                                            {GESTAO_MATERIAL_SETORES.map(sector => (
                                                <option key={sector} value={sector}>{sector}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Endereço</label>
                                    <input
                                        type="text"
                                        value={formData.endereco}
                                        onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Entrada (Total Recebido)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.entrada}
                                            onChange={e => setFormData({ ...formData, entrada: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Saída (Perdas/Baixas)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.saida}
                                            onChange={e => setFormData({ ...formData, saida: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
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
