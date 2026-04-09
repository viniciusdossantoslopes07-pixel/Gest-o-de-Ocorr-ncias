import React, { useState, useEffect, FC } from 'react';
import { X, Calendar, User as UserIcon, Save, Info, Plus, ChevronRight, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { User, Vacation, VacationStatus, VacationPeriod, InstallmentModel } from '../../types';
import { calculateDays, validateVacationParcels, hasOverlap } from '../../utils/vacationValidation';
import { Combobox } from '../Combobox';

interface VacationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    users: User[];
    isDarkMode?: boolean;
    initialData?: Partial<Vacation> | null;
}

const MODELS: { id: InstallmentModel; label: string; description: string }[] = [
    { id: '30', label: '30 Dias Corrutos', description: 'Uma única parcela de 30 dias.' },
    { id: '15+15', label: '15 + 15 Dias', description: 'Duas parcelas de 15 dias cada.' },
    { id: '20+10', label: '20 + 10 Dias', description: 'Duas parcelas, sendo a primeira de 20 e a segunda de 10.' },
    { id: '10+20', label: '10 + 20 Dias', description: 'Duas parcelas, sendo a primeira de 10 e a segunda de 20.' },
    { id: '10+10+10', label: '10 + 10 + 10 Dias', description: 'Três parcelas de 10 dias cada.' }
];

const VacationModal: FC<VacationModalProps> = ({ isOpen, onClose, onSuccess, users, isDarkMode = false, initialData }) => {
    const [militarId, setMilitarId] = useState('');
    const [year, setYear] = useState(new Date().getFullYear());
    const [status, setStatus] = useState<VacationStatus>(VacationStatus.PLANEJADO);
    const [selectedModel, setSelectedModel] = useState<InstallmentModel>('30');
    const [periods, setPeriods] = useState<Partial<VacationPeriod>[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const dk = isDarkMode;

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setMilitarId(initialData.militar_id || '');
                setYear(initialData.year || new Date().getFullYear());
                setStatus(initialData.status || VacationStatus.PLANEJADO);
                setSelectedModel(initialData.installment_model || '30');
                setPeriods(initialData.periods || []);
            } else {
                setMilitarId('');
                setYear(new Date().getFullYear());
                setStatus(VacationStatus.PLANEJADO);
                handleSelectModel('30');
            }
            setError('');
        }
    }, [isOpen, initialData]);

    const handleSelectModel = (model: InstallmentModel) => {
        setSelectedModel(model);
        const parcelCount = model === '30' ? 1 : model === '10+10+10' ? 3 : 2;
        const newPeriods = Array.from({ length: parcelCount }, (_, i) => ({
            parcel_number: i + 1,
            start_date: '',
            end_date: '',
            days: 0
        }));
        setPeriods(newPeriods);
    };

    const handleDateChange = (index: number, field: 'start_date' | 'end_date', value: string) => {
        const newPeriods = [...periods];
        newPeriods[index] = { ...newPeriods[index], [field]: value };
        
        if (newPeriods[index].start_date && newPeriods[index].end_date) {
            newPeriods[index].days = calculateDays(newPeriods[index].start_date!, newPeriods[index].end_date!);
        }
        
        setPeriods(newPeriods);
        setError('');
    };

    const handleSave = async () => {
        if (!militarId) {
            setError('Selecione um militar.');
            return;
        }

        const validation = validateVacationParcels(selectedModel, periods as VacationPeriod[]);
        if (!validation.isValid) {
            setError(validation.message);
            return;
        }

        if (hasOverlap(periods as VacationPeriod[])) {
            setError('Há sobreposição entre os períodos selecionados.');
            return;
        }

        setIsSaving(true);
        try {
            // 1. Create/Update Vacation root record
            const vacationData = {
                militar_id: militarId,
                year,
                status,
                installment_model: selectedModel
            };

            let vacationId = initialData?.id;

            if (vacationId) {
                const { error: vError } = await supabase
                    .from('vacations')
                    .update(vacationData)
                    .eq('id', vacationId);
                if (vError) throw vError;
            } else {
                const { data, error: vError } = await supabase
                    .from('vacations')
                    .insert(vacationData)
                    .select()
                    .single();
                if (vError) throw vError;
                vacationId = data.id;
            }

            // 2. Clear old periods if editing
            if (initialData?.id) {
                const { error: dError } = await supabase
                    .from('vacation_periods')
                    .delete()
                    .eq('vacation_id', vacationId);
                if (dError) throw dError;
            }

            // 3. Insert Periods
            const periodsToInsert = periods.map(p => ({
                vacation_id: vacationId,
                start_date: p.start_date,
                end_date: p.end_date,
                days: p.days,
                parcel_number: p.parcel_number
            }));

            const { error: pError } = await supabase.from('vacation_periods').insert(periodsToInsert);
            if (pError) throw pError;

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(`Erro ao salvar: ${err.message || 'Erro interno'}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const modalClass = dk ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
    const inputClass = dk ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500';

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className={`relative w-full max-w-2xl rounded-[2.5rem] border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${modalClass} animate-in zoom-in duration-300`}>
                {/* Header */}
                <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Lançar Período de Férias</h2>
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Cadastro Administrativo</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                    {/* Militar & Ano Selection */}
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

                    {/* Model Selection */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2 italic block">Modelo de Parcelamento</label>
                        <div className="flex flex-wrap gap-2">
                            {MODELS.map(model => (
                                <button
                                    key={model.id}
                                    onClick={() => handleSelectModel(model.id)}
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

                    {/* Periods Grid */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Cronograma de Parcelas</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {periods.map((p, idx) => (
                                <div key={idx} className={`p-5 rounded-[2rem] border relative overflow-hidden group ${dk ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform duration-500">
                                        <Calendar className="w-12 h-12" />
                                    </div>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${dk ? 'text-blue-400' : 'text-blue-600'}`}>Parcela {idx + 1}</span>
                                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-full text-[9px] font-black">{p.days || 0} DIAS</span>
                                    </div>
                                    <div className="space-y-4 relative z-10">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-slate-500 uppercase ml-1">Início</p>
                                            <input 
                                                type="date" 
                                                value={p.start_date}
                                                onChange={e => handleDateChange(idx, 'start_date', e.target.value)}
                                                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-black outline-none ${inputClass}`}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-slate-500 uppercase ml-1">Término</p>
                                            <input 
                                                type="date" 
                                                value={p.end_date}
                                                onChange={e => handleDateChange(idx, 'end_date', e.target.value)}
                                                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-black outline-none ${inputClass}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Summary Info */}
                    <div className={`p-4 rounded-2xl flex items-center justify-between border ${dk ? 'bg-blue-900/10 border-blue-900/40' : 'bg-blue-50 border-blue-100'}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500 rounded-lg text-white">
                                <Info className="w-4 h-4" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Total Acumulado</p>
                        </div>
                        <span className={`text-lg font-black ${dk ? 'text-blue-400' : 'text-blue-600'}`}>
                            {periods.reduce((sum, p) => sum + (p.days || 0), 0)} / 30 DIAS
                        </span>
                    </div>

                    {error && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-xs font-bold animate-shake">
                            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-8 border-t border-slate-800 bg-slate-900 flex items-center justify-end gap-4">
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-10 py-3.5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Finalizar Lançamento</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VacationModal;
