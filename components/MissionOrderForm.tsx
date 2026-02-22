
import { useState, type FC, type FormEvent } from 'react';
import { MissionOrder, MissionOrderPersonnel, MissionOrderSchedule } from '../types';
import { Save, X, Plus, Trash2, Search } from 'lucide-react';
import { RANKS, ARMAMENT_OPTIONS, MISSION_FUNCTIONS, TIPOS_MISSAO } from '../constants';

interface MissionOrderFormProps {
    order?: MissionOrder;
    onSubmit: (order: Partial<MissionOrder>) => void;
    onCancel: () => void;
    currentUser: string;
    users: { id: string; name: string; rank: string; warName?: string; saram: string }[];
    isDarkMode?: boolean;
}

const MissionOrderForm: FC<MissionOrderFormProps> = ({ order, onSubmit, onCancel, currentUser, users, isDarkMode }) => {
    const [formData, setFormData] = useState({
        date: order?.date || new Date().toISOString().split('T')[0],
        isInternal: order?.isInternal ?? true,
        mission: order?.mission || '',
        location: order?.location || '',
        description: order?.description || '',
        requester: order?.requester || currentUser,
        transport: order?.transport || false,
        food: order?.food || false,
        permanentOrders: order?.permanentOrders || '',
        specialOrders: order?.specialOrders || '',

        missionCommanderId: order?.missionCommanderId || ''
    });

    const [personnel, setPersonnel] = useState<MissionOrderPersonnel[]>(order?.personnel || []);
    const [schedule, setSchedule] = useState<MissionOrderSchedule[]>(order?.schedule || []);

    const addPersonnel = () => {
        setPersonnel([...personnel, {
            id: Math.random().toString(),
            function: '',
            rank: '',
            warName: '',
            saram: '',
            uniform: '',
            armament: '',
            ammunition: ''
        }]);
    };

    const removePersonnel = (id: string) => {
        setPersonnel(personnel.filter(p => p.id !== id));
    };

    const updatePersonnel = (id: string, field: keyof MissionOrderPersonnel, value: string) => {
        setPersonnel(personnel.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const updatePersonnelFields = (id: string, fields: Partial<MissionOrderPersonnel>) => {
        setPersonnel(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p));
    };

    const addSchedule = () => {
        setSchedule([...schedule, {
            id: Math.random().toString(),
            startTime: '',
            endTime: '',
            event: ''
        }]);
    };

    const removeSchedule = (id: string) => {
        setSchedule(schedule.filter(s => s.id !== id));
    };

    const updateSchedule = (id: string, field: keyof MissionOrderSchedule, value: string) => {
        setSchedule(schedule.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!formData.mission || !formData.location || !formData.requester) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }

        onSubmit({
            ...formData,
            personnel,
            schedule,
            createdBy: currentUser,
            updatedAt: new Date().toISOString()
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-2 sm:mb-2">
                <div>
                    <h2 className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'} leading-tight`}>
                        {order && order.id ? 'Editar OMIS' : 'Nova Ordem de Missão'}
                    </h2>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
                        Preencha os dados abaixo para {order && order.id ? 'atualizar a' : 'gerar uma nova'} ordem de missão
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    className={`p-2.5 ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100'} rounded-xl transition-all shrink-0 border ${isDarkMode ? 'border-slate-800' : 'border-transparent'}`}
                >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
            </div>

            {/* Basic Info */}
            <div className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'} rounded-2xl p-4 sm:p-6 border shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4 duration-500`}>
                <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <Plus className="w-4 h-4" />
                    </div>
                    <h3 className={`text-sm font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-700'} uppercase tracking-widest`}>Informações Básicas</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className={`block text-[10px] font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider mb-2`}>Data da Missão *</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            className={`w-full px-4 py-2.5 border ${isDarkMode ? 'border-slate-700 bg-slate-800/50 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all`}
                            required
                        />
                    </div>

                    <div>
                        <label className={`block text-[10px] font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider mb-2`}>Tipo *</label>
                        <div className={`flex p-1 ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-100'} rounded-xl w-fit`}>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isInternal: true })}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.isInternal ? (isDarkMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white text-blue-600 shadow-sm') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                            >
                                Interna
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isInternal: false })}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!formData.isInternal ? (isDarkMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white text-blue-600 shadow-sm') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                            >
                                Externa
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className={`block text-[10px] font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider mb-2`}>Solicitante *</label>
                        <input
                            type="text"
                            value={formData.requester}
                            onChange={e => setFormData({ ...formData, requester: e.target.value })}
                            className={`w-full px-4 py-2.5 border ${isDarkMode ? 'border-slate-700 bg-slate-800/50 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all`}
                            required
                        />
                    </div>
                </div>
            </div >

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className={`block text-[10px] font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider mb-2`}>Comandante da Missão (Responsável)</label>
                    <div className="flex gap-2 relative">
                        <input
                            type="text"
                            placeholder="Digite o SARAM"
                            className={`flex-1 px-4 py-2.5 border ${isDarkMode ? 'border-slate-700 bg-slate-800/50 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all pr-10`}
                            onBlur={(e) => {
                                const saram = e.target.value;
                                const foundUser = users.find(u => u.saram === saram);
                                if (foundUser) {
                                    setFormData({ ...formData, missionCommanderId: foundUser.id });
                                } else {
                                    setFormData({ ...formData, missionCommanderId: undefined });
                                    if (saram) alert('Militar não encontrado com este SARAM.');
                                }
                            }}
                        />
                        <Search className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    </div>
                    {formData.missionCommanderId && (
                        <div className={`mt-3 p-3 ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-700'} border rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 animate-in zoom-in-95 duration-200`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            Selecionado: {users.find(u => u.id === formData.missionCommanderId)?.rank} {users.find(u => u.id === formData.missionCommanderId)?.warName || users.find(u => u.id === formData.missionCommanderId)?.name}
                        </div>
                    )}
                    <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} mt-2 leading-relaxed`}>
                        Digite o SARAM para selecionar o Comandante que gerenciará a missão.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-[10px] font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider mb-2`}>Missão *</label>
                            <select
                                value={formData.mission}
                                onChange={e => setFormData({ ...formData, mission: e.target.value })}
                                className={`w-full px-4 py-2.5 border ${isDarkMode ? 'border-slate-700 bg-slate-800/50 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all`}
                                required
                            >
                                <option value="">Selecione</option>
                                {TIPOS_MISSAO.map(tipo => (
                                    <option key={tipo} value={tipo}>{tipo}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={`block text-[10px] font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider mb-2`}>Local *</label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                placeholder="Ex: COMGAP"
                                className={`w-full px-4 py-2.5 border ${isDarkMode ? 'border-slate-700 bg-slate-800/50 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all`}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className={`block text-[10px] font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider mb-2`}>Descrição da Missão</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={2}
                            placeholder="Detalhes adicionais sobre a missão..."
                            className={`w-full px-4 py-2.5 border ${isDarkMode ? 'border-slate-700 bg-slate-800/50 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all resize-none`}
                        />
                    </div>
                </div>
            </div>

            <div className={`flex gap-8 p-4 ${isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50'} rounded-xl border ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={formData.transport}
                        onChange={e => setFormData({ ...formData, transport: e.target.checked })}
                        className="w-5 h-5 rounded-lg border-2 border-slate-700 text-blue-600 focus:ring-offset-0 focus:ring-blue-500/50 transition-all"
                    />
                    <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-600 group-hover:text-slate-900'}`}>Transporte</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={formData.food}
                        onChange={e => setFormData({ ...formData, food: e.target.checked })}
                        className="w-5 h-5 rounded-lg border-2 border-slate-700 text-blue-600 focus:ring-offset-0 focus:ring-blue-500/50 transition-all"
                    />
                    <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-600 group-hover:text-slate-900'}`}>Alimentação</span>
                </label>
            </div>


            {/* Personnel Table / Cards */}
            <div className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'} rounded-2xl p-4 sm:p-6 border shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 delay-75`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                            <Plus className="w-4 h-4" />
                        </div>
                        <h3 className={`text-sm font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-700'} uppercase tracking-widest`}>Pessoal e Material</h3>
                    </div>
                    <button
                        type="button"
                        onClick={addPersonnel}
                        className={`flex items-center gap-2 px-4 py-2 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95`}
                    >
                        <Plus className="w-4 h-4" /> Adicionar Militar
                    </button>
                </div>

                {personnel.length > 0 && (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden lg:block overflow-hidden rounded-xl border border-slate-800/50">
                            <table className="w-full text-xs">
                                <thead className={`${isDarkMode ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                                    <tr>
                                        <th className="px-3 py-3 text-left font-black uppercase tracking-tighter">Função</th>
                                        <th className="px-3 py-3 text-left font-black uppercase tracking-tighter">Posto/Grad</th>
                                        <th className="px-3 py-3 text-left font-black uppercase tracking-tighter">Nome de Guerra</th>
                                        <th className="px-3 py-3 text-left font-black uppercase tracking-tighter">SARAM</th>
                                        <th className="px-3 py-3 text-left font-black uppercase tracking-tighter">UNIF</th>
                                        <th className="px-3 py-3 text-left font-black uppercase tracking-tighter">ARMT</th>
                                        <th className="px-3 py-3 text-left font-black uppercase tracking-tighter">Munição</th>
                                        <th className="px-3 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/50' : 'divide-slate-100'}`}>
                                    {personnel.map(p => (
                                        <tr key={p.id} className={`${isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'} transition-colors group`}>
                                            <td className="px-3 py-2">
                                                <select
                                                    value={p.function}
                                                    onChange={e => updatePersonnel(p.id, 'function', e.target.value)}
                                                    className={`w-full px-2 py-1.5 border ${isDarkMode ? 'border-slate-700 bg-slate-800/40 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-xs focus:ring-2 focus:ring-blue-500/50 outline-none`}
                                                >
                                                    <option value="">Selecione</option>
                                                    {MISSION_FUNCTIONS.map(func => (
                                                        <option key={func} value={func}>{func}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2">
                                                <select
                                                    value={p.rank}
                                                    onChange={e => updatePersonnel(p.id, 'rank', e.target.value)}
                                                    className={`w-full px-2 py-1.5 border ${isDarkMode ? 'border-slate-700 bg-slate-800/40 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-xs focus:ring-2 focus:ring-blue-500/50 outline-none`}
                                                >
                                                    <option value="">Selecione</option>
                                                    {RANKS.map(rank => (
                                                        <option key={rank} value={rank}>{rank}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={p.warName}
                                                        onChange={e => {
                                                            const val = e.target.value.toUpperCase();
                                                            updatePersonnel(p.id, 'warName', val);
                                                            if (val.length >= 3) {
                                                                const found = users.find(u =>
                                                                    (u.warName || '').toUpperCase().includes(val) ||
                                                                    (u.name || '').toUpperCase().includes(val)
                                                                );
                                                                if (found) {
                                                                    updatePersonnelFields(p.id, {
                                                                        rank: found.rank,
                                                                        saram: found.saram
                                                                    });
                                                                }
                                                            }
                                                        }}
                                                        onBlur={e => {
                                                            const val = e.target.value.toUpperCase();
                                                            const found = users.find(u =>
                                                                (u.warName || '').toUpperCase() === val ||
                                                                (u.name || '').toUpperCase() === val ||
                                                                (u.warName || '').toUpperCase().includes(val)
                                                            );
                                                            if (found) {
                                                                updatePersonnelFields(p.id, {
                                                                    rank: found.rank,
                                                                    warName: found.warName || found.name,
                                                                    saram: found.saram
                                                                });
                                                            }
                                                        }}
                                                        className={`w-full px-2 py-1.5 pr-7 border ${isDarkMode ? 'border-slate-700 bg-slate-800/40 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-[10px] sm:text-xs focus:border-blue-500/50 outline-none`}
                                                        placeholder="Nome"
                                                    />
                                                    <Search className={`w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={p.saram}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            updatePersonnel(p.id, 'saram', val);
                                                            if (val.length >= 4) {
                                                                const found = users.find(u => u.saram === val);
                                                                if (found) {
                                                                    updatePersonnelFields(p.id, {
                                                                        rank: found.rank,
                                                                        warName: found.warName || found.name
                                                                    });
                                                                }
                                                            }
                                                        }}
                                                        onBlur={e => {
                                                            const val = e.target.value;
                                                            const found = users.find(u => u.saram === val);
                                                            if (found) {
                                                                updatePersonnelFields(p.id, {
                                                                    rank: found.rank,
                                                                    warName: found.warName || found.name,
                                                                    saram: found.saram
                                                                });
                                                            }
                                                        }}
                                                        className={`w-full px-2 py-1.5 pr-7 border ${isDarkMode ? 'border-slate-700 bg-slate-800/40 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-[10px] sm:text-xs focus:border-blue-500/50 outline-none`}
                                                        placeholder="SARAM"
                                                    />
                                                    <Search className={`w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    value={p.uniform}
                                                    onChange={e => updatePersonnel(p.id, 'uniform', e.target.value)}
                                                    className={`w-full px-2 py-1.5 border ${isDarkMode ? 'border-slate-700 bg-slate-800/40 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-xs focus:ring-2 focus:ring-blue-500/50 outline-none`}
                                                    placeholder="10ª"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <select
                                                    value={p.armament}
                                                    onChange={e => updatePersonnel(p.id, 'armament', e.target.value)}
                                                    className={`w-full px-2 py-1.5 border ${isDarkMode ? 'border-slate-700 bg-slate-800/40 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-xs focus:ring-2 focus:ring-blue-500/50 outline-none`}
                                                >
                                                    <option value="">Selecione</option>
                                                    {ARMAMENT_OPTIONS.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    value={p.ammunition}
                                                    onChange={e => updatePersonnel(p.id, 'ammunition', e.target.value)}
                                                    className={`w-full px-2 py-1.5 border ${isDarkMode ? 'border-slate-700 bg-slate-800/40 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-xs focus:ring-2 focus:ring-blue-500/50 outline-none`}
                                                    placeholder="Qtd"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => removePersonnel(p.id)}
                                                    className={`p-1.5 text-red-500 ${isDarkMode ? 'hover:bg-red-500/20' : 'hover:bg-red-50'} rounded-lg transition-all active:scale-90`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile and Tablet Card View */}
                        <div className="lg:hidden space-y-4">
                            {personnel.map((p, idx) => (
                                <div key={p.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'border-slate-800 bg-slate-800/20' : 'border-slate-200 bg-slate-50'} relative group animate-in slide-in-from-right-4 duration-300`} style={{ animationDelay: `${idx * 50}ms` }}>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                                            Militar #{idx + 1}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removePersonnel(p.id)}
                                            className={`p-2 text-red-500 ${isDarkMode ? 'bg-red-500/10' : 'bg-red-50'} rounded-xl hover:scale-110 transition-all`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className={`block text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase mb-1.5`}>Função</label>
                                            <select
                                                value={p.function}
                                                onChange={e => updatePersonnel(p.id, 'function', e.target.value)}
                                                className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800/40 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-xl text-sm outline-none focus:border-blue-500/50`}
                                            >
                                                <option value="">Selecione</option>
                                                {MISSION_FUNCTIONS.map(func => (
                                                    <option key={func} value={func}>{func}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-span-1">
                                            <label className={`block text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase mb-1.5`}>SARAM</label>
                                            <input
                                                type="text"
                                                value={p.saram}
                                                onChange={e => updatePersonnel(p.id, 'saram', e.target.value)}
                                                className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800/40 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-xl text-sm outline-none focus:border-blue-500/50`}
                                                placeholder="SARAM"
                                            />
                                        </div>

                                        <div className="col-span-1">
                                            <label className={`block text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase mb-1.5`}>Guerra</label>
                                            <input
                                                type="text"
                                                value={p.warName}
                                                onChange={e => updatePersonnel(p.id, 'warName', e.target.value.toUpperCase())}
                                                className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800/40 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-xl text-sm outline-none focus:border-blue-500/50`}
                                                placeholder="Busca..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Schedule Table / Cards */}
            <div className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'} rounded-2xl p-4 sm:p-6 border shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 delay-150`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                            <Plus className="w-4 h-4" />
                        </div>
                        <h3 className={`text-sm font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-700'} uppercase tracking-widest`}>Quadro Horário</h3>
                    </div>
                    <button
                        type="button"
                        onClick={addSchedule}
                        className={`flex items-center gap-2 px-4 py-2 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95`}
                    >
                        <Plus className="w-4 h-4" /> Adicionar Evento
                    </button>
                </div>

                {schedule.length > 0 && (
                    <>
                        {/* Desktop View */}
                        <div className="hidden lg:block overflow-hidden rounded-xl border border-slate-800/50">
                            <table className="w-full text-xs">
                                <thead className={`${isDarkMode ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                                    <tr>
                                        <th className="px-3 py-3 text-left font-black uppercase tracking-tighter w-24">Início</th>
                                        <th className="px-3 py-3 text-left font-black uppercase tracking-tighter w-24">Fim</th>
                                        <th className="px-3 py-3 text-left font-black uppercase tracking-tighter">Evento/Local</th>
                                        <th className="px-3 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/50' : 'divide-slate-100'}`}>
                                    {schedule.map(s => (
                                        <tr key={s.id} className={`${isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'} transition-colors group`}>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="time"
                                                    value={s.startTime}
                                                    onChange={e => updateSchedule(s.id, 'startTime', e.target.value)}
                                                    className={`w-full px-2 py-1.5 border ${isDarkMode ? 'border-slate-700 bg-slate-800/40 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-xs focus:ring-2 focus:ring-blue-500/50 outline-none`}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="time"
                                                    value={s.endTime}
                                                    onChange={e => updateSchedule(s.id, 'endTime', e.target.value)}
                                                    className={`w-full px-2 py-1.5 border ${isDarkMode ? 'border-slate-700 bg-slate-800/40 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-xs focus:ring-2 focus:ring-blue-500/50 outline-none`}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    value={s.event}
                                                    onChange={e => updateSchedule(s.id, 'event', e.target.value)}
                                                    placeholder="Ex: Briefing na Sala 01"
                                                    className={`w-full px-2 py-1.5 border ${isDarkMode ? 'border-slate-700 bg-slate-800/40 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-xs focus:ring-2 focus:ring-blue-500/50 outline-none`}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => removeSchedule(s.id)}
                                                    className={`p-1.5 text-red-500 ${isDarkMode ? 'hover:bg-red-500/20' : 'hover:bg-red-50'} rounded-lg transition-all active:scale-90`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View */}
                        <div className="lg:hidden space-y-4">
                            {schedule.map((s, idx) => (
                                <div key={s.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'border-slate-800 bg-slate-800/20' : 'border-slate-200 bg-slate-50'} relative group animate-in slide-in-from-right-4 duration-300`} style={{ animationDelay: `${idx * 50}ms` }}>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                            Evento #{idx + 1}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeSchedule(s.id)}
                                            className={`p-2 text-red-500 ${isDarkMode ? 'bg-red-500/10' : 'bg-red-50'} rounded-xl hover:scale-110 transition-all`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase mb-1.5`}>Início</label>
                                            <input
                                                type="time"
                                                value={s.startTime}
                                                onChange={e => updateSchedule(s.id, 'startTime', e.target.value)}
                                                className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800/40 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-xl text-sm outline-none focus:border-blue-500/50`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase mb-1.5`}>Fim</label>
                                            <input
                                                type="time"
                                                value={s.endTime}
                                                onChange={e => updateSchedule(s.id, 'endTime', e.target.value)}
                                                className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800/40 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-xl text-sm outline-none focus:border-blue-500/50`}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className={`block text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase mb-1.5`}>Evento/Local</label>
                                            <input
                                                type="text"
                                                value={s.event}
                                                onChange={e => updateSchedule(s.id, 'event', e.target.value)}
                                                className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800/40 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-xl text-sm outline-none focus:border-blue-500/50`}
                                                placeholder="Local ou atividade..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Form Actions */}
            <div className={`flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 sm:pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <button
                    type="button"
                    onClick={onCancel}
                    className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700' : 'text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95`}
                >
                    <Save className="w-4 h-4" />
                    {order && order.id ? 'Salvar Alterações' : 'Gerar Ordem de Missão'}
                </button>
            </div>

            {/* Orders */}
            <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} rounded-xl p-6 border space-y-4`}>
                <h3 className={`text-sm font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-widest`}>Ordens</h3>

                <div>
                    <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2`}>Ordens Permanentes</label>
                    <textarea
                        value={formData.permanentOrders}
                        onChange={e => setFormData({ ...formData, permanentOrders: e.target.value })}
                        rows={3}
                        className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none`}
                        placeholder="Ex: Realizar apoio ao COMGAP no dia 06/02/2026"
                    />
                </div>

                <div>
                    <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2`}>Ordens Especiais</label>
                    <textarea
                        value={formData.specialOrders}
                        onChange={e => setFormData({ ...formData, specialOrders: e.target.value })}
                        rows={3}
                        className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none`}
                        placeholder="Ordens especiais (opcional)"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                    type="submit"
                    className={`w-full sm:flex-1 py-3 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 order-1 sm:order-1 whitespace-nowrap min-w-fit px-4`}
                >
                    <Save className="w-5 h-5" />
                    {order && order.id ? 'Salvar Alterações' : 'Criar Ordem de Missão'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className={`w-full sm:px-6 py-3 ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'} rounded-xl font-bold transition-all order-2 sm:order-2`}
                >
                    Cancelar
                </button>
            </div>

            {/* Workflow Actions */}
            {
                order && order.id && (
                    <div className={`border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} pt-6 mt-6`}>
                        <h3 className={`text-sm font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-widest mb-4`}>Fluxo da Missão</h3>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6">
                            <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest ${order.status === 'CONCLUIDA' ? (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') :
                                order.status === 'EM_MISSAO' ? (isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700') :
                                    (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600')
                                }`}>
                                Status: {order.status || 'GERADA'}
                            </div>

                            {/* Só permite iniciar se estiver PRONTA (Assinada) ou se for um fluxo simplificado */}
                            {(order.status === 'PRONTA_PARA_EXECUCAO' || order.status === 'GERADA') && (
                                <button
                                    type="button"
                                    onClick={() => onSubmit({ ...order, status: 'EM_MISSAO' })}
                                    className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                    Iniciar
                                </button>
                            )}

                            {order.status === 'EM_MISSAO' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const report = prompt('Digite o relato:');
                                            if (report) {
                                                const newTimeline = [
                                                    ...(order.timeline || []),
                                                    {
                                                        id: Math.random().toString(),
                                                        timestamp: new Date().toISOString(),
                                                        userId: currentUser,
                                                        userName: currentUser,
                                                        text: report,
                                                        type: 'REPORT'
                                                    }
                                                ];
                                                onSubmit({ ...order, timeline: newTimeline as any });
                                            }
                                        }}
                                        className={`flex-1 sm:flex-none px-4 py-2 ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                        Relato
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onSubmit({ ...order, status: 'CONCLUIDA' })}
                                        className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        Concluir
                                    </button>
                                </>
                            )}

                            {/* Cancel Button - Available for all active statuses */}
                            {order.status !== 'CANCELADA' && order.status !== 'CONCLUIDA' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (confirm('Tem certeza que deseja CANCELAR esta missão?')) {
                                            onSubmit({ ...order, status: 'CANCELADA' });
                                        }
                                    }}
                                    className={`w-full sm:w-auto mt-2 sm:mt-0 px-4 py-2 ${isDarkMode ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-100'} rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 sm:ml-auto`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                                    Cancelar
                                </button>
                            )}
                        </div>

                        {/* Timeline / Reports */}
                        {order.timeline && order.timeline.length > 0 && (
                            <div className={`space-y-4 ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'} p-4 rounded-xl`}>
                                {order.timeline.map((event: any) => (
                                    <div key={event.id} className="flex gap-3">
                                        <div className={`mt-1 w-2 h-2 rounded-full ${isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`}></div>
                                        <div>
                                            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-bold mb-1`}>
                                                {new Date(event.timestamp).toLocaleString()} - {event.userName}
                                            </p>
                                            <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{event.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            }
        </form >
    );
};

export default MissionOrderForm;
