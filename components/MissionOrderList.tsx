
import { useState, type FC } from 'react';
import { MissionOrder } from '../types';
import { FileText, Plus, Edit, Trash2, Eye, Calendar, MapPin } from 'lucide-react';
import { MISSION_STATUS_LABELS, MISSION_STATUS_COLORS } from '../constants';

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
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="w-full md:w-auto">
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Ordens de Missão</h2>
                    <p className="text-slate-500 text-xs md:text-sm font-medium">Gerenciamento de Ordens de Missão do GSD-SP</p>
                </div>
                <button
                    onClick={onCreate}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    Nova OMIS
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${filter === 'all' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                >
                    Todas
                </button>
                <button
                    onClick={() => setFilter('internal')}
                    className={`px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${filter === 'internal' ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                >
                    Internas
                </button>
                <button
                    onClick={() => setFilter('external')}
                    className={`px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${filter === 'external' ? 'bg-orange-600 text-white shadow-md' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
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
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <span className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{order.omisNumber}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${order.isInternal
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {order.isInternal ? 'INT' : 'EXT'}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${MISSION_STATUS_COLORS[order.status || ''] || 'bg-slate-100 text-slate-700'}`}>
                                                {MISSION_STATUS_LABELS[order.status || ''] || order.status || 'Rascunho'}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="text-base md:text-lg font-bold text-slate-800 mb-2 truncate">{order.mission}</h3>
                                    <p className="text-slate-500 text-xs md:text-sm mb-4 line-clamp-2">{order.description}</p>

                                    <div className="flex flex-wrap items-center gap-3 md:gap-6 text-xs font-medium text-slate-500">
                                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            {new Date(order.date).toLocaleDateString('pt-BR')}
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 truncate max-w-[150px]">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                            {order.location}
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                                            {order.personnel.length} militares
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 md:flex md:flex-col gap-2 mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                                    <button
                                        onClick={() => onView(order)}
                                        className="h-10 md:h-9 md:w-9 flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all active:scale-95"
                                        title="Visualizar"
                                    >
                                        <Eye className="w-5 h-5 md:w-4 md:h-4" />
                                    </button>
                                    <button
                                        onClick={() => onEdit(order)}
                                        className="h-10 md:h-9 md:w-9 flex items-center justify-center text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all active:scale-95"
                                        title="Editar"
                                    >
                                        <Edit className="w-5 h-5 md:w-4 md:h-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Deseja realmente excluir a OMIS ${order.omisNumber}?`)) {
                                                onDelete(order.id);
                                            }
                                        }}
                                        className="h-10 md:h-9 md:w-9 flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all active:scale-95"
                                        title="Excluir"
                                    >
                                        <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
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
