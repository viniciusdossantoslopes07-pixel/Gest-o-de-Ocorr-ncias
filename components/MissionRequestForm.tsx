import { useState, type FC, type FormEvent } from 'react';
import { User } from '../types';
import { RANKS, SETORES, TIPOS_MISSAO } from '../constants';
import { Save, X, Calendar, Clock, MapPin, Users, Truck, Coffee, Search } from 'lucide-react';
import { supabase } from '../services/supabase';

interface MissionRequestFormProps {
    user: User;
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

const MissionRequestForm: FC<MissionRequestFormProps> = ({ user, onSubmit, onCancel }) => {
    const [requesterId, setRequesterId] = useState(user.id);

    const [formData, setFormData] = useState({
        saram: user.saram || '',
        posto: user.rank || '',
        nome_guerra: user.name.split(' ').pop() || '', // Sugestão inicial
        setor: user.sector || '',
        tipo_missao: TIPOS_MISSAO[0],
        data: new Date().toISOString().split('T')[0],
        inicio: '08:00',
        termino: '17:00',
        local: '',
        responsavel: {
            nome: '',
            om: '',
            telefone: ''
        },
        efetivo: '',
        viaturas: '',
        alimentacao: {
            cafe: false,
            almoco: false,
            janta: false,
            ceia: false,
            lanche: false
        }
    });

    const handleSaramBlur = async () => {
        if (!formData.saram) return;

        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('saram', formData.saram)
                .single();

            if (error) throw error;

            if (data) {
                setRequesterId(data.id);
                setFormData(prev => ({
                    ...prev,
                    posto: data.rank || '',
                    nome_guerra: data.warName || data.name.split(' ').pop() || '',
                    setor: data.sector || ''
                }));
            }
        } catch (error) {
            console.error('Erro ao buscar usuário por SARAM:', error);
            alert('Usuário não encontrado com este SARAM.');
        }
    };

    const [isExternalCmd, setIsExternalCmd] = useState(false);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!formData.nome_guerra || !formData.local || !formData.efetivo) {
            alert('Preencha os campos obrigatórios.');
            return;
        }

        // Validate date
        if (!formData.data) {
            alert('Por favor, selecione uma data para a missão.');
            return;
        }

        // Prepare data package
        const submissionData = {
            solicitante_id: requesterId,
            dados_missao: {
                ...formData
            },
            status: 'PENDENTE',
            data_criacao: new Date().toISOString()
        };

        onSubmit(submissionData);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-xl font-bold">Solicitação de Missão</h2>
                    <p className="text-slate-400 text-xs mt-1">GSD-SP - Gestão de Operações</p>
                </div>
                <button type="button" onClick={onCancel} className="hover:bg-slate-800 p-2 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto flex-1">
                {/* 1. Identificação */}
                <section className="space-y-4">
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" /> Identificação
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2">SARAM</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={formData.saram}
                                    onChange={e => setFormData({ ...formData, saram: e.target.value })}
                                    onBlur={handleSaramBlur}
                                    className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Digite..."
                                />
                                <button
                                    type="button"
                                    onClick={handleSaramBlur}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                                >
                                    <Search className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2">Posto/Graduação</label>
                            <select
                                value={formData.posto}
                                onChange={e => setFormData({ ...formData, posto: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            >
                                <option value="">Selecione</option>
                                {RANKS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2">Nome de Guerra</label>
                            <input
                                type="text"
                                value={formData.nome_guerra}
                                onChange={e => setFormData({ ...formData, nome_guerra: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2">Setor</label>
                            <select
                                value={formData.setor}
                                onChange={e => setFormData({ ...formData, setor: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            >
                                <option value="">Selecione</option>
                                {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </section>

                <hr className="border-slate-100" />

                {/* 2. Logística */}
                <section className="space-y-4">
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600" /> Logística da Missão
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-bold text-slate-600 mb-2">Tipo de Missão</label>
                            <select
                                value={formData.tipo_missao}
                                onChange={e => setFormData({ ...formData, tipo_missao: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            >
                                {TIPOS_MISSAO.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Data
                            </label>
                            <input
                                type="date"
                                value={formData.data}
                                onChange={e => setFormData({ ...formData, data: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-600 mb-2 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Início
                                </label>
                                <input
                                    type="time"
                                    value={formData.inicio}
                                    onChange={e => setFormData({ ...formData, inicio: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-600 mb-2 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Término
                                </label>
                                <input
                                    type="time"
                                    value={formData.termino}
                                    onChange={e => setFormData({ ...formData, termino: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-bold text-slate-600 mb-2">Local</label>
                            <input
                                type="text"
                                value={formData.local}
                                onChange={e => setFormData({ ...formData, local: e.target.value })}
                                placeholder="Ex: Pátio de Aeronaves / Ala 13"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>
                    </div>
                </section>

                <hr className="border-slate-100" />

                {/* 3. Responsável */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" /> Responsável Pela Missão
                        </h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isExternalCmd}
                                onChange={e => setIsExternalCmd(e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600"
                            />
                            <span className="text-xs font-bold text-slate-500">Externo ao GSD-SP?</span>
                        </label>
                    </div>

                    {isExternalCmd && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-2">Nome Completo</label>
                                <input
                                    type="text"
                                    value={formData.responsavel.nome}
                                    onChange={e => setFormData({ ...formData, responsavel: { ...formData.responsavel, nome: e.target.value } })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-2">OM</label>
                                <input
                                    type="text"
                                    value={formData.responsavel.om}
                                    onChange={e => setFormData({ ...formData, responsavel: { ...formData.responsavel, om: e.target.value } })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-2">Telefone/Ramal</label>
                                <input
                                    type="text"
                                    value={formData.responsavel.telefone}
                                    onChange={e => setFormData({ ...formData, responsavel: { ...formData.responsavel, telefone: e.target.value } })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    )}
                    {!isExternalCmd && (
                        <p className="text-xs text-slate-400 italic">O responsável será o próprio solicitante ({formData.posto} {formData.nome_guerra}).</p>
                    )}
                </section>

                <hr className="border-slate-100" />

                {/* 4. Recursos e Alimentação */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section className="space-y-4">
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                            <Truck className="w-4 h-4 text-blue-600" /> Recursos Necessários
                        </h3>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2">Efetivo</label>
                            <textarea
                                value={formData.efetivo}
                                onChange={e => setFormData({ ...formData, efetivo: e.target.value })}
                                placeholder="Ex: 1 Sgt, 2 Cabos e 4 Soldados para isolamento..."
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2">Viaturas</label>
                            <input
                                type="text"
                                value={formData.viaturas}
                                onChange={e => setFormData({ ...formData, viaturas: e.target.value })}
                                placeholder="Ex: 1 Vtr Leve, 1 Motocicleta"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                            <Coffee className="w-4 h-4 text-blue-600" /> Alimentação
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.alimentacao.cafe}
                                    onChange={e => setFormData({ ...formData, alimentacao: { ...formData.alimentacao, cafe: e.target.checked } })}
                                    className="w-4 h-4 rounded text-blue-600"
                                />
                                <span className="text-sm font-medium text-slate-700">Café</span>
                            </label>
                            <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.alimentacao.almoco}
                                    onChange={e => setFormData({ ...formData, alimentacao: { ...formData.alimentacao, almoco: e.target.checked } })}
                                    className="w-4 h-4 rounded text-blue-600"
                                />
                                <span className="text-sm font-medium text-slate-700">Almoço</span>
                            </label>
                            <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.alimentacao.janta}
                                    onChange={e => setFormData({ ...formData, alimentacao: { ...formData.alimentacao, janta: e.target.checked } })}
                                    className="w-4 h-4 rounded text-blue-600"
                                />
                                <span className="text-sm font-medium text-slate-700">Jantar</span>
                            </label>
                            <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.alimentacao.ceia}
                                    onChange={e => setFormData({ ...formData, alimentacao: { ...formData.alimentacao, ceia: e.target.checked } })}
                                    className="w-4 h-4 rounded text-blue-600"
                                />
                                <span className="text-sm font-medium text-slate-700">Ceia</span>
                            </label>
                            <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.alimentacao.lanche}
                                    onChange={e => setFormData({ ...formData, alimentacao: { ...formData.alimentacao, lanche: e.target.checked } })}
                                    className="w-4 h-4 rounded text-blue-600"
                                />
                                <span className="text-sm font-medium text-slate-700">Lanche de Voo</span>
                            </label>
                        </div>
                    </section>
                </div>
            </div>

            <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="bg-blue-600 px-8 py-3 rounded-xl font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95"
                >
                    <Save className="w-4 h-4" />
                    Enviar Solicitação
                </button>
            </div>
        </form>
    );
};

export default MissionRequestForm;
