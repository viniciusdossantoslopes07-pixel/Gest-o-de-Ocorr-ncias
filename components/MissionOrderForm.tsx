
import { useState, type FC, type FormEvent } from 'react';
import { MissionOrder, MissionOrderPersonnel, MissionOrderSchedule } from '../types';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { RANKS, ARMAMENT_OPTIONS } from '../constants';

interface MissionOrderFormProps {
    order?: MissionOrder;
    onSubmit: (order: Partial<MissionOrder>) => void;
    onCancel: () => void;
    onCancel: () => void;
    currentUser: string;
    users: { id: string; name: string; rank: string; warName?: string }[];
}

const MissionOrderForm: FC<MissionOrderFormProps> = ({ order, onSubmit, onCancel, currentUser, users }) => {
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
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">
                    {order && order.id ? 'Editar OMIS' : 'Nova Ordem de Missão'}
                </h2>
                <button
                    type="button"
                    onClick={onCancel}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Basic Info */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-4">
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Informações Básicas</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2">Data da Missão *</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2">Tipo *</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={formData.isInternal}
                                    onChange={() => setFormData({ ...formData, isInternal: true })}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm font-medium">Interna</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={!formData.isInternal}
                                    onChange={() => setFormData({ ...formData, isInternal: false })}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm font-medium">Externa</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2">Solicitante *</label>
                        <input
                            type="text"
                            value={formData.requester}
                            onChange={e => setFormData({ ...formData, requester: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                </div>
            </div>

            {/* Commander and Responsibles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">Comandante da Missão (Responsável)</label>
                    <select
                        value={formData.missionCommanderId}
                        onChange={e => setFormData({ ...formData, missionCommanderId: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">Selecione o Comandante...</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.rank} {u.warName || u.name}
                            </option>
                        ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                        O usuário selecionado poderá gerenciar o status da missão via "Meu Perfil".
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">Missão *</label>
                    <input
                        type="text"
                        value={formData.mission}
                        onChange={e => setFormData({ ...formData, mission: e.target.value })}
                        placeholder="Ex: Apoio"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">Local *</label>
                    <input
                        type="text"
                        value={formData.location}
                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Ex: COMGAP"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Descrição da Missão</label>
                <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
            </div>

            <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.transport}
                        onChange={e => setFormData({ ...formData, transport: e.target.checked })}
                        className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Transporte</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.food}
                        onChange={e => setFormData({ ...formData, food: e.target.checked })}
                        className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Alimentação</span>
                </label>
            </div>
        </div>

            {/* Personnel Table */ }
    <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Pessoal e Material</h3>
            <button
                type="button"
                onClick={addPersonnel}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all"
            >
                <Plus className="w-4 h-4" /> Adicionar
            </button>
        </div>

        {personnel.length > 0 && (
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-2 py-2 text-left font-bold text-slate-600">Função</th>
                            <th className="px-2 py-2 text-left font-bold text-slate-600">Posto/Grad</th>
                            <th className="px-2 py-2 text-left font-bold text-slate-600">Nome de Guerra</th>
                            <th className="px-2 py-2 text-left font-bold text-slate-600">SARAM</th>
                            <th className="px-2 py-2 text-left font-bold text-slate-600">UNIF</th>
                            <th className="px-2 py-2 text-left font-bold text-slate-600">ARMT</th>
                            <th className="px-2 py-2 text-left font-bold text-slate-600">Munição</th>
                            <th className="px-2 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {personnel.map(p => (
                            <tr key={p.id} className="border-t border-slate-100">
                                <td className="px-2 py-2">
                                    <input
                                        type="text"
                                        value={p.function}
                                        onChange={e => updatePersonnel(p.id, 'function', e.target.value)}
                                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                        placeholder="Ex: Efetivo S.I"
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <select
                                        value={p.rank}
                                        onChange={e => updatePersonnel(p.id, 'rank', e.target.value)}
                                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                    >
                                        <option value="">Selecione</option>
                                        {RANKS.map(rank => (
                                            <option key={rank} value={rank}>{rank}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-2 py-2">
                                    <input
                                        type="text"
                                        value={p.warName}
                                        onChange={e => updatePersonnel(p.id, 'warName', e.target.value)}
                                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <input
                                        type="text"
                                        value={p.saram}
                                        onChange={e => updatePersonnel(p.id, 'saram', e.target.value)}
                                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <input
                                        type="text"
                                        value={p.uniform}
                                        onChange={e => updatePersonnel(p.id, 'uniform', e.target.value)}
                                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                        placeholder="Ex: 10ª"
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <select
                                        value={p.armament}
                                        onChange={e => updatePersonnel(p.id, 'armament', e.target.value)}
                                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
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
                                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <button
                                        type="button"
                                        onClick={() => removePersonnel(p.id)}
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
        )}
    </div>

    {/* Schedule Table */ }
    <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Quadro Horário</h3>
            <button
                type="button"
                onClick={addSchedule}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all"
            >
                <Plus className="w-4 h-4" /> Adicionar
            </button>
        </div>

        {schedule.length > 0 && (
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-2 py-2 text-left font-bold text-slate-600">Atividade</th>
                            <th className="px-2 py-2 text-left font-bold text-slate-600">Local</th>
                            <th className="px-2 py-2 text-left font-bold text-slate-600">Data</th>
                            <th className="px-2 py-2 text-left font-bold text-slate-600">Hora</th>
                            <th className="px-2 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {schedule.map(s => (
                            <tr key={s.id} className="border-t border-slate-100">
                                <td className="px-2 py-2">
                                    <input
                                        type="text"
                                        value={s.activity}
                                        onChange={e => updateSchedule(s.id, 'activity', e.target.value)}
                                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                        placeholder="Ex: Reunião/Briefing"
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <input
                                        type="text"
                                        value={s.location}
                                        onChange={e => updateSchedule(s.id, 'location', e.target.value)}
                                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <input
                                        type="date"
                                        value={s.date}
                                        onChange={e => updateSchedule(s.id, 'date', e.target.value)}
                                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <input
                                        type="time"
                                        value={s.time}
                                        onChange={e => updateSchedule(s.id, 'time', e.target.value)}
                                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                    />
                                </td>
                                <td className="px-2 py-2">
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
        )}
    </div>

    {/* Orders */ }
    <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-4">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Ordens</h3>

        <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Ordens Permanentes</label>
            <textarea
                value={formData.permanentOrders}
                onChange={e => setFormData({ ...formData, permanentOrders: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Ex: Realizar apoio ao COMGAP no dia 06/02/2026"
            />
        </div>

        <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Ordens Especiais</label>
            <textarea
                value={formData.specialOrders}
                onChange={e => setFormData({ ...formData, specialOrders: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Ordens especiais (opcional)"
            />
        </div>
    </div>

    {/* Actions */ }
    <div className="flex gap-3">
        <button
            type="submit"
            className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
        >
            <Save className="w-5 h-5" />
            {order && order.id ? 'Salvar Alterações' : 'Criar Ordem de Missão'}
        </button>
        <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
        >
            Cancelar
        </button>
    </div>

    {/* Workflow Actions */ }
    {
        order && order.id && (
            <div className="border-t border-slate-200 pt-6 mt-6">
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4">Fluxo da Missão</h3>

                <div className="flex items-center gap-4 mb-6">
                    <div className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ${order.status === 'CONCLUIDA' ? 'bg-green-100 text-green-700' :
                        order.status === 'EM_ANDAMENTO' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                        }`}>
                        Status: {order.status || 'GERADA'}
                    </div>

                    {order.status === 'GERADA' && (
                        <button
                            type="button"
                            onClick={() => onSubmit({ ...order, status: 'EM_ANDAMENTO' })}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            Iniciar Missão
                        </button>
                    )}

                    {order.status === 'EM_ANDAMENTO' && (
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
                                                userId: currentUser, //Ideally ID
                                                userName: currentUser, //Ideally Name
                                                text: report,
                                                type: 'REPORT'
                                            }
                                        ];
                                        onSubmit({ ...order, timeline: newTimeline as any });
                                    }
                                }}
                                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                Adicionar Relato
                            </button>
                            <button
                                type="button"
                                onClick={() => onSubmit({ ...order, status: 'CONCLUIDA' })}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-all flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Concluir Missão
                            </button>
                        </>
                    )}

                    {/* Cancel Button - Available for all active statuses */}
                    {order.status !== 'CANCELADA' && (
                        <button
                            type="button"
                            onClick={() => {
                                if (confirm('Tem certeza que deseja CANCELAR esta missão?')) {
                                    onSubmit({ ...order, status: 'CANCELADA' });
                                }
                            }}
                            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200 transition-all flex items-center gap-2 ml-auto"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                            Cancelar Missão
                        </button>
                    )}
                </div>

                {/* Timeline / Reports */}
                {order.timeline && order.timeline.length > 0 && (
                    <div className="space-y-4 bg-slate-50 p-4 rounded-xl">
                        {order.timeline.map((event: any) => (
                            <div key={event.id} className="flex gap-3">
                                <div className="mt-1 w-2 h-2 rounded-full bg-slate-300"></div>
                                <div>
                                    <p className="text-xs text-slate-500 font-bold mb-1">
                                        {new Date(event.timestamp).toLocaleString()} - {event.userName}
                                    </p>
                                    <p className="text-sm text-slate-700">{event.text}</p>
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
