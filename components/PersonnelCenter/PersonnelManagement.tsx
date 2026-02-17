import React, { useState, FC } from 'react';
import { User, UserRole } from '../../types';
import { RANKS, SETORES } from '../../constants';
import { UserPlus, Search, Edit2, Trash2, Shield, User as UserIcon, Hash, Building2, Users, AlertTriangle } from 'lucide-react';

interface PersonnelManagementProps {
    users: User[];
    onAddPersonnel: (user: Partial<User>) => void;
    onUpdatePersonnel: (user: User) => void;
    onDeletePersonnel: (id: string) => void;
}

const PersonnelManagementView: FC<PersonnelManagementProps> = ({ users, onAddPersonnel, onUpdatePersonnel, onDeletePersonnel }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        warName: '',
        rank: '',
        saram: '',
        cpf: '',
        sector: SETORES[0],
        role: UserRole.OPERATIONAL
    });

    // Sector Filter State
    const [filterSector, setFilterSector] = useState('TODOS');

    const filteredUsers = users.filter(u =>
        (filterSector === 'TODOS' ? true : u.sector === filterSector) &&
        (u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.warName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.saram.includes(searchTerm))
    ).sort((a, b) => a.name.localeCompare(b.name));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            onUpdatePersonnel({ ...users.find(u => u.id === editingId)!, ...formData } as User);
            setEditingId(null);
        } else {
            onAddPersonnel(formData);
        }
        setFormData({ name: '', warName: '', rank: '', saram: '', cpf: '', sector: SETORES[0], role: UserRole.OPERATIONAL });
        setIsAdding(false);
    };

    const handleEdit = (user: User) => {
        setFormData({
            name: user.name,
            warName: user.warName || '',
            rank: user.rank,
            saram: user.saram,
            cpf: user.cpf || '',
            sector: user.sector,
            role: user.role
        });
        setEditingId(user.id);
        setIsAdding(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-20">
            {/* Header & Search */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-2.5 lg:p-3 rounded-2xl shadow-lg shadow-blue-200">
                            <Users className="w-5 h-5 lg:w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Gestão de Efetivo</h2>
                            <p className="text-slate-500 text-xs lg:sm font-medium">Cadastro e vinculação de militares</p>
                        </div>
                    </div>

                    <button
                        onClick={() => { setIsAdding(!isAdding); setEditingId(null); }}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl text-sm lg:text-base w-full lg:w-auto"
                    >
                        {isAdding ? <Users className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                        {isAdding ? 'Ver Lista' : 'Cadastrar Militar'}
                    </button>
                </div>

                {!isAdding && (
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome, nome de guerra ou SARAM..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="md:w-64">
                            <select
                                value={filterSector}
                                onChange={(e) => setFilterSector(e.target.value)}
                                className={`w-full h-full bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${filterSector === 'SEM SETOR' ? 'text-red-500 border-red-200 bg-red-50' : 'text-slate-700'}`}
                            >
                                <option value="TODOS">Todos os Setores</option>
                                <option value="SEM SETOR">⚠ SEM SETOR (Não Alocados)</option>
                                {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {isAdding ? (
                /* Registration Form */
                <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm animate-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        {editingId ? <Edit2 className="w-5 h-5 text-blue-500" /> : <UserPlus className="w-5 h-5 text-blue-500" />}
                        {editingId ? 'Editar Dados do Militar' : 'Novo Cadastro Militar'}
                    </h3>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                        <div className="space-y-1.5 lg:space-y-2">
                            <label className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                <UserIcon className="w-3 h-3" /> Nome Completo
                            </label>
                            <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>

                        <div className="space-y-1.5 lg:space-y-2">
                            <label className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                <UserIcon className="w-3 h-3" /> Nome de Guerra
                            </label>
                            <input required type="text" value={formData.warName} onChange={e => setFormData({ ...formData, warName: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>

                        <div className="space-y-1.5 lg:space-y-2">
                            <label className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                <Shield className="w-3 h-3" /> Posto / Graduação
                            </label>
                            <select required value={formData.rank} onChange={e => setFormData({ ...formData, rank: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">Selecione...</option>
                                {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5 lg:space-y-2">
                            <label className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                <Hash className="w-3 h-3" /> SARAM
                            </label>
                            <input required type="text" value={formData.saram} onChange={e => setFormData({ ...formData, saram: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>

                        <div className="space-y-1.5 lg:space-y-2">
                            <label className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                <Hash className="w-3 h-3" /> CPF
                            </label>
                            <input required type="text" value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>

                        <div className="space-y-1.5 lg:space-y-2">
                            <label className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                <Building2 className="w-3 h-3" /> Setor de Lotação
                            </label>
                            <select required value={formData.sector} onChange={e => setFormData({ ...formData, sector: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => { setIsAdding(false); setEditingId(null); }}
                                className="w-full sm:w-auto px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all font-bold"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                            >
                                {editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                /* Personnel List */
                <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                    {/* Desktop View (Table) */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Militar</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Setor</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{user.name}</div>
                                            <div className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">
                                                {user.rank} {user.warName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-slate-600">SARAM: {user.saram}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">CPF: {user.cpf || '---'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-black border border-slate-200">
                                                {user.sector}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {user.sector === 'SEM SETOR' && (
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-[10px] font-black uppercase hover:bg-red-200 transition-colors mr-auto"
                                                    >
                                                        Atribuir Setor
                                                    </button>
                                                )}
                                                <button onClick={() => handleEdit(user)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => { if (confirm('Excluir militar?')) onDeletePersonnel(user.id); }} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View (Cards) */}
                    <div className="lg:hidden divide-y divide-slate-100">
                        {filteredUsers.map(user => (
                            <div key={user.id} className="p-6 flex flex-col gap-5 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200/50">
                                            <UserIcon className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-900 text-sm leading-tight mb-1 truncate">{user.name}</div>
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-tight">
                                                    {user.rank}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase truncate">
                                                    {user.warName}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black tracking-widest uppercase shrink-0">
                                        {user.sector}
                                    </span>
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-4 border border-slate-100">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SARAM</p>
                                        <p className="text-xs font-bold text-slate-700">{user.saram}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CPF</p>
                                        <p className="text-xs font-bold text-slate-700">{user.cpf || '---'}</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-1">
                                    {user.sector === 'SEM SETOR' ? (
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="flex-1 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:bg-red-100 transition-all shadow-sm animate-pulse"
                                        >
                                            <AlertTriangle className="w-4 h-4" /> Atribuir Setor
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:bg-slate-50 transition-all shadow-sm"
                                        >
                                            <Edit2 className="w-4 h-4 text-blue-500" /> Editar Dados
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { if (confirm('Excluir militar?')) onDeletePersonnel(user.id); }}
                                        className="py-3 px-4 border border-red-100 text-red-500 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:bg-red-50 transition-all shadow-sm bg-red-50/30"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredUsers.length === 0 && (
                        <div className="px-6 py-12 text-center opacity-40">
                            <p className="text-sm font-bold">Nenhum militar encontrado</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PersonnelManagementView;
