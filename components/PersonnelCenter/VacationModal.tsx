import React, { useState, useEffect, FC, useCallback } from 'react';
import { X, Calendar, Save, Info, Plus, AlertCircle, Loader2, CheckCircle, ArrowRight, Wand2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { User, Vacation, VacationStatus, VacationPeriod, InstallmentModel } from '../../types';
import { hasOverlap } from '../../utils/vacationValidation';
import { Combobox } from '../Combobox';

interface VacationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    users: User[];
    isDarkMode?: boolean;
    initialData?: Partial<Vacation> | null;
}

// Mapeamento de modelo para dias por parcela
const MODEL_DAYS: Record<InstallmentModel, number[]> = {
    '30':       [30],
    '15+15':    [15, 15],
    '20+10':    [20, 10],
    '10+20':    [10, 20],
    '10+10+10': [10, 10, 10],
};

const MODELS: { id: InstallmentModel; label: string; description: string }[] = [
    { id: '30',       label: '30 Dias Corridos', description: 'Uma única parcela de 30 dias.' },
    { id: '15+15',    label: '15 + 15 Dias',     description: 'Duas parcelas de 15 dias cada.' },
    { id: '20+10',    label: '20 + 10 Dias',     description: 'Parcela 1: 20 dias  •  Parcela 2: 10 dias.' },
    { id: '10+20',    label: '10 + 20 Dias',     description: 'Parcela 1: 10 dias  •  Parcela 2: 20 dias.' },
    { id: '10+10+10', label: '10 + 10 + 10 Dias',description: 'Três parcelas de 10 dias cada.' },
];

/**
 * Soma N dias a uma data ISO (YYYY-MM-DD) retornando outra data ISO.
 * addDays('2026-03-09', 19) → '2026-03-28'  (20 dias inclusive = 19 acréscimos)
 */
const addDays = (isoDate: string, n: number): string => {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + n);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/** Converte ISO (YYYY-MM-DD) para exibição (DD/MM/AAAA) */
const isoToDisplay = (iso: string): string => {
    if (!iso || !iso.match(/^\d{4}-\d{2}-\d{2}$/)) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
};

/** Converte texto digitado (DD/MM/AAAA) para ISO (YYYY-MM-DD) ou retorna string parcial */
const displayToIso = (display: string): string | null => {
    const digits = display.replace(/\D/g, '');
    if (digits.length === 8) {
        return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
    }
    return null;
};

/** Aplica máscara DD/MM/AAAA ao texto bruto digitado */
const applyMask = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let masked = digits;
    if (digits.length > 2) masked = digits.slice(0, 2) + '/' + digits.slice(2);
    if (digits.length > 4) masked = masked.slice(0, 5) + '/' + masked.slice(5);
    return masked;
};

const VacationModal: FC<VacationModalProps> = ({ isOpen, onClose, onSuccess, users, isDarkMode = false, initialData }) => {
    const [militarId, setMilitarId] = useState('');
    const [year, setYear] = useState(new Date().getFullYear());
    const [status, setStatus] = useState<VacationStatus>(VacationStatus.PLANEJADO);
    const [selectedModel, setSelectedModel] = useState<InstallmentModel>('30');
    // Armazena apenas as DATAS DE INÍCIO (uma por parcela, ISO)
    const [startDates, setStartDates] = useState<string[]>(['']);
    // Valor exibido no input (texto com máscara DD/MM/AAAA)
    const [startInputs, setStartInputs] = useState<string[]>(['']);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const dk = isDarkMode;
    const modelDays = MODEL_DAYS[selectedModel];

    // Derivado: periods completos com end_date calculado
    const computedPeriods: Partial<VacationPeriod>[] = modelDays.map((days, idx) => {
        const start = startDates[idx] || '';
        const end = start ? addDays(start, days - 1) : '';
        return {
            parcel_number: idx + 1,
            start_date: start,
            end_date: end,
            days,
        };
    });

    const resetForm = useCallback((model: InstallmentModel = '30') => {
        const count = MODEL_DAYS[model].length;
        setStartDates(Array(count).fill(''));
        setStartInputs(Array(count).fill(''));
        setSelectedModel(model);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        if (initialData) {
            setMilitarId(initialData.militar_id || '');
            setYear(initialData.year || new Date().getFullYear());
            setStatus(initialData.status || VacationStatus.PLANEJADO);
            const model = initialData.installment_model || '30';
            setSelectedModel(model);
            // Pré-preencher a partir dos períodos existentes
            const starts = (initialData.periods || []).map(p => p.start_date || '');
            const count = MODEL_DAYS[model].length;
            setStartDates(starts.concat(Array(count).fill('')).slice(0, count));
            setStartInputs(starts.map(isoToDisplay).concat(Array(count).fill('')).slice(0, count));
        } else {
            setMilitarId('');
            setYear(new Date().getFullYear());
            setStatus(VacationStatus.PLANEJADO);
            resetForm('30');
        }
        setError('');
    }, [isOpen, initialData]);

    const handleSelectModel = (model: InstallmentModel) => {
        resetForm(model);
    };

    const handleStartInput = (idx: number, raw: string) => {
        const masked = applyMask(raw);
        const newInputs = [...startInputs];
        newInputs[idx] = masked;
        setStartInputs(newInputs);

        const iso = displayToIso(masked);
        const newStarts = [...startDates];
        newStarts[idx] = iso || '';
        setStartDates(newStarts);
        setError('');
    };

    const handleCalendarPick = (idx: number, isoValue: string) => {
        const newStarts = [...startDates];
        newStarts[idx] = isoValue;
        setStartDates(newStarts);
        const newInputs = [...startInputs];
        newInputs[idx] = isoToDisplay(isoValue);
        setStartInputs(newInputs);
        setError('');
    };

    const handleSave = async () => {
        if (!militarId) { setError('Selecione um militar.'); return; }

        const incomplete = computedPeriods.some(p => !p.start_date || !p.end_date);
        if (incomplete) {
            setError('Preencha a data de início de todas as parcelas.');
            return;
        }

        if (hasOverlap(computedPeriods as VacationPeriod[])) {
            setError('Há sobreposição entre os períodos selecionados. Verifique as datas.');
            return;
        }

        setIsSaving(true);
        try {
            const vacationData = { militar_id: militarId, year, status, installment_model: selectedModel };
            let vId = initialData?.id;

            if (vId) {
                const { error: vError } = await supabase.from('vacations').update(vacationData).eq('id', vId);
                if (vError) throw vError;
            } else {
                const { data: inserted, error: vError } = await supabase
                    .from('vacations').insert(vacationData).select('id').single();
                if (vError) throw vError;
                if (!inserted) throw new Error('Não foi possível recuperar o ID das férias.');
                vId = inserted.id;
            }

            if (initialData?.id) {
                const { error: dError } = await supabase.from('vacation_periods').delete().eq('vacation_id', vId);
                if (dError) throw dError;
            }

            const periodsToInsert = computedPeriods.map(p => ({
                vacation_id: vId as string,
                start_date: p.start_date!,
                end_date: p.end_date!,
                days: p.days!,
                parcel_number: p.parcel_number!,
            }));

            const { error: pError } = await supabase.from('vacation_periods').insert(periodsToInsert);
            if (pError) throw pError;

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Erro ao salvar férias:', err);
            setError(`Falha ao salvar: ${err.message || 'Verifique sua conexão ou permissões.'}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const totalDays = modelDays.reduce((s, d) => s + d, 0);
    const allFilled = computedPeriods.every(p => p.start_date && p.end_date);
    const modalClass = dk ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
    const inputClass = dk
        ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500';

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className={`relative w-full max-w-2xl rounded-[2.5rem] border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${modalClass} animate-in zoom-in duration-300`}>
                {/* Header */}
                <div className="p-6 lg:p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20 shrink-0">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg lg:text-xl font-black text-white uppercase tracking-tight truncate">Lançar Período de Férias</h2>
                            <p className="text-[9px] lg:text-[10px] font-black text-blue-400 uppercase tracking-widest truncate flex items-center gap-1.5">
                                <Wand2 className="w-3 h-3" /> Término calculado automaticamente · {year}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-500 hover:text-white shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                    {/* Militar & Ano & Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2 italic">Militar</label>
                            <Combobox
                                options={users.map(u => `${u.saram} | ${u.rank} ${u.warName || u.name}`)}
                                value={users.find(u => u.id === militarId) ? (() => {
                                    const u = users.find(u => u.id === militarId)!;
                                    return `${u.saram} | ${u.rank} ${u.warName || u.name}`;
                                })() : ''}
                                onChange={(val) => {
                                    const saram = val.split(' | ')[0];
                                    const user = users.find(u => u.saram === saram);
                                    if (user) setMilitarId(user.id);
                                }}
                                placeholder="Selecione o militar..."
                                isDarkMode={dk}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2 italic">Ano</label>
                                <input
                                    type="number"
                                    value={year}
                                    onChange={e => setYear(parseInt(e.target.value))}
                                    className={`w-full px-4 py-3 rounded-2xl border text-sm font-bold outline-none transition-all ${inputClass}`}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2 italic">Status</label>
                                <select
                                    value={status}
                                    onChange={e => setStatus(e.target.value as VacationStatus)}
                                    className={`w-full px-4 py-3 rounded-2xl border text-sm font-bold outline-none transition-all cursor-pointer ${inputClass}`}
                                >
                                    <option value="PLANEJADO">🔵 PLANEJADO</option>
                                    <option value="HOMOLOGADO">🟢 HOMOLOGADO</option>
                                    <option value="EM_FRUIÇÃO">🟠 EM FRUIÇÃO</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Modelo de Parcelamento */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2 italic block">Modelo de Parcelamento</label>
                        <div className="flex flex-wrap gap-2">
                            {MODELS.map(model => (
                                <button
                                    key={model.id}
                                    onClick={() => handleSelectModel(model.id)}
                                    title={model.description}
                                    className={`px-4 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${selectedModel === model.id
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                                        : `${dk ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`
                                    }`}
                                >
                                    {model.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Parcelas — apenas data de início precisam ser preenchidas */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Wand2 className="w-4 h-4 text-blue-500" />
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Cronograma de Parcelas</h3>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${dk ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                Término calculado automaticamente
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {computedPeriods.map((period, idx) => {
                                const days = modelDays[idx];
                                const hasStart = !!period.start_date;
                                const endDisplay = period.end_date ? isoToDisplay(period.end_date) : '';

                                return (
                                    <div
                                        key={idx}
                                        className={`p-5 rounded-[2.2rem] border relative overflow-hidden group transition-all ${
                                            hasStart
                                                ? (dk ? 'bg-blue-900/10 border-blue-700/50' : 'bg-blue-50/50 border-blue-200')
                                                : (dk ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200')
                                        }`}
                                    >
                                        {/* Header da parcela */}
                                        <div className="flex items-center justify-between mb-4">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${dk ? 'text-blue-400' : 'text-blue-600'}`}>
                                                Parcela {idx + 1}
                                            </span>
                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black ${
                                                hasStart
                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                    : (dk ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500')
                                            }`}>
                                                {days} DIAS
                                            </span>
                                        </div>

                                        {/* Data de Início — único campo editável */}
                                        <div className="space-y-1.5">
                                            <p className={`text-[9px] font-black uppercase tracking-widest ml-1 ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Data de Início
                                            </p>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="DD/MM/AAAA"
                                                    value={startInputs[idx] || ''}
                                                    onChange={e => handleStartInput(idx, e.target.value)}
                                                    className={`w-full px-3 py-2.5 pr-10 rounded-xl border text-xs font-black outline-none transition-all ${inputClass} ${
                                                        hasStart ? (dk ? 'border-blue-500/50' : 'border-blue-400') : ''
                                                    }`}
                                                />
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                    <input
                                                        type="date"
                                                        value={startDates[idx] || ''}
                                                        onChange={e => handleCalendarPick(idx, e.target.value)}
                                                        className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8 z-10"
                                                    />
                                                    <Calendar className={`w-4 h-4 transition-colors ${hasStart ? 'text-blue-500' : 'text-slate-400'}`} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Seta + Término (calculado automaticamente) */}
                                        <div className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all ${
                                            hasStart
                                                ? (dk ? 'bg-emerald-900/20 border border-emerald-700/40' : 'bg-emerald-50 border border-emerald-200')
                                                : (dk ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-slate-100/70 border border-slate-200')
                                        }`}>
                                            <ArrowRight className={`w-3 h-3 shrink-0 ${hasStart ? 'text-emerald-500' : 'text-slate-400'}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-[8px] font-black uppercase tracking-widest ${hasStart ? (dk ? 'text-emerald-400' : 'text-emerald-600') : 'text-slate-400'}`}>
                                                    Término (automático)
                                                </p>
                                                <p className={`text-xs font-black mt-0.5 ${hasStart ? (dk ? 'text-white' : 'text-slate-900') : 'text-slate-400'}`}>
                                                    {hasStart ? endDisplay : '— / — / ——'}
                                                </p>
                                            </div>
                                            {hasStart && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 lg:p-8 border-t border-slate-800 bg-slate-900 space-y-4">
                    {/* Resumo total */}
                    <div className={`p-4 rounded-2xl flex items-center justify-between border ${allFilled ? 'bg-emerald-900/10 border-emerald-700/40' : (dk ? 'bg-blue-900/10 border-blue-900/40' : 'bg-blue-50 border-blue-100')}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg text-white ${allFilled ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                                {allFilled ? <CheckCircle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                            </div>
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${allFilled ? (dk ? 'text-emerald-400' : 'text-emerald-600') : 'text-blue-500'}`}>
                                    {allFilled ? 'Cronograma Completo' : 'Total Acumulado'}
                                </p>
                                {allFilled && (
                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                                        {computedPeriods.map(p => `${isoToDisplay(p.start_date!)} → ${isoToDisplay(p.end_date!)}`).join('  •  ')}
                                    </p>
                                )}
                            </div>
                        </div>
                        <span className={`text-lg font-black ${allFilled ? (dk ? 'text-emerald-400' : 'text-emerald-600') : (dk ? 'text-blue-400' : 'text-blue-600')}`}>
                            {totalDays} / 30 DIAS
                        </span>
                    </div>

                    {error && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-[11px] font-black uppercase tracking-widest">
                            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4">
                        <button
                            onClick={onClose}
                            className="w-full sm:w-auto px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all order-2 sm:order-1"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !allFilled}
                            className="w-full sm:w-auto px-10 py-3.5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-1 sm:order-2"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Finalizar Lançamento</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VacationModal;
