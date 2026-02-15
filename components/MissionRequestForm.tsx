import { useState, type FC, type FormEvent } from 'react';
import { User } from '../types';
import { RANKS, SETORES, TIPOS_MISSAO } from '../constants';
import { Save, X, Calendar, Clock, MapPin, Users, Truck, Coffee, Search } from 'lucide-react';
import { supabase } from '../services/supabase';

import { Mission } from '../types';

interface MissionRequestFormProps {
    user: User;
    onSubmit: (data: any, isDraft?: boolean) => void;
    onCancel: () => void;
    initialData?: Mission;
}

const MissionRequestForm: FC<MissionRequestFormProps> = ({ user, onSubmit, onCancel, initialData }) => {
    const [requesterId, setRequesterId] = useState(initialData?.solicitante_id || user.id);

    const [formData, setFormData] = useState({
        saram: initialData ? '' : (user.saram || ''), // Don't overwrite if editing, but we might need to lookup user again if not provided
        posto: initialData?.dados_missao.posto || user.rank || '',
        nome_guerra: initialData?.dados_missao.nome_guerra || user.name.split(' ').pop() || '',
        setor: initialData?.dados_missao.setor || user.sector || '',
        tipo_missao: initialData?.dados_missao.tipo_missao || TIPOS_MISSAO[0],
        data: initialData?.dados_missao.data || new Date().toISOString().split('T')[0],
        inicio: initialData?.dados_missao.inicio || '08:00',
        termino: initialData?.dados_missao.termino || '17:00',
        local: initialData?.dados_missao.local || '',
        responsavel: initialData?.dados_missao.responsavel || {
            nome: '',
            om: '',
            telefone: ''
        },
        efetivo: initialData?.dados_missao.efetivo || '',
        viaturas: typeof initialData?.dados_missao.viaturas === 'object'
            ? initialData.dados_missao.viaturas
            : { operacional: 0, descaracterizada: 0, caminhao_tropa: 0 },
        alimentacao: initialData?.dados_missao.alimentacao || {
            cafe: false,
            almoco: false,
            janta: false,
            ceia: false,
            lanche: false
        }
    });

    // Populate SARAM if not present and we have requesterId (for edit mode context, though we primarily use ID)
    // Actually, saram is used to lookup. If editing, we assume data is there. 
    // Let's just keep saram field for lookup if user wants to change requester.

    // Convert string to Date for input if needed, but we store as string YYYY-MM-DD

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

    const [isExternalCmd, setIsExternalCmd] = useState(!!initialData?.dados_missao.responsavel?.nome);

    const handleSubmit = (e: FormEvent, isDraft: boolean = false) => {
        e.preventDefault();

        // Basic validation (Loose for Drafts?)
        // Let's keep validation for now to avoid saving empty junk, 
        // or maybe relax it for drafts if requested. User said "Salvar Solicitação", implies saving state.

        if (!isDraft) {
            if (!formData.nome_guerra || !formData.local || !formData.efetivo) {
                alert('Preencha os campos obrigatórios.');
                return;
            }

            if (!formData.data) {
                alert('Por favor, selecione uma data para a missão.');
                return;
            }
        } else {
            if (!formData.tipo_missao) {
                alert('Pelo menos o tipo de missão deve ser selecionado para rascunho.');
                return;
            }
        }

        // Prepare data package
        const submissionData = {
            solicitante_id: requesterId,
            dados_missao: {
                ...formData
            },
            status: isDraft ? 'RASCUNHO' : 'PENDENTE',
            data_criacao: initialData?.data_criacao || new Date().toISOString(),
            id: initialData?.id || crypto.randomUUID() // Ensure unique ID
        };

        onSubmit(submissionData, isDraft);
    };

    return (
        <form onSubmit={(e) => handleSubmit(e, false)} className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-xl border border-slate-200 overflow-hidden sm:max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 p-4 sm:p-6 text-white flex justify-between items-center shrink-0">
                <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold truncate">{initialData ? 'Editar Solicitação' : 'Solicitação de Missão'}</h2>
                    <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate">GSD-SP - Gestão de Operações</p>
                </div>
                <button type="button" onClick={onCancel} className="hover:bg-slate-800 p-2 rounded-full transition-colors shrink-0">
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
            </div>

            <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto flex-1 custom-scrollbar">
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
                        <div className="space-y-3">
                            {[
                                { id: 'operacional', label: 'VTR OPERACIONAL' },
                                { id: 'descaracterizada', label: 'VTR DESCARACTERIZADA' },
                                { id: 'caminhao_tropa', label: 'CAMINHÃO TROPA' }
                            ].map(vtr => (
                                <div key={vtr.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                    <label className="flex flex-1 items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={(formData.viaturas as any)[vtr.id] > 0}
                                            onChange={e => {
                                                const newVal = e.target.checked ? 1 : 0;
                                                setFormData({
                                                    ...formData,
                                                    viaturas: { ...formData.viaturas as any, [vtr.id]: newVal }
                                                });
                                            }}
                                            className="w-4 h-4 rounded text-blue-600"
                                        />
                                        <span className="text-sm font-medium text-slate-700">{vtr.label}</span>
                                    </label>
                                    {(formData.viaturas as any)[vtr.id] > 0 && (
                                        <div className="flex items-center gap-2 animate-fade-in">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Qtd</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={(formData.viaturas as any)[vtr.id]}
                                                onChange={e => {
                                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                                    setFormData({
                                                        ...formData,
                                                        viaturas: { ...formData.viaturas as any, [vtr.id]: val }
                                                    });
                                                }}
                                                className="w-16 px-2 py-1 border border-slate-300 rounded text-center text-sm font-bold text-slate-700"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
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

            <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 shrink-0">
                <button
                    type="submit"
                    className="w-full sm:w-auto bg-blue-600 px-8 py-3 rounded-xl font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 order-1 sm:order-3"
                >
                    <Save className="w-4 h-4" />
                    Enviar Solicitação
                </button>
                <button
                    type="button"
                    onClick={(e) => handleSubmit(e as any, true)}
                    className="w-full sm:w-auto bg-amber-100 px-6 py-3 rounded-xl font-bold text-amber-700 hover:bg-amber-200 transition-colors flex items-center justify-center gap-2 order-2 sm:order-2"
                >
                    <Save className="w-4 h-4" />
                    Salvar Rascunho
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors order-3 sm:order-1"
                >
                    Cancelar
                </button>
            </div>
        </form>
    );
};

export default MissionRequestForm;
