import { useState } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';
import { GRADUACOES, SETORES, TIPOS_MISSAO } from '../constants';

interface MissionRequestFormProps {
    user: User;
    onCancel: () => void;
    onSubmit: () => void;
}

export default function MissionRequestForm({ user, onCancel, onSubmit }: MissionRequestFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        posto: user.rank || '',
        nome_guerra: user.name.split(' ').pop() || '',
        setor: user.sector || '',
        tipo_missao: '',
        data: '',
        inicio: '',
        termino: '',
        local: '',
        responsavel: {
            nome: '',
            om: '',
            telefone: ''
        },
        efetivo: '',
        viaturas: '',
        alimentacao: {
            nenhum: false,
            cafe: false,
            almoco: false,
            janta: false,
            ceia: false,
            lanche: false
        }
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleResponsavelChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            responsavel: { ...prev.responsavel, [field]: value }
        }));
    };

    const handleAlimentacaoChange = (field: string, checked: boolean) => {
        if (field === 'nenhum') {
            setFormData(prev => ({
                ...prev,
                alimentacao: {
                    nenhum: checked,
                    cafe: false,
                    almoco: false,
                    janta: false,
                    ceia: false,
                    lanche: false
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                alimentacao: {
                    ...prev.alimentacao,
                    nenhum: false, // Uncheck "Nenhum" if any other is checked
                    [field]: checked
                }
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validation logic for external requester could go here
            // For now relying on inputs being filled if user thinks they need to.

            const { error } = await supabase.from('missoes_gsd').insert([
                {
                    solicitante_id: user.id,
                    dados_missao: formData,
                    status: 'PENDENTE'
                }
            ]);

            if (error) throw error;

            alert('Missão solicitada com sucesso!');
            onSubmit();
        } catch (error: any) {
            console.error('Erro ao solicitar missão:', error);
            alert('Erro ao solicitar missão: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 border-b pb-4">Solicitação de Missão</h2>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Identificação */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">1. Identificação</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-1 uppercase text-xs tracking-wider">Posto/Graduação <span className="text-red-500">*</span></label>
                            <select
                                required
                                className="w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                                value={formData.posto}
                                onChange={e => handleChange('posto', e.target.value)}
                            >
                                <option value="">Selecione...</option>
                                {GRADUACOES.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-1 uppercase text-xs tracking-wider">Nome de Guerra <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500 uppercase"
                                value={formData.nome_guerra}
                                onChange={e => handleChange('nome_guerra', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-1 uppercase text-xs tracking-wider">Setor <span className="text-red-500">*</span></label>
                            <select
                                required
                                className="w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                                value={formData.setor}
                                onChange={e => handleChange('setor', e.target.value)}
                            >
                                <option value="">Selecione...</option>
                                {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Logística */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">2. Detalhes da Missão</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-black text-slate-700 mb-1 uppercase text-xs tracking-wider">Tipo de Missão <span className="text-red-500">*</span></label>
                            <select
                                required
                                className="w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                                value={formData.tipo_missao}
                                onChange={e => handleChange('tipo_missao', e.target.value)}
                            >
                                <option value="">Selecione...</option>
                                {TIPOS_MISSAO.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-1 uppercase text-xs tracking-wider">Data da Missão <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                required
                                className="w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                                value={formData.data}
                                onChange={e => handleChange('data', e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-black text-slate-700 mb-1 uppercase text-xs tracking-wider">Horário Previsto de Início <span className="text-red-500">*</span></label>
                                <input
                                    type="time"
                                    required
                                    className="w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                                    value={formData.inicio}
                                    onChange={e => handleChange('inicio', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-slate-700 mb-1 uppercase text-xs tracking-wider">Horário Previsto Término <span className="text-red-500">*</span></label>
                                <input
                                    type="time"
                                    required
                                    className="w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                                    value={formData.termino}
                                    onChange={e => handleChange('termino', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-black text-slate-700 mb-1 uppercase text-xs tracking-wider">Local da Missão <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                placeholder="Especifique o local exato da missão"
                                className="w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                                value={formData.local}
                                onChange={e => handleChange('local', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Responsável Externo */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">3. Responsável por Acompanhar a Missão <span className="text-red-500">*</span></h3>
                    <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg border border-yellow-200">
                        <strong>Atenção:</strong> Caso o solicitante não pertença ao GSD-SP, deverá obrigatoriamente informar: nome completo, OM de origem e telefone de contato.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="text"
                            placeholder="Nome Completo"
                            className="w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                            value={formData.responsavel.nome}
                            onChange={e => handleResponsavelChange('nome', e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="OM de Origem/Entidade"
                            className="w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                            value={formData.responsavel.om}
                            onChange={e => handleResponsavelChange('om', e.target.value)}
                        />
                        <input
                            type="tel"
                            placeholder="Telefone de Contato"
                            className="w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                            value={formData.responsavel.telefone}
                            onChange={e => handleResponsavelChange('telefone', e.target.value)}
                        />
                    </div>
                </div>

                {/* Recursos e Alimentação */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">4. Recursos Necessários</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-black text-slate-700 mb-1 uppercase text-xs tracking-wider">Efetivo <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Especificar efetivo necessário para a missão. Ex: 1 motorista B, 4 SD/REC"
                                    className="w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                                    value={formData.efetivo}
                                    onChange={e => handleChange('efetivo', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-slate-700 mb-1 uppercase text-xs tracking-wider">Viaturas Necessárias (Quantidade e Tipo) <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                                    value={formData.viaturas}
                                    onChange={e => handleChange('viaturas', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">5. Pedido de Alimentação <span className="text-red-500">*</span></h3>
                        <div className="space-y-3">
                            <label className="flex items-center space-x-3">
                                <input type="checkbox" className="rounded text-slate-400 focus:ring-slate-500" checked={formData.alimentacao.nenhum} onChange={e => handleAlimentacaoChange('nenhum', e.target.checked)} />
                                <span className="text-slate-700 font-bold">Nenhum</span>
                            </label>
                            <div className={`space-y-3 pl-2 border-l-2 border-slate-200 ${formData.alimentacao.nenhum ? 'opacity-50 pointer-events-none' : ''}`}>
                                <label className="flex items-center space-x-3">
                                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" checked={formData.alimentacao.cafe} onChange={e => handleAlimentacaoChange('cafe', e.target.checked)} />
                                    <span className="text-slate-700">Café</span>
                                </label>
                                <label className="flex items-center space-x-3">
                                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" checked={formData.alimentacao.almoco} onChange={e => handleAlimentacaoChange('almoco', e.target.checked)} />
                                    <span className="text-slate-700">Almoço</span>
                                </label>
                                <label className="flex items-center space-x-3">
                                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" checked={formData.alimentacao.janta} onChange={e => handleAlimentacaoChange('janta', e.target.checked)} />
                                    <span className="text-slate-700">Janta</span>
                                </label>
                                <label className="flex items-center space-x-3">
                                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" checked={formData.alimentacao.ceia} onChange={e => handleAlimentacaoChange('ceia', e.target.checked)} />
                                    <span className="text-slate-700">Ceia</span>
                                </label>
                                <label className="flex items-center space-x-3">
                                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" checked={formData.alimentacao.lanche} onChange={e => handleAlimentacaoChange('lanche', e.target.checked)} />
                                    <span className="text-slate-700">Lanche para retirar</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-2.5 text-slate-700 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors shadow-lg disabled:opacity-50"
                    >
                        {loading ? 'Enviando...' : 'Solicitar Missão'}
                    </button>
                </div>
            </form>
        </div>
    );
}
