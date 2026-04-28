import { useState, type FC, type FormEvent } from 'react';
import { User } from '../types';
import { RANKS, SETORES, TIPOS_MISSAO } from '../constants';
import { Save, X, Calendar, Clock, MapPin, Users, Truck, Coffee, Search, FileText } from 'lucide-react';
import { supabase } from '../services/supabase';

import { Mission } from '../types';

interface MissionRequestFormProps {
    user: User;
    users: User[];
    onSubmit: (data: any, isDraft?: boolean) => void;
    onCancel: () => void;
    initialData?: Mission;
    isDarkMode?: boolean;
}

const MissionRequestForm: FC<MissionRequestFormProps> = ({ user, users, onSubmit, onCancel, initialData, isDarkMode }) => {
    const [requesterId, setRequesterId] = useState(initialData?.solicitante_id || user.id);

    const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    };

    const [formData, setFormData] = useState({
        saram: initialData ? '' : (user.saram || ''), 
        posto: initialData?.dados_missao.posto || user.rank || '',
        nome_guerra: initialData?.dados_missao.nome_guerra || user.warName || user.name || '',
        setor: initialData?.dados_missao.setor || user.sector || '',
        tipo_missao: initialData?.dados_missao.tipo_missao || TIPOS_MISSAO[0],
        data: initialData?.dados_missao.data || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
        inicio: initialData?.dados_missao.inicio || '08:00',
        termino: initialData?.dados_missao.termino || '17:00',
        local: initialData?.dados_missao.local || '',
        responsavel: initialData?.dados_missao.responsavel || {
            nome: '',
            om: '',
            telefone: ''
        },
        efetivo: typeof initialData?.dados_missao.efetivo === 'object'
            ? initialData.dados_missao.efetivo
            : (initialData?.dados_missao.efetivo ? { oficial: 0, graduado: 0, praca: 0, _legacy: initialData.dados_missao.efetivo } : { oficial: 0, graduado: 0, praca: 0 }),
        viaturas: typeof initialData?.dados_missao.viaturas === 'object'
            ? initialData.dados_missao.viaturas
            : { operacional: 0, descaracterizada: 0, caminhao_tropa: 0 },
        alimentacao: initialData?.dados_missao.alimentacao || {
            cafe: false,
            almoco: false,
            janta: false,
            ceia: false,
            lanche: false
        },
        informacoes_complementares: initialData?.dados_missao.informacoes_complementares || ''
    });

    const [searchTerm, setSearchTerm] = useState(() => {
        if (initialData) {
            return `${initialData.dados_missao.posto} ${initialData.dados_missao.nome_guerra}`;
        }
        return `${user.rank || ''} ${user.warName || user.name || ''}`.trim();
    });

    const [suggestions, setSuggestions] = useState<User[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleSelectUser = (selectedUser: User) => {
        setRequesterId(selectedUser.id);
        setFormData(prev => ({
            ...prev,
            saram: selectedUser.saram || '',
            posto: selectedUser.rank || '',
            nome_guerra: selectedUser.warName || selectedUser.name || '',
            setor: selectedUser.sector || ''
        }));
        setSearchTerm(`${selectedUser.rank} ${selectedUser.warName || selectedUser.name}`);
        setShowSuggestions(false);
    };

    const [isExternalCmd, setIsExternalCmd] = useState(!!initialData?.dados_missao.responsavel?.nome);

    const handleSubmit = (e: FormEvent, isDraft: boolean = false) => {
        e.preventDefault();

        // Basic validation (Loose for Drafts?)
        // Let's keep validation for now to avoid saving empty junk, 
        // or maybe relax it for drafts if requested. User said "Salvar Solicitação", implies saving state.

        if (!isDraft) {
            if (!formData.nome_guerra || !formData.local) {
                alert('Preencha os campos obrigatórios (Nome de Guerra, Local, Efetivo).');
                return;
            }
            if (typeof formData.efetivo === 'object' && !('_legacy' in formData.efetivo)) {
                if (formData.efetivo.oficial === 0 && formData.efetivo.graduado === 0 && formData.efetivo.praca === 0) {
                    alert('Selecione a quantidade de efetivo desejado (Oficial, Graduado ou Praça).');
                    return;
                }
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
            id: initialData?.id || generateId() // Ensure unique ID
        };

        onSubmit(submissionData, isDraft);
    };

    return (
        <form onSubmit={(e) => handleSubmit(e, false)} className={`glass-panel w-full h-full sm:h-auto sm:rounded-2xl shadow-xl overflow-hidden sm:max-h-[90vh] flex flex-col`}>
            <div className={`bg-slate-900/60 border-b border-white/10 backdrop-blur-xl p-4 sm:p-6 text-white flex justify-between items-center shrink-0`}>
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
                    <h3 className={`text-sm font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-widest flex items-center gap-2`}>
                        <Users className="w-4 h-4 text-blue-600" /> Identificação do Solicitante
                    </h3>
                    <div className="relative">
                        <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2`}>Buscar Militar (Nome, Guerra, SARAM ou Posto)</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => {
                                    const term = e.target.value;
                                    setSearchTerm(term);
                                    if (term.length > 0) {
                                        const upperTerm = term.toUpperCase();
                                        const matches = users.filter(u =>
                                            u.saram.includes(term) ||
                                            (u.warName || '').toUpperCase().includes(upperTerm) ||
                                            (u.name || '').toUpperCase().includes(upperTerm) ||
                                            (`${u.rank || ''} ${u.warName || u.name || ''}`).toUpperCase().includes(upperTerm)
                                        ).slice(0, 5);
                                        setSuggestions(matches);
                                        setShowSuggestions(true);
                                    } else {
                                        setSuggestions([]);
                                        setShowSuggestions(false);
                                    }
                                }}
                                onFocus={() => searchTerm && suggestions.length > 0 && setShowSuggestions(true)}
                                className={`w-full pl-4 pr-10 py-3 glass-input rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold`}
                                placeholder="Digite para buscar..."
                            />
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>

                        {showSuggestions && suggestions.length > 0 && (
                            <ul className={`absolute z-50 w-full mt-1 border rounded-xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                {suggestions.map(s => (
                                    <li
                                        key={s.id}
                                        onClick={() => handleSelectUser(s)}
                                        className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-200 border-b border-slate-700' : 'hover:bg-blue-50 text-slate-700 border-b border-slate-100'} last:border-b-0`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black uppercase">{s.rank} {s.warName || s.name}</span>
                                            <span className="text-[10px] opacity-60">{s.name}</span>
                                        </div>
                                        <span className={`text-[10px] font-mono px-2 py-1 rounded-lg ${isDarkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{s.saram}</span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* Visual Feedback of Selection */}
                        {requesterId && !showSuggestions && (
                            <div className={`mt-3 p-4 rounded-xl border flex items-center gap-4 ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'} animate-in fade-in zoom-in-95 duration-200`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`}>
                                    {formData.posto}
                                </div>
                                <div className="flex-1">
                                    <h4 className={`text-xs font-black uppercase ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>{formData.nome_guerra}</h4>
                                    <div className="flex gap-4 mt-1">
                                        <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>SARAM: {formData.saram}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <hr className={isDarkMode ? 'border-slate-800' : 'border-slate-100'} />

                {/* 2. Logística */}
                <section className="space-y-4">
                    <h3 className={`text-sm font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-widest flex items-center gap-2`}>
                        <MapPin className="w-4 h-4 text-blue-600" /> Logística da Missão
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1 md:col-span-2">
                            <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2`}>Tipo de Missão</label>
                            <select
                                value={formData.tipo_missao}
                                onChange={e => setFormData({ ...formData, tipo_missao: e.target.value })}
                                className={`w-full px-3 py-2 glass-input rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                                required
                            >
                                {TIPOS_MISSAO.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2 flex items-center gap-1`}>
                                <Calendar className="w-3 h-3" /> Data
                            </label>
                            <input
                                type="date"
                                value={formData.data}
                                onChange={e => setFormData({ ...formData, data: e.target.value })}
                                className={`w-full px-3 py-2 glass-input rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                                required
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2 flex items-center gap-1`}>
                                    <Clock className="w-3 h-3" /> Início
                                </label>
                                <input
                                    type="time"
                                    value={formData.inicio}
                                    onChange={e => setFormData({ ...formData, inicio: e.target.value })}
                                    className={`w-full px-3 py-2 glass-input rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                                    required
                                />
                            </div>
                            <div className="flex-1">
                                <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2 flex items-center gap-1`}>
                                    <Clock className="w-3 h-3" /> Término
                                </label>
                                <input
                                    type="time"
                                    value={formData.termino}
                                    onChange={e => setFormData({ ...formData, termino: e.target.value })}
                                    className={`w-full px-3 py-2 glass-input rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                                    required
                                />
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2`}>Local</label>
                            <input
                                type="text"
                                value={formData.local}
                                onChange={e => setFormData({ ...formData, local: e.target.value })}
                                placeholder="Ex: Pátio de Aeronaves / Ala 13"
                                className={`w-full px-3 py-2 glass-input rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                                required
                            />
                        </div>
                    </div>
                </section>

                <hr className={isDarkMode ? 'border-slate-800' : 'border-slate-100'} />

                {/* 3. Responsável */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-widest flex items-center gap-2`}>
                            <Users className="w-4 h-4 text-blue-600" /> Responsável Pela Missão
                        </h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isExternalCmd}
                                onChange={e => setIsExternalCmd(e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600"
                            />
                            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Externo ao GSD-SP?</span>
                        </label>
                    </div>

                    {isExternalCmd && (
                        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-yellow-50 border-yellow-100'} p-4 rounded-xl border`}>
                            <div>
                                <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2`}>Nome Completo</label>
                                <input
                                    type="text"
                                    value={formData.responsavel.nome}
                                    onChange={e => setFormData({ ...formData, responsavel: { ...formData.responsavel, nome: e.target.value } })}
                                    className={`w-full px-3 py-2 glass-input rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                                />
                            </div>
                            <div>
                                <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2`}>OM</label>
                                <input
                                    type="text"
                                    value={formData.responsavel.om}
                                    onChange={e => setFormData({ ...formData, responsavel: { ...formData.responsavel, om: e.target.value } })}
                                    className={`w-full px-3 py-2 glass-input rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                                />
                            </div>
                            <div>
                                <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2`}>Telefone/Ramal</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={formData.responsavel.telefone}
                                    onChange={e => setFormData({ ...formData, responsavel: { ...formData.responsavel, telefone: e.target.value.replace(/\D/g, '') } })}
                                    className={`w-full px-3 py-2 glass-input rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                                />
                            </div>
                        </div>
                    )}
                    {!isExternalCmd && (
                        <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} italic`}>O responsável será o próprio solicitante ({formData.posto} {formData.nome_guerra}).</p>
                    )}
                </section>

                <hr className={isDarkMode ? 'border-slate-800' : 'border-slate-100'} />

                {/* 4. Recursos e Alimentação */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section className="space-y-4">
                        <h3 className={`text-sm font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-widest flex items-center gap-2`}>
                            <Truck className="w-4 h-4 text-blue-600" /> Recursos Necessários
                        </h3>
                        <div>
                            <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2`}>Efetivo Solicitado</label>
                            <div className="space-y-2">
                                {[
                                    { id: 'oficial', label: 'OFICIAL' },
                                    { id: 'graduado', label: 'GRADUADO' },
                                    { id: 'praca', label: 'PRAÇA' }
                                ].map(cat => (
                                    <div key={cat.id} className={`flex items-center gap-2 p-3 border ${isDarkMode ? 'border-slate-800 bg-slate-800/40' : 'border-slate-100 bg-slate-100/50'} rounded-xl transition-colors hover:border-blue-500/20`}>
                                        <label className="flex flex-1 items-center gap-3 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={typeof formData.efetivo === 'object' && (formData.efetivo as any)[cat.id] > 0}
                                                    onChange={e => {
                                                        const newVal = e.target.checked ? 1 : 0;
                                                        let newEfetivo: any = typeof formData.efetivo === 'object' ? { ...formData.efetivo } : { oficial: 0, graduado: 0, praca: 0 };
                                                        newEfetivo[cat.id] = newVal;
                                                        if ('_legacy' in newEfetivo) delete newEfetivo._legacy;
                                                        setFormData({ ...formData, efetivo: newEfetivo });
                                                    }}
                                                    className="w-5 h-5 rounded-lg border-2 border-slate-700 text-blue-600 focus:ring-offset-0 focus:ring-blue-500/50"
                                                />
                                            </div>
                                            <span className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-600 group-hover:text-slate-900'}`}>{cat.label}</span>
                                        </label>
                                        {(typeof formData.efetivo === 'object' && (formData.efetivo as any)[cat.id] > 0) && (
                                            <div className="flex items-center gap-2 animate-fade-in">
                                                <span className="text-[10px] font-bold text-slate-500">QTD:</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={(formData.efetivo as any)[cat.id]}
                                                    onChange={e => {
                                                        const val = Math.max(1, parseInt(e.target.value) || 1);
                                                        setFormData({
                                                            ...formData,
                                                            efetivo: { ...(formData.efetivo as any), [cat.id]: val }
                                                        });
                                                    }}
                                                    className={`w-14 px-2 py-1.5 border ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-slate-300 bg-white text-slate-700'} rounded-lg text-center text-xs font-black focus:ring-2 focus:ring-blue-500 outline-none`}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {(typeof formData.efetivo === 'string' || (typeof formData.efetivo === 'object' && '_legacy' in formData.efetivo)) && (
                                    <div className={`p-3 text-xs italic rounded-lg ${isDarkMode ? 'bg-amber-900/20 text-amber-500' : 'bg-amber-50 text-amber-700'}`}>
                                        Aviso: Efetivo legado detectado ("{typeof formData.efetivo === 'string' ? formData.efetivo : (formData.efetivo as any)._legacy}"). Por favor, atualize as categorias numéricas acima.
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3">
                            {[
                                { id: 'operacional', label: 'VTR OPERACIONAL' },
                                { id: 'descaracterizada', label: 'VTR DESCARACTERIZADA' },
                                { id: 'caminhao_tropa', label: 'CAMINHÃO TROPA' }
                            ].map(vtr => (
                                <div key={vtr.id} className={`flex items-center gap-3 p-3 border ${isDarkMode ? 'border-slate-700 hover:bg-slate-800/50' : 'border-slate-200 hover:bg-blue-50'} rounded-xl transition-colors`}>
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
                                        <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{vtr.label}</span>
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
                                                className={`w-16 px-2 py-1 border ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-slate-300 bg-white text-slate-900'} rounded text-center text-sm font-bold`}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className={`text-sm font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-widest flex items-center gap-2`}>
                            <Coffee className="w-4 h-4 text-blue-600" /> Alimentação
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'cafe', label: 'Café' },
                                { id: 'almoco', label: 'Almoço' },
                                { id: 'janta', label: 'Jantar' },
                                { id: 'ceia', label: 'Ceia' },
                                { id: 'lanche', label: 'Lanche de Voo' }
                            ].map(item => (
                                <label key={item.id} className={`flex items-center gap-2 p-3 border ${isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'} rounded-xl cursor-pointer transition-colors col-span-1 ${item.id === 'lanche' ? 'col-span-2' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={(formData.alimentacao as any)[item.id]}
                                        onChange={e => setFormData({ ...formData, alimentacao: { ...formData.alimentacao, [item.id]: e.target.checked } })}
                                        className="w-4 h-4 rounded text-blue-600"
                                    />
                                    <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Informações Complementares */}
                <section className="space-y-3">
                    <h3 className={`text-sm font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-widest flex items-center gap-2`}>
                        <FileText className="w-4 h-4 text-blue-600" /> Informações Complementares
                    </h3>
                    <textarea
                        value={formData.informacoes_complementares}
                        onChange={e => setFormData({ ...formData, informacoes_complementares: e.target.value })}
                        rows={4}
                        placeholder="Descreva aqui quaisquer informações adicionais relevantes para esta missão: contexto, restrições, observações especiais, contatos, etc."
                        className={`w-full px-4 py-3 border ${isDarkMode ? 'border-slate-700 bg-slate-800/50 text-white placeholder-slate-600' : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400'} rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all resize-none`}
                    />
                    <p className={`text-[10px] ${isDarkMode ? 'text-slate-600' : 'text-slate-400'} leading-relaxed`}>
                        Campo opcional. Use para detalhar informações que não se encaixam nos campos anteriores.
                    </p>
                </section>
            </div>

            <div className={`p-4 sm:p-6 border-t glass-panel flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 shrink-0`}>
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
                    className={`w-full sm:w-auto ${isDarkMode ? 'bg-amber-900/30 text-amber-500 hover:bg-amber-900/50' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'} px-6 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 order-2 sm:order-2`}
                >
                    <Save className="w-4 h-4" />
                    Salvar Rascunho
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-200'} transition-colors order-3 sm:order-1`}
                >
                    Cancelar
                </button>
            </div>
        </form>
    );
};

export default MissionRequestForm;
