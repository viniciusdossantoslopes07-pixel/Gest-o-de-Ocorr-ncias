
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
            activity: '',
            location: '',
            date: formData.date,
            time: ''
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
            <div className="flex items-center justify-between mb-2 sm:mb-0">
                <h2 className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'} leading-tight`}>
                    {order && order.id ? 'Editar OMIS' : 'Nova Ordem de Missão'}
                </h2>
                <button
                    type="button"
                    onClick={onCancel}
                    className={`p-2 ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'} rounded-lg transition-all shrink-0`}
                >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
            </div>

            {/* Basic Info */}
            <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} rounded-xl p-4 sm:p-6 border space-y-4`}>
                <h3 className={`text-sm font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-widest text-xs sm:text-sm`}>Informações Básicas</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2`}>Data da Missão *</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                            required
                        />
                    </div>

                    <div>
                        <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2`}>Tipo *</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={formData.isInternal}
                                    onChange={() => setFormData({ ...formData, isInternal: true })}
                                    className="w-4 h-4"
                                />
                                <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>Interna</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={!formData.isInternal}
                                    onChange={() => setFormData({ ...formData, isInternal: false })}
                                    className="w-4 h-4"
                                />
                                <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>Externa</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2`}>Solicitante *</label>
                        <input
                            type="text"
                            value={formData.requester}
                            onChange={e => setFormData({ ...formData, requester: e.target.value })}
                            className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                            required
                        />
                    </div>
                </div>
            </div >

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2`}>Comandante da Missão (Responsável)</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Digite o SARAM"
                            className={`flex-1 px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
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
                    </div>
                    {formData.missionCommanderId && (
                        <div className={`mt-2 p-2 ${isDarkMode ? 'bg-blue-900/30 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-700'} border rounded-lg text-xs font-bold`}>
                            Selecionado: {users.find(u => u.id === formData.missionCommanderId)?.rank} {users.find(u => u.id === formData.missionCommanderId)?.warName || users.find(u => u.id === formData.missionCommanderId)?.name}
                        </div>
                    )}
                    <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} mt-1`}>
                        Digite o SARAM para selecionar o Comandante que gerenciará a missão.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2`}>Missão *</label>
                    <select
                        value={formData.mission}
                        onChange={e => setFormData({ ...formData, mission: e.target.value })}
                        className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                        required
                    >
                        <option value="">Selecione o tipo de missão</option>
                        {TIPOS_MISSAO.map(tipo => (
                            <option key={tipo} value={tipo}>{tipo}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2`}>Local *</label>
                    <input
                        type="text"
                        value={formData.location}
                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Ex: COMGAP"
                        className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                        required
                    />
                </div>
            </div>

            <div>
                <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2`}>Descrição da Missão</label>
                <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none`}
                />
            </div>

            <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.transport}
                        onChange={e => setFormData({ ...formData, transport: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Transporte</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.food}
                        onChange={e => setFormData({ ...formData, food: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Alimentação</span>
                </label>
            </div>


            {/* Personnel Table / Cards */}
            <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} rounded-xl p-4 sm:p-6 border space-y-4`}>
                <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-widest`}>Pessoal e Material</h3>
                    <button
                        type="button"
                        onClick={addPersonnel}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Adicionar
                    </button>
                </div>

                {personnel.length > 0 && (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className={`${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                                    <tr>
                                        <th className="px-2 py-2 text-left font-bold">Função</th>
                                        <th className="px-2 py-2 text-left font-bold">Posto/Grad</th>
                                        <th className="px-2 py-2 text-left font-bold">Nome de Guerra</th>
                                        <th className="px-2 py-2 text-left font-bold">SARAM</th>
                                        <th className="px-2 py-2 text-left font-bold">UNIF</th>
                                        <th className="px-2 py-2 text-left font-bold">ARMT</th>
                                        <th className="px-2 py-2 text-left font-bold">Munição</th>
                                        <th className="px-2 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                    {personnel.map(p => (
                                        <tr key={p.id} className="border-t border-slate-100">
                                            <td className="px-2 py-2">
                                                <select
                                                    value={p.function}
                                                    onChange={e => updatePersonnel(p.id, 'function', e.target.value)}
                                                    className={`w-full px-2 py-1 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded text-xs`}
                                                >
                                                    <option value="">Selecione</option>
                                                    {MISSION_FUNCTIONS.map(func => (
                                                        <option key={func} value={func}>{func}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2">
                                                <select
                                                    value={p.rank}
                                                    onChange={e => updatePersonnel(p.id, 'rank', e.target.value)}
                                                    className={`w-full px-2 py-1 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded text-xs`}
                                                >
                                                    <option value="">Selecione</option>
                                                    {RANKS.map(rank => (
                                                        <option key={rank} value={rank}>{rank}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="relative group">
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
                                                        className={`w-full px-2 py-1 pr-7 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded text-xs focus:border-blue-500 outline-none`}
                                                        placeholder="Nome"
                                                    />
                                                    <Search className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                </div>
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="relative group">
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
                                                        className={`w-full px-2 py-1 pr-7 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded text-xs focus:border-blue-500 outline-none`}
                                                        placeholder="SARAM"
                                                    />
                                                    <Search className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                </div>
                                            </td>
                                            <td className="px-2 py-2">
                                                <input
                                                    type="text"
                                                    value={p.uniform}
                                                    onChange={e => updatePersonnel(p.id, 'uniform', e.target.value)}
                                                    className={`w-full px-2 py-1 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded text-xs`}
                                                    placeholder="Ex: 10ª"
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <select
                                                    value={p.armament}
                                                    onChange={e => updatePersonnel(p.id, 'armament', e.target.value)}
                                                    className={`w-full px-2 py-1 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded text-xs`}
                                                >
                                                    <option value="">Selecione</option>
                                                    {ARMAMENT_OPTIONS.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2">
                                                <input
                                                    type="text"
                                                    value={p.ammunition}
                                                    onChange={e => updatePersonnel(p.id, 'ammunition', e.target.value)}
                                                    className={`w-full px-2 py-1 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded text-xs`}
                                                />
                                            </td>
                                            <td className="px-2 py-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => removePersonnel(p.id)}
                                                    className={`p-1 text-red-600 ${isDarkMode ? 'hover:bg-red-900/30' : 'hover:bg-red-50'} rounded transition-all`}
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
                                <div key={p.id} className={`p-4 rounded-xl border ${isDarkMode ? 'border-slate-800 bg-slate-800/50' : 'border-slate-200 bg-slate-50'} relative group`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                            Militar #{idx + 1}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removePersonnel(p.id)}
                                            className="p-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <label className={`block text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase mb-1`}>Função na Missão</label>
                                            <select
                                                value={p.function}
                                                onChange={e => updatePersonnel(p.id, 'function', e.target.value)}
                                                className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm`}
                                            >
                                                <option value="">Selecione</option>
                                                {MISSION_FUNCTIONS.map(func => (
                                                    <option key={func} value={func}>{func}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className={`block text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase mb-1`}>Posto/Grad</label>
                                            <select
                                                value={p.rank}
                                                onChange={e => updatePersonnel(p.id, 'rank', e.target.value)}
                                                className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm`}
                                            >
                                                <option value="">Selecione</option>
                                                {RANKS.map(rank => (
                                                    <option key={rank} value={rank}>{rank}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className={`block text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase mb-1`}>SARAM</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={p.saram}
                                                    onChange={e => updatePersonnel(p.id, 'saram', e.target.value)}
                                                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm`}
                                                    placeholder="SARAM"
                                                />
                                            </div>
                                        </div>

                                        <div className="col-span-2">
                                            <label className={`block text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase mb-1`}>Guerra / Nome Completo</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={p.warName}
                                                    onChange={e => updatePersonnel(p.id, 'warName', e.target.value.toUpperCase())}
                                                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm`}
                                                    placeholder="Digite para buscar..."
                                                />
                                                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className={`block text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase mb-1`}>Uniforme</label>
                                            <input
                                                type="text"
                                                value={p.uniform}
                                                onChange={e => updatePersonnel(p.id, 'uniform', e.target.value)}
                                                className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm`}
                                                placeholder="Ex: 10ª"
                                            />
                                        </div>

                                        <div>
                                            <label className={`block text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase mb-1`}>Armamento</label>
                                            <select
                                                value={p.armament}
                                                onChange={e => updatePersonnel(p.id, 'armament', e.target.value)}
                                                className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm`}
                                            >
                                                <option value="">Selecione</option>
                                                {ARMAMENT_OPTIONS.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Schedule Table / Cards */}
            <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} rounded-xl p-4 sm:p-6 border space-y-4`}>
                <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-widest`}>Quadro Horário</h3>
                    <button
                        type="button"
                        onClick={addSchedule}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Adicionar
                    </button>
                </div>

                {schedule.length > 0 && (
                    <>
                        {/* Desktop View */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className={`${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                                    <tr>
                                        <th className="px-2 py-2 text-left font-bold">Atividade</th>
                                        <th className="px-2 py-2 text-left font-bold">Local</th>
                                        <th className="px-2 py-2 text-left font-bold">Data</th>
                                        <th className="px-2 py-2 text-left font-bold">Hora</th>
                                        <th className="px-2 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                    {schedule.map(s => (
                                        <tr key={s.id} className="border-t border-slate-100">
                                            <td className="px-2 py-2 text-left">
                                                <input
                                                    type="text"
                                                    value={s.activity}
                                                    onChange={e => updateSchedule(s.id, 'activity', e.target.value)}
                                                    className={`w-full px-2 py-1 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded text-xs`}
                                                    placeholder="Ex: Reunião"
                                                />
                                            </td>
                                            <td className="px-2 py-2 text-left">
                                                <input
                                                    type="text"
                                                    value={s.location}
                                                    onChange={e => updateSchedule(s.id, 'location', e.target.value)}
                                                    className={`w-full px-2 py-1 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded text-xs`}
                                                />
                                            </td>
                                            <td className="px-2 py-2 text-left">
                                                <input
                                                    type="date"
                                                    value={s.date}
                                                    onChange={e => updateSchedule(s.id, 'date', e.target.value)}
                                                    className={`w-full px-2 py-1 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded text-xs`}
                                                />
                                            </td>
                                            <td className="px-2 py-2 text-left">
                                                <input
                                                    type="time"
                                                    value={s.time}
                                                    onChange={e => updateSchedule(s.id, 'time', e.target.value)}
                                                    className={`w-full px-2 py-1 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded text-xs`}
                                                />
                                            </td>
                                            <td className="px-2 py-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => removeSchedule(s.id)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-all"
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
                        <div className="sm:hidden space-y-4">
                            {schedule.map((s, idx) => (
                                <div key={s.id} className={`p-4 rounded-xl border ${isDarkMode ? 'border-slate-800 bg-slate-800/50' : 'border-slate-200 bg-slate-50'} relative`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className={`text-[10px] font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase`}>Evento #{idx + 1}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeSchedule(s.id)}
                                            className={`p-1.5 text-red-600 ${isDarkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded-lg`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={s.activity}
                                            onChange={e => updateSchedule(s.id, 'activity', e.target.value)}
                                            className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm`}
                                            placeholder="Atividade (Ex: Briefing)"
                                        />
                                        <input
                                            type="text"
                                            value={s.location}
                                            onChange={e => updateSchedule(s.id, 'location', e.target.value)}
                                            className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm`}
                                            placeholder="Local"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="date"
                                                value={s.date}
                                                onChange={e => updateSchedule(s.id, 'date', e.target.value)}
                                                className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm`}
                                            />
                                            <input
                                                type="time"
                                                value={s.time}
                                                onChange={e => updateSchedule(s.id, 'time', e.target.value)}
                                                className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
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
