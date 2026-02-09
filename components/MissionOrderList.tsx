
import { useState, type FC } from 'react';
import { MissionOrder } from '../types';
import { FileText, Plus, Edit, Trash2, Eye, Calendar, MapPin } from 'lucide-react';

interface MissionOrderListProps {
    orders: MissionOrder[];
    onCreate: () => void;
    onEdit: (order: MissionOrder) => void;
    onView: (order: MissionOrder) => void;
    onDelete: (id: string) => void;
}

const MissionOrderList: FC<MissionOrderListProps> = ({ orders, onCreate, onEdit, onView, onDelete }) => {
    const [filter, setFilter] = useState<'all' | 'internal' | 'external'>('all');

    const filteredOrders = orders.filter(order => {
        if (filter === 'all') return true;
        if (filter === 'internal') return order.isInternal;
        if (filter === 'external') return !order.isInternal;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Ordens de Missão (OMIS)</h2>
                    <p className="text-slate-500 text-sm mt-1">Gerenciamento de Ordens de Missão do GSD-SP</p>
                </div>
                <button
                    onClick={onCreate}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    Nova OMIS
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                >
                    Todas
                </button>
                <button
                    onClick={() => setFilter('internal')}
                    className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${filter === 'internal' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                >
                    Internas
                </button>
                <button
                    onClick={() => setFilter('external')}
                    className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${filter === 'external' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                        }`}
                >
                    Externas
                </button>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                    <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Nenhuma Ordem de Missão</h3>
                    <p className="text-slate-500 text-sm">Clique em "Nova OMIS" para criar a primeira ordem de missão.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredOrders.map(order => (
                        <div
                            key={order.id}
                            className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-all"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-2xl font-black text-slate-900">{order.omisNumber}</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.isInternal
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-orange-100 text-orange-700'
                                            }`}>
                                            {order.isInternal ? 'Interna' : 'Externa'}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-900 mb-2">{order.mission}</h3>
                                    <p className="text-slate-600 text-sm mb-3">{order.description}</p>

                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(order.date).toLocaleDateString('pt-BR')}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {order.location}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <FileText className="w-4 h-4" />
                                            {order.personnel.length} militares
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onView(order)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                        title="Visualizar"
                                    >
                                        <Eye className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => onEdit(order)}
                                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                        title="Editar"
                                    >
                                        <Edit className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Deseja realmente excluir a OMIS ${order.omisNumber}?`)) {
                                                onDelete(order.id);
                                            }
                                        }}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        title="Excluir"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MissionOrderList;
