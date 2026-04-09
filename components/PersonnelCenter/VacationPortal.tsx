import React, { useState, FC } from 'react';
import { supabase } from '../../services/supabase';
import { User, Vacation, VacationStatus, VacationPeriod, InstallmentModel } from '../../types';
import { ShieldCheck, Calendar, Lock, ArrowRight, CircleCheck, CircleAlert, Loader2 } from 'lucide-react';
import { calculateDays, validateVacationParcels, hasOverlap } from '../../utils/vacationValidation';

interface VacationPortalProps {
    isDarkMode?: boolean;
    onBack: () => void;
}

const MODELS: { id: InstallmentModel; label: string; description: string }[] = [
    { id: '30', label: '30 Dias Corrutos', description: 'Uma única parcela de 30 dias.' },
    { id: '15+15', label: '15 + 15 Dias', description: 'Duas parcelas de 15 dias cada.' },
    { id: '20+10', label: '20 + 10 Dias', description: 'Duas parcelas, sendo a primeira de 20 e a segunda de 10.' },
    { id: '10+20', label: '10 + 20 Dias', description: 'Duas parcelas, sendo a primeira de 10 e a segunda de 20.' },
    { id: '10+10+10', label: '10 + 10 + 10 Dias', description: 'Três parcelas de 10 dias cada.' }
];

const VacationPortal: FC<VacationPortalProps> = ({ isDarkMode = false, onBack }) => {
    const [step, setStep] = useState<'login' | 'model' | 'dates' | 'success'>('login');
    const [credential, setCredential] = useState({ saram: '', cpf: '' });
    const [user, setUser] = useState<User | null>(null);
    const [selectedModel, setSelectedModel] = useState<InstallmentModel | null>(null);
    const [periods, setPeriods] = useState<Partial<VacationPeriod>[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const dk = isDarkMode;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('saram', credential.saram)
                .single();

            if (fetchError || !data) {
                setError('Militar não encontrado. Verifique seu SARAM.');
            } else if (data.cpf && data.cpf.replace(/\D/g, '') !== credential.cpf.replace(/\D/g, '')) {
                setError('CPF não confere com o SARAM informado.');
            } else {
                setUser(data as User);
                setStep('model');
            }
        } catch (err) {
            setError('Erro ao validar acesso. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

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
        setStep('dates');
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

    const handleSubmit = async () => {
        setError('');
        
        // Final validation
        const validation = validateVacationParcels(selectedModel!, periods as VacationPeriod[]);
        if (!validation.isValid) {
            setError(validation.message);
            return;
        }

        if (hasOverlap(periods as VacationPeriod[])) {
            setError('Há sobreposição entre os períodos selecionados.');
            return;
        }

        setLoading(true);
        try {
            // 1. Create Vacation root record
            const { data: vacation, error: vError } = await supabase
                .from('vacations')
                .insert({
                    militar_id: user?.id,
                    year: new Date().getFullYear() + 1, // Planning for next year
                    status: 'PLANEJADO',
                    installment_model: selectedModel
                })
                .select()
                .single();

            if (vError) throw vError;

            // 2. Insert Periods
            const periodsToInsert = periods.map(p => ({
                ...p,
                vacation_id: vacation.id
            }));

            const { error: pError } = await supabase.from('vacation_periods').insert(periodsToInsert);
            if (pError) throw pError;

            setStep('success');
        } catch (err) {
            console.error(err);
            setError('Erro ao salvar planejamento. Procure a Seção de Pessoal.');
        } finally {
            setLoading(false);
        }
    };

    const cardClass = dk ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${dk ? 'bg-slate-950' : 'bg-slate-50'}`}>
            <div className={`w-full max-w-xl p-8 lg:p-12 rounded-[3rem] border shadow-2xl ${cardClass} relative overflow-hidden`}>
                {/* Background Accent */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                
                {step === 'login' && (
                    <div className="space-y-8 relative z-10">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20">
                                <ShieldCheck className="w-8 h-8 text-white" />
                            </div>
                            <h2 className={`text-2xl font-black tracking-tight ${dk ? 'text-white' : 'text-slate-900'}`}>Portal de Férias</h2>
                            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">Acesso do Militar</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-1">
                                <label className={`text-[10px] font-black uppercase tracking-widest ml-2 ${dk ? 'text-slate-500' : 'text-slate-400'}`}>SARAM</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="0000000"
                                        value={credential.saram}
                                        onChange={e => setCredential({...credential, saram: e.target.value})}
                                        className={`w-full pl-12 pr-4 py-4 rounded-2xl border text-sm font-bold outline-none transition-all ${dk ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}`}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className={`text-[10px] font-black uppercase tracking-widest ml-2 ${dk ? 'text-slate-500' : 'text-slate-400'}`}>CPF</label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="000.000.000-00"
                                        value={credential.cpf}
                                        onChange={e => setCredential({...credential, cpf: e.target.value})}
                                        className={`w-full pl-12 pr-4 py-4 rounded-2xl border text-sm font-bold outline-none transition-all ${dk ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}`}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-xs font-bold">
                                    <CircleAlert className="w-4 h-4 shrink-0" /> {error}
                                </div>
                            )}

                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 mt-4"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Acessar <ArrowRight className="w-4 h-4" /></>}
                            </button>
                        </form>
                        <button onClick={onBack} className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-400 transition-all uppercase tracking-widest">Voltar ao Sistema</button>
                    </div>
                )}

                {step === 'model' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                        <div className="text-center">
                            <h2 className={`text-xl font-black tracking-tight ${dk ? 'text-white' : 'text-slate-900'}`}>Olá, {user?.warName || user?.name}</h2>
                            <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Selecione o modelo de parcelamento para {new Date().getFullYear() + 1}</p>
                        </div>

                        <div className="grid gap-3">
                            {MODELS.map(model => (
                                <button 
                                    key={model.id}
                                    onClick={() => handleSelectModel(model.id)}
                                    className={`p-4 rounded-2xl border text-left flex items-center justify-between group transition-all ${dk ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-slate-50 border-slate-200 hover:border-blue-500'}`}
                                >
                                    <div>
                                        <p className={`text-sm font-black ${dk ? 'text-white' : 'text-slate-900'}`}>{model.label}</p>
                                        <p className="text-[10px] font-medium text-slate-500 uppercase">{model.description}</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-500 transition-all" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'dates' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className={`text-xl font-black tracking-tight ${dk ? 'text-white' : 'text-slate-900'}`}>Datas das Parcelas</h2>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Modelo selecionado: {selectedModel}</p>
                            </div>
                            <button onClick={() => setStep('model')} className="text-[10px] font-black text-blue-500 uppercase">Trocar</button>
                        </div>

                        <div className="space-y-6">
                            {periods.map((p, idx) => (
                                <div key={idx} className={`p-5 rounded-[2rem] border ${dk ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${dk ? 'text-blue-400' : 'text-blue-600'}`}>Parcela {idx + 1}</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase">{p.days || 0} Dias</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-slate-500 uppercase ml-1">Início</p>
                                            <input 
                                                type="date" 
                                                value={p.start_date}
                                                onChange={e => handleDateChange(idx, 'start_date', e.target.value)}
                                                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold outline-none ${dk ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-100'}`}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-slate-500 uppercase ml-1">Término</p>
                                            <input 
                                                type="date" 
                                                value={p.end_date}
                                                onChange={e => handleDateChange(idx, 'end_date', e.target.value)}
                                                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold outline-none ${dk ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-100'}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {error && (
                            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-xs font-bold">
                                <CircleAlert className="w-4 h-4 shrink-0" /> {error}
                            </div>
                        )}

                        <button 
                            onClick={handleSubmit}
                            disabled={loading || periods.some(p => !p.start_date || !p.end_date)}
                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Finalizar Planejamento <CircleCheck className="w-4 h-4" /></>}
                        </button>
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center space-y-8 animate-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40">
                            <CircleCheck className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h2 className={`text-2xl font-black tracking-tight ${dk ? 'text-white' : 'text-slate-900'}`}>Sucesso!</h2>
                            <p className="text-sm font-medium text-slate-400 mt-2">Seu planejamento de férias foi enviado para homologação do comando.</p>
                        </div>
                        <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest ${dk ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                            ID do Registro: {Math.random().toString(36).substr(2, 9).toUpperCase()}
                        </div>
                        <button 
                            onClick={() => window.location.reload()}
                            className="w-full py-4 border-2 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        >
                            Sair do Portal
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VacationPortal;
