import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { User } from '../../types';
import {
    DoorOpen, Car, Footprints, ArrowDownToLine, ArrowUpFromLine,
    Shield, UserCheck, Search, Calendar, RefreshCw, Plus, X,
    ChevronDown, Clock, Filter, Truck, Building2, BadgeCheck,
    History, Sparkles, ChevronUp, AlertCircle
} from 'lucide-react';

interface AccessControlPanelProps {
    user: User;
}

interface AccessRecord {
    id: string;
    timestamp: string;
    guard_gate: string;
    name: string;
    characteristic: string;
    identification: string;
    access_mode: string;
    access_category: string;
    vehicle_model: string;
    vehicle_plate: string;
    authorizer: string;
    authorizer_id: string;
    destination: string;
    registered_by: string;
}

const GATES = ['PORTÃO G1', 'PORTÃO G2', 'PORTÃO G3'];
const CHARACTERISTICS = ['MILITAR', 'CIVIL', 'PRESTADOR', 'ENTREGADOR'];
const DESTINATIONS = [
    'BASP (Comando)', 'PCAN', 'PASP', 'ILA', 'SEREP-SP', 'GSD-SP', 'GECAMP',
    'BOMBEIRO', 'VILA OF.', 'VILA GRAD.', 'CAPELA', 'GSAU', 'RANCHO',
    'HOTEL DE TRÂNSITO BASP', 'HOTEL DE TRÂNSITO SEREP', 'HOTEL DE TRÂNSITO ILA'
];

export default function AccessControlPanel({ user }: AccessControlPanelProps) {
    // Form state
    const [selectedGate, setSelectedGate] = useState('PORTÃO G1');
    const [name, setName] = useState('');
    const [characteristic, setCharacteristic] = useState('MILITAR');
    const [identification, setIdentification] = useState('');
    const [accessMode, setAccessMode] = useState<'Pedestre' | 'Veículo'>('Pedestre');
    const [accessCategory, setAccessCategory] = useState<'Entrada' | 'Saída'>('Entrada');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [authorizer, setAuthorizer] = useState('');
    const [authorizerId, setAuthorizerId] = useState('');
    const [destination, setDestination] = useState('');
    const [showDestDropdown, setShowDestDropdown] = useState(false);

    // UX State
    const [showStats, setShowStats] = useState(true); // Expanded by default at top

    // Frequent Visitor State
    const [visitorStats, setVisitorStats] = useState<{ count: number; lastVisit: string | null }>({ count: 0, lastVisit: null });
    const [isFrequentVisitor, setIsFrequentVisitor] = useState(false);

    // Data state
    const [records, setRecords] = useState<AccessRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(true);

    // Filter state
    const [filterGate, setFilterGate] = useState('');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterSearch, setFilterSearch] = useState('');

    useEffect(() => {
        fetchRecords();
    }, [filterDate, filterGate]);

    // Auto-fill logic based on Identification or Plate
    const checkFrequentVisitor = useCallback(async (searchType: 'identification' | 'plate', value: string) => {
        if (!value || value.length < 3) return;

        try {
            let query = supabase
                .from('access_control')
                .select('*')
                .order('timestamp', { ascending: false });

            if (searchType === 'identification') {
                query = query.eq('identification', value.trim());
            } else {
                query = query.eq('vehicle_plate', value.trim().toUpperCase());
            }

            const { data, error } = await query;

            if (data && data.length > 0) {
                const latest = data[0];

                // Auto-fill form if fields are empty
                if (!name) setName(latest.name);
                if (!vehicleModel && latest.vehicle_model) setVehicleModel(latest.vehicle_model);
                if (!vehiclePlate && latest.vehicle_plate && searchType === 'identification') setVehiclePlate(latest.vehicle_plate);
                if (!identification && latest.identification && searchType === 'plate') setIdentification(latest.identification);
                if (latest.characteristic) setCharacteristic(latest.characteristic);

                // Update stats
                setVisitorStats({
                    count: data.length,
                    lastVisit: latest.timestamp
                });
                setIsFrequentVisitor(true);
            } else {
                setIsFrequentVisitor(false);
                setVisitorStats({ count: 0, lastVisit: null });
            }
        } catch (err) {
            console.error('Error checking visitor:', err);
        }
    }, [name, vehicleModel, vehiclePlate, identification]);

    // Debounced check function
    useEffect(() => {
        const timer = setTimeout(() => {
            if (identification) checkFrequentVisitor('identification', identification);
        }, 800);
        return () => clearTimeout(timer);
    }, [identification]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (vehiclePlate) checkFrequentVisitor('plate', vehiclePlate);
        }, 800);
        return () => clearTimeout(timer);
    }, [vehiclePlate]);


    const fetchRecords = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('access_control')
                .select('*')
                .order('timestamp', { ascending: false });

            if (filterDate) {
                const startOfDay = `${filterDate}T00:00:00`;
                const endOfDay = `${filterDate}T23:59:59`;
                query = query.gte('timestamp', startOfDay).lte('timestamp', endOfDay);
            }

            if (filterGate) {
                query = query.eq('guard_gate', filterGate);
            }

            const { data, error } = await query.limit(200);
            if (error) throw error;
            setRecords(data || []);
        } catch (err) {
            console.error('Erro ao buscar registros:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            alert('Informe o nome.');
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase.from('access_control').insert([{
                guard_gate: selectedGate,
                name: name.trim().toUpperCase(),
                characteristic,
                identification: identification.trim(),
                access_mode: accessMode,
                access_category: accessCategory,
                vehicle_model: accessMode === 'Veículo' ? vehicleModel.trim().toUpperCase() : null,
                vehicle_plate: accessMode === 'Veículo' ? vehiclePlate.trim().toUpperCase() : null,
                authorizer: authorizer.trim() || null,
                authorizer_id: authorizerId.trim() || null,
                destination: destination.trim() || null,
                registered_by: user.id,
            }]);

            if (error) throw error;

            // Reset form (keep gate and category for speed)
            setName('');
            setIdentification('');
            setVehicleModel('');
            setVehiclePlate('');
            setAuthorizer('');
            setAuthorizerId('');
            setDestination('');
            setIsFrequentVisitor(false);
            setVisitorStats({ count: 0, lastVisit: null });

            await fetchRecords();
        } catch (err) {
            console.error('Erro ao registrar acesso:', err);
            // @ts-ignore
            alert(`Erro ao registrar acesso: ${err.message || JSON.stringify(err)}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Stats
    const todayStats = useMemo(() => {
        const entries = records.filter(r => r.access_category === 'Entrada').length;
        const exits = records.filter(r => r.access_category === 'Saída').length;
        const pedestrians = records.filter(r => r.access_mode === 'Pedestre').length;
        const vehicles = records.filter(r => r.access_mode === 'Veículo').length;
        return { entries, exits, pedestrians, vehicles, total: records.length };
    }, [records]);

    const filteredRecords = useMemo(() => {
        if (!filterSearch) return records;
        const q = filterSearch.toLowerCase();
        return records.filter(r =>
            r.name?.toLowerCase().includes(q) ||
            r.identification?.toLowerCase().includes(q) ||
            r.vehicle_plate?.toLowerCase().includes(q)
        );
    }, [records, filterSearch]);

    const filteredDestinations = useMemo(() => {
        if (!destination) return DESTINATIONS;
        const q = destination.toLowerCase();
        return DESTINATIONS.filter(d => d.toLowerCase().includes(q));
    }, [destination]);

    const gateColors: Record<string, string> = {
        'PORTÃO G1': 'from-blue-500 to-blue-700',
        'PORTÃO G2': 'from-emerald-500 to-emerald-700',
        'PORTÃO G3': 'from-amber-500 to-amber-700',
    };

    return (
        <div className="space-y-4 animate-fade-in max-w-7xl mx-auto pb-20">

            {/* 1. Daily Summary (Top) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <button
                    onClick={() => setShowStats(!showStats)}
                    className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                    <span className="text-xs font-black uppercase text-slate-600 flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5" /> Resumo do Dia
                        <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">{todayStats.total}</span>
                    </span>
                    {showStats ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {showStats && (
                    <div className="p-2 grid grid-cols-2 sm:grid-cols-4 gap-2 animate-fade-in">
                        <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-100 text-center">
                            <p className="text-[9px] font-bold text-emerald-600 uppercase">Entradas</p>
                            <p className="text-base font-black text-emerald-700 leading-none mt-0.5">{todayStats.entries}</p>
                        </div>
                        <div className="bg-red-50 p-1.5 rounded-lg border border-red-100 text-center">
                            <p className="text-[9px] font-bold text-red-600 uppercase">Saídas</p>
                            <p className="text-base font-black text-red-700 leading-none mt-0.5">{todayStats.exits}</p>
                        </div>
                        <div className="bg-blue-50 p-1.5 rounded-lg border border-blue-100 text-center">
                            <p className="text-[9px] font-bold text-blue-600 uppercase">Pedestres</p>
                            <p className="text-base font-black text-blue-700 leading-none mt-0.5">{todayStats.pedestrians}</p>
                        </div>
                        <div className="bg-violet-50 p-1.5 rounded-lg border border-violet-100 text-center">
                            <p className="text-[9px] font-bold text-violet-600 uppercase">Veículos</p>
                            <p className="text-base font-black text-violet-700 leading-none mt-0.5">{todayStats.vehicles}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Registration Card */}
            {showForm && (
                <div className={`bg-white rounded-2xl shadow-xl overflow-hidden border-t-4 ${selectedGate === 'PORTÃO G1' ? 'border-t-blue-500' :
                    selectedGate === 'PORTÃO G2' ? 'border-t-emerald-500' : 'border-t-amber-500'
                    }`}>
                    {/* Header: Title + Gate Selectors */}
                    <div className="p-3 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2 text-slate-700">
                                <Shield className="w-4 h-4" /> Novo Registro
                            </h3>
                            {isFrequentVisitor && (
                                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-lg border border-amber-100 animate-fade-in">
                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                    <span className="text-[9px] font-bold uppercase">{visitorStats.count} acessos</span>
                                </div>
                            )}
                        </div>

                        {/* Gate Selectors - Compact & Inline */}
                        <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:max-w-md ml-auto">
                            {GATES.map(gate => {
                                const isSelected = selectedGate === gate;
                                let activeClass = '';
                                if (isSelected) {
                                    if (gate === 'PORTÃO G1') activeClass = 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200';
                                    else if (gate === 'PORTÃO G2') activeClass = 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-200';
                                    else if (gate === 'PORTÃO G3') activeClass = 'bg-amber-600 text-white shadow-md ring-2 ring-amber-200';
                                } else {
                                    activeClass = 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50';
                                }

                                return (
                                    <button
                                        key={gate}
                                        onClick={() => setSelectedGate(gate)}
                                        className={`flex-1 px-4 py-2 rounded-md text-[10px] sm:text-xs font-black uppercase transition-all whitespace-nowrap ${activeClass}`}
                                    >
                                        {gate.replace('PORTÃO ', '')}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-3 sm:p-5 space-y-3">
                        {/* Row 1: Access Type & Mode (Compact) */}
                        <div className="grid grid-cols-2 gap-2">
                            {/* Access Category Toggle */}
                            <div className="bg-slate-100 p-1 rounded-xl flex">
                                <button
                                    onClick={() => setAccessCategory('Entrada')}
                                    className={`flex-1 py-2 rounded-lg font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 transition-all ${accessCategory === 'Entrada'
                                        ? 'bg-emerald-500 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <ArrowDownToLine className="w-3.5 h-3.5" /> Entrada
                                </button>
                                <button
                                    onClick={() => setAccessCategory('Saída')}
                                    className={`flex-1 py-2 rounded-lg font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 transition-all ${accessCategory === 'Saída'
                                        ? 'bg-red-500 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <ArrowUpFromLine className="w-3.5 h-3.5" /> Saída
                                </button>
                            </div>

                            {/* Access Mode Toggle */}
                            <div className="bg-slate-100 p-1 rounded-xl flex">
                                <button
                                    onClick={() => setAccessMode('Pedestre')}
                                    className={`flex-1 py-2 rounded-lg font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 transition-all ${accessMode === 'Pedestre'
                                        ? 'bg-blue-500 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Footprints className="w-3.5 h-3.5" /> Pedestre
                                </button>
                                <button
                                    onClick={() => setAccessMode('Veículo')}
                                    className={`flex-1 py-2 rounded-lg font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 transition-all ${accessMode === 'Veículo'
                                        ? 'bg-violet-500 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Car className="w-3.5 h-3.5" /> Veículo
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Characteristic - Horizontal Scroll */}
                        <div className="overflow-x-auto pb-1 -mx-1 px-1">
                            <div className="flex gap-2">
                                {CHARACTERISTICS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setCharacteristic(c)}
                                        className={`whitespace-nowrap px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all border ${characteristic === c
                                            ? 'bg-slate-800 text-white border-slate-800 shadow'
                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Row 3: Name + Identification */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="NOME (Ex: CB SILVA)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                autoFocus
                            />
                            <div className="relative">
                                <input
                                    type="text"
                                    value={identification}
                                    onChange={(e) => setIdentification(e.target.value)}
                                    placeholder="SARAM / CPF / RG"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                />
                                {identification && isFrequentVisitor && (
                                    <History className="absolute right-3 top-3.5 w-4 h-4 text-amber-500 animate-pulse" />
                                )}
                            </div>
                        </div>

                        {/* Row 4: Vehicle Details (Conditional) */}
                        {accessMode === 'Veículo' && (
                            <div className="grid grid-cols-2 gap-3 animate-fade-in bg-violet-50 p-2 rounded-xl border border-violet-100">
                                <input
                                    type="text"
                                    value={vehicleModel}
                                    onChange={(e) => setVehicleModel(e.target.value)}
                                    placeholder="MODELO (Ex: ONIX)"
                                    className="w-full bg-white border border-violet-200 rounded-lg p-2 font-bold text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400 outline-none uppercase"
                                />
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={vehiclePlate}
                                        onChange={(e) => setVehiclePlate(e.target.value)}
                                        placeholder="PLACA (Ex: ABC1234)"
                                        className="w-full bg-white border border-violet-200 rounded-lg p-2 font-bold text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400 outline-none uppercase"
                                    />
                                    {vehiclePlate && isFrequentVisitor && (
                                        <History className="absolute right-2 top-2.5 w-3.5 h-3.5 text-amber-500" />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Row 5: Destination + Authorizer */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={destination}
                                    onChange={(e) => { setDestination(e.target.value); setShowDestDropdown(true); }}
                                    onFocus={() => setShowDestDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowDestDropdown(false), 200)}
                                    placeholder="DESTINO (Ex: PISTA)"
                                    disabled={accessCategory === 'Saída'}
                                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none uppercase ${accessCategory === 'Saída' ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
                                />
                                {showDestDropdown && filteredDestinations.length > 0 && (
                                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                        {filteredDestinations.map(d => (
                                            <button
                                                key={d}
                                                onMouseDown={(e) => { e.preventDefault(); setDestination(d); setShowDestDropdown(false); }}
                                                className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <input
                                type="text"
                                value={authorizer}
                                onChange={(e) => setAuthorizer(e.target.value)}
                                placeholder="AUTORIZADOR (Opcional)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !name.trim()}
                            className={`w-full py-3.5 rounded-xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg border-b-4 active:border-b-0 active:translate-y-1 ${accessCategory === 'Entrada'
                                ? 'bg-emerald-500 text-white border-emerald-700 hover:bg-emerald-600'
                                : 'bg-red-500 text-white border-red-700 hover:bg-red-600'
                                } disabled:opacity-40 disabled:cursor-not-allowed disabled:border-none`}
                        >
                            {submitting ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {accessCategory === 'Entrada' ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                                    CONFIRMAR {accessCategory === 'Entrada' ? 'ENTRADA' : 'SAÍDA'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* History Link / Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-600 flex items-center gap-2">
                        <History className="w-3.5 h-3.5" /> Últimos Acessos
                    </span>
                    <button onClick={fetchRecords} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Compact Table */}
                <div className="overflow-x-auto max-h-[300px]">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                            <tr>
                                <th className="px-3 py-2 text-[9px] font-black text-slate-500 uppercase">Hora</th>
                                <th className="px-3 py-2 text-[9px] font-black text-slate-500 uppercase">Local</th>
                                <th className="px-3 py-2 text-[9px] font-black text-slate-500 uppercase">Nome / Detalhes</th>
                                <th className="px-3 py-2 text-[9px] font-black text-slate-500 uppercase text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="text-center py-4 text-xs text-slate-400 italic">Carregando...</td></tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-4 text-xs text-slate-400 italic">Nada por aqui.</td></tr>
                            ) : (
                                filteredRecords.map((record) => (
                                    <tr key={record.id} className="border-b border-slate-50 hover:bg-slate-50">
                                        <td className="px-3 py-2 text-[10px] font-bold text-slate-600 align-top">
                                            {new Date(record.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-3 py-2 text-[10px] font-bold text-slate-600 align-top">
                                            {record.guard_gate.replace('PORTÃO ', '')}
                                        </td>
                                        <td className="px-3 py-2 align-top">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-900">{record.name}</span>
                                                <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-0.5">
                                                    <span className="uppercase">{record.characteristic}</span>
                                                    {record.access_mode === 'Veículo' && (
                                                        <>• {record.vehicle_model} <span className="font-mono">{record.vehicle_plate}</span></>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-right align-top">
                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${record.access_category === 'Entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {record.access_category === 'Entrada' ? 'ENT' : 'SAI'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
