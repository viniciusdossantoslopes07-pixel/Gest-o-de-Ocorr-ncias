import { useState, FC } from 'react';
import { useSectors } from '../contexts/SectorsContext';
import { hasPermission, PERMISSIONS } from '../constants/permissions';
import { User } from '../types';
import { Plus, Trash2, Settings2, AlertTriangle, X, CheckCircle, Loader2, GripVertical } from 'lucide-react';
import { supabase } from '../services/supabase';

interface SectorManagementProps {
    currentUser: User | null;
    isDarkMode?: boolean;
    users: User[];
}

const SectorManagement: FC<SectorManagementProps> = ({ currentUser, isDarkMode = false, users }) => {
    const { sectors, addSector, removeSector, reorderSectors, loading } = useSectors();
    const [newSectorName, setNewSectorName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState('');
    const [addSuccess, setAddSuccess] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // DnD States
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [isReordering, setIsReordering] = useState(false);

    const canManage = hasPermission(currentUser, PERMISSIONS.MANAGE_PERSONNEL);
    const dk = isDarkMode;

    if (!canManage) {
        return (
            <div className={`p-8 rounded-[2rem] border text-center ${dk ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`}>
                <Settings2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-bold">Sem permissão para gerir setores.</p>
            </div>
        );
    }

    const handleAdd = async () => {
        setAddError('');
        setAddSuccess('');
        if (!newSectorName.trim()) {
            setAddError('Informe um nome para o setor.');
            return;
        }
        setIsAdding(true);
        const { error } = await addSector(newSectorName);
        setIsAdding(false);
        if (error) {
            setAddError(error);
        } else {
            setAddSuccess(`Setor "${newSectorName.trim().toUpperCase()}" criado com sucesso!`);
            setNewSectorName('');
            setTimeout(() => setAddSuccess(''), 3000);
        }
    };

    const handleRemove = async (id: string) => {
        setDeletingId(id);
        const { error } = await removeSector(id);
        setDeletingId(null);
        setConfirmDeleteId(null);
        if (error) alert(`Erro ao remover setor: ${error}`);
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        // Pequeno timeout para o item arrastável não ficar invisível sob o cursor
        setTimeout(() => e.target && (e.target as HTMLElement).classList.add('opacity-50'), 0);
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault(); // necessário para permitir drop
        if (id !== dragOverId) setDragOverId(id);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        (e.target as HTMLElement).classList.remove('opacity-50');
        setDraggedId(null);
        setDragOverId(null);
    };

    const handleDrop = async (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedId || draggedId === targetId) {
            handleDragEnd(e);
            return;
        }

        const oldIndex = sectors.findIndex(s => s.id === draggedId);
        const newIndex = sectors.findIndex(s => s.id === targetId);

        if (oldIndex === -1 || newIndex === -1) {
            handleDragEnd(e);
            return;
        }

        const newSectors = [...sectors];
        const [movedSector] = newSectors.splice(oldIndex, 1);
        newSectors.splice(newIndex, 0, movedSector);

        const newOrderIds = newSectors.map(s => s.id);

        setIsReordering(true);
        handleDragEnd(e);

        const { error } = await reorderSectors(newOrderIds);
        setIsReordering(false);
        if (error) alert(`Erro ao reordenar: ${error}`);
    };

    const getUsersInSector = (sectorName: string) =>
        users.filter(u => u.sector === sectorName && u.active !== false && !u.is_functional);

    const card = dk ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className={`p-6 lg:p-8 rounded-[2rem] border shadow-sm ${card}`}>
                <div className="flex items-center gap-4 mb-6">
                    <div className={`p-3 rounded-2xl ${dk ? 'bg-blue-600' : 'bg-slate-900'}`}>
                        <Settings2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className={`text-xl font-black tracking-tight ${dk ? 'text-white' : 'text-slate-900'}`}>Gestão de Setores</h2>
                        <p className={`text-xs font-medium ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                            Criar e remover setores dinamicamente
                        </p>
                    </div>
                </div>

                {/* Add New Sector */}
                <div className={`p-5 rounded-2xl border ${dk ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                        + Novo Setor
                    </p>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newSectorName}
                            onChange={e => setNewSectorName(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            placeholder="Ex: NOVO-SETOR"
                            maxLength={30}
                            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${dk ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-white border-slate-200 text-slate-900'}`}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={isAdding || !newSectorName.trim()}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Criar
                        </button>
                    </div>
                    {addError && (
                        <p className="mt-2 text-xs font-bold text-red-500 flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" /> {addError}
                        </p>
                    )}
                    {addSuccess && (
                        <p className="mt-2 text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3" /> {addSuccess}
                        </p>
                    )}
                </div>
            </div>

            {/* Sector List */}
            <div className={`rounded-[2rem] border overflow-hidden shadow-sm ${card}`}>
                <div className={`p-5 border-b flex items-center justify-between ${dk ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
                    <h3 className={`text-sm font-black uppercase tracking-widest ${dk ? 'text-white' : 'text-slate-900'}`}>
                        Setores Ativos ({sectors.length})
                    </h3>
                    <span className={`text-[10px] font-bold ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                        Usuários ao remover serão movidos para "Sem Setor"
                    </span>
                </div>

                {loading || isReordering ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className={`w-6 h-6 animate-spin ${dk ? 'text-slate-500' : 'text-slate-300'}`} />
                    </div>
                ) : (
                    <div className={`divide-y ${dk ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                        {sectors.map(sector => {
                            const usersInSector = getUsersInSector(sector.name);
                            const isDeleting = deletingId === sector.id;
                            const isConfirming = confirmDeleteId === sector.id;

                            return (
                                <div
                                    key={sector.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, sector.id)}
                                    onDragOver={(e) => handleDragOver(e, sector.id)}
                                    onDragEnd={handleDragEnd}
                                    onDrop={(e) => handleDrop(e, sector.id)}
                                    className={`flex items-center justify-between px-6 py-4 transition-colors cursor-move 
                                        ${dk ? 'hover:bg-slate-700/20' : 'hover:bg-slate-50/50'}
                                        ${dragOverId === sector.id ? (dk ? 'bg-slate-700/50 border-t-2 border-blue-500' : 'bg-slate-100 border-t-2 border-blue-500') : ''}
                                    `}
                                >
                                    <div className="flex items-center gap-4">
                                        <GripVertical className={`w-4 h-4 ${dk ? 'text-slate-600' : 'text-slate-400'}`} />
                                        <div className={`w-2 h-2 rounded-full ${sector.hidden_from_attendance ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                                        <div>
                                            <p className={`text-sm font-black uppercase ${dk ? 'text-white' : 'text-slate-900'}`}>
                                                {sector.name}
                                            </p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <p className={`text-[10px] font-bold ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    {usersInSector.length} militar{usersInSector.length !== 1 ? 'es' : ''}
                                                </p>
                                                {sector.hidden_from_attendance && (
                                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${dk ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                                                        Oculto da Chamada
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {!isConfirming ? (
                                            <button
                                                onClick={() => setConfirmDeleteId(sector.id)}
                                                disabled={isDeleting}
                                                className={`p-2 rounded-xl transition-all ${dk ? 'text-slate-600 hover:text-red-400 hover:bg-red-900/20' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                                                title="Remover setor"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${dk ? 'bg-red-900/20 border-red-800/50' : 'bg-red-50 border-red-100'}`}>
                                                <span className={`text-[10px] font-black ${dk ? 'text-red-400' : 'text-red-600'}`}>
                                                    {usersInSector.length > 0
                                                        ? `${usersInSector.length} usuário(s) serão realocados. Confirmar?`
                                                        : 'Confirmar remoção?'}
                                                </span>
                                                <button
                                                    onClick={() => handleRemove(sector.id)}
                                                    disabled={isDeleting}
                                                    className="p-1 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-all"
                                                >
                                                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    className={`p-1 rounded-lg transition-all ${dk ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!loading && sectors.length === 0 && (
                    <div className="py-12 text-center">
                        <p className={`text-sm font-bold ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Nenhum setor cadastrado.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SectorManagement;
