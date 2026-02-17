import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { User } from '../../types';
import {
    DoorOpen, Car, Footprints, ArrowDownToLine, ArrowUpFromLine,
    Shield, UserCheck, Search, Calendar, RefreshCw, Plus, X,
    ChevronDown, Clock, Filter, Truck, Building2, BadgeCheck
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
    'BASP (Comando)', 'GSD-SP', 'PASP', 'PCAN', 'HOTEL DE TRÂNSITO BASP',
    'VILA GRAD.', 'SAP', 'SOP', 'ALMOXARIFADO', 'RANCHO', 'BARBEARIA',
    'CINEMA', 'ANFITEATRO', 'PISTA DE ATLETISMO', 'QUADRA ESPORTIVA'
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

            await fetchRecords();
        } catch (err) {
            console.error('Erro ao registrar acesso:', err);
            alert('Erro ao registrar acesso.');
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

    const gateBorderColors: Record<string, string> = {
        'PORTÃO G1': 'border-blue-500 bg-blue-50 text-blue-700',
        'PORTÃO G2': 'border-emerald-500 bg-emerald-50 text-emerald-700',
        'PORTÃO G3': 'border-amber-500 bg-amber-50 text-amber-700',
    };

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in max-w-7xl mx-auto">

            {/* Gate Selector */}
            <div className="grid grid-cols-3 gap-3">
                {GATES.map(gate => (
                    <button
                        key={gate}
                        onClick={() => setSelectedGate(gate)}
                        className={`relative p-4 sm:p-6 rounded-2xl font-black text-sm sm:text-lg uppercase tracking-widest transition-all duration-300 border-2 ${selectedGate === gate
                                ? `bg-gradient-to-br ${gateColors[gate]} text-white border-transparent shadow-xl scale-[1.02]`
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:shadow-md'
                            }`}
                    >
                        <DoorOpen className={`w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 ${selectedGate === gate ? 'text-white' : 'text-slate-400'}`} />
                        <span className="block text-center text-[10px] sm:text-sm">{gate}</span>
                        {selectedGate === gate && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow">
                                <BadgeCheck className="w-3 h-3 text-green-600" />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
                    <p className="text-xl sm:text-2xl font-black text-slate-900">{todayStats.total}</p>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-emerald-100 shadow-sm text-center">
                    <ArrowDownToLine className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Entradas</p>
                    <p className="text-xl sm:text-2xl font-black text-emerald-700">{todayStats.entries}</p>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-red-100 shadow-sm text-center">
                    <ArrowUpFromLine className="w-4 h-4 text-red-500 mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-red-600 uppercase">Saídas</p>
                    <p className="text-xl sm:text-2xl font-black text-red-700">{todayStats.exits}</p>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-blue-100 shadow-sm text-center">
                    <Footprints className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-blue-600 uppercase">Pedestres</p>
                    <p className="text-xl sm:text-2xl font-black text-blue-700">{todayStats.pedestrians}</p>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-violet-100 shadow-sm text-center col-span-2 sm:col-span-1">
                    <Car className="w-4 h-4 text-violet-500 mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-violet-600 uppercase">Veículos</p>
                    <p className="text-xl sm:text-2xl font-black text-violet-700">{todayStats.vehicles}</p>
                </div>
            </div>

            {/* Toggle Form / Collapse */}
            <button
                onClick={() => setShowForm(!showForm)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg"
            >
                {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showForm ? 'Fechar Formulário' : 'Novo Registro de Acesso'}
            </button>

            {/* Registration Form */}
            {showForm && (
                <div className={`bg-white p-4 sm:p-6 rounded-2xl shadow-lg border-2 ${gateBorderColors[selectedGate]} transition-all`}>
                    <h3 className="font-black text-lg uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5" /> Registro de Acesso — {selectedGate}
                    </h3>

                    <div className="space-y-4">
                        {/* Row 1: Access Category (Entrada / Saída) */}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tipo de Acesso</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setAccessCategory('Entrada')}
                                    className={`py-4 rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 transition-all border-2 ${accessCategory === 'Entrada'
                                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg'
                                            : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300'
                                        }`}
                                >
                                    <ArrowDownToLine className="w-5 h-5" /> Entrada
                                </button>
                                <button
                                    onClick={() => setAccessCategory('Saída')}
                                    className={`py-4 rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 transition-all border-2 ${accessCategory === 'Saída'
                                            ? 'bg-red-500 text-white border-red-600 shadow-lg'
                                            : 'bg-white text-slate-500 border-slate-200 hover:border-red-300'
                                        }`}
                                >
                                    <ArrowUpFromLine className="w-5 h-5" /> Saída
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Characteristic */}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Característica</label>
                            <div className="grid grid-cols-4 gap-2">
                                {CHARACTERISTICS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setCharacteristic(c)}
                                        className={`py-3 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all border ${characteristic === c
                                                ? 'bg-slate-900 text-white border-slate-900 shadow'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                            }`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Row 3: Name + ID */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: CB SILVA"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 font-bold text-sm text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none uppercase"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Identificação (SARAM/CPF/RG)</label>
                                <input
                                    type="text"
                                    value={identification}
                                    onChange={(e) => setIdentification(e.target.value)}
                                    placeholder="Ex: 7321104"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 font-bold text-sm text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                        </div>

                        {/* Row 4: Access Mode (Pedestre / Veículo) */}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Forma de Ingresso</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setAccessMode('Pedestre')}
                                    className={`py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border-2 ${accessMode === 'Pedestre'
                                            ? 'bg-blue-500 text-white border-blue-600 shadow-lg'
                                            : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                                        }`}
                                >
                                    <Footprints className="w-4 h-4" /> Pedestre
                                </button>
                                <button
                                    onClick={() => setAccessMode('Veículo')}
                                    className={`py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border-2 ${accessMode === 'Veículo'
                                            ? 'bg-violet-500 text-white border-violet-600 shadow-lg'
                                            : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300'
                                        }`}
                                >
                                    <Car className="w-4 h-4" /> Veículo
                                </button>
                            </div>
                        </div>

                        {/* Row 5: Vehicle Details (Conditional) */}
                        {accessMode === 'Veículo' && (
                            <div className="grid grid-cols-2 gap-3 animate-fade-in bg-violet-50 p-3 rounded-xl border border-violet-200">
                                <div>
                                    <label className="text-[10px] font-black text-violet-500 uppercase tracking-widest block mb-1">Modelo</label>
                                    <input
                                        type="text"
                                        value={vehicleModel}
                                        onChange={(e) => setVehicleModel(e.target.value)}
                                        placeholder="Ex: ONIX"
                                        className="w-full bg-white border border-violet-200 rounded-xl p-3 font-bold text-sm text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-violet-400 outline-none uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-violet-500 uppercase tracking-widest block mb-1">Placa</label>
                                    <input
                                        type="text"
                                        value={vehiclePlate}
                                        onChange={(e) => setVehiclePlate(e.target.value)}
                                        placeholder="Ex: FBV6590"
                                        className="w-full bg-white border border-violet-200 rounded-xl p-3 font-bold text-sm text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-violet-400 outline-none uppercase"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Row 6: Destination + Authorizer */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Destino</label>
                                <input
                                    type="text"
                                    value={destination}
                                    onChange={(e) => { setDestination(e.target.value); setShowDestDropdown(true); }}
                                    onFocus={() => setShowDestDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowDestDropdown(false), 200)}
                                    placeholder="Ex: GSD-SP"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
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
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Quem Autoriza? (Opcional)</label>
                                <input
                                    type="text"
                                    value={authorizer}
                                    onChange={(e) => setAuthorizer(e.target.value)}
                                    placeholder="Ex: SGT DUARTE"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !name.trim()}
                            className={`w-full py-5 rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl border-2 ${accessCategory === 'Entrada'
                                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-700 text-white border-emerald-800 hover:from-emerald-400 hover:to-emerald-600'
                                    : 'bg-gradient-to-r from-red-500 to-red-700 text-white border-red-800 hover:from-red-400 hover:to-red-600'
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                            {submitting ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {accessCategory === 'Entrada' ? <ArrowDownToLine className="w-5 h-5" /> : <ArrowUpFromLine className="w-5 h-5" />}
                                    Registrar {accessCategory}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* History Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-slate-600" />
                        <h3 className="font-black text-sm sm:text-base uppercase tracking-wider text-slate-800">Histórico de Acessos</h3>
                    </div>
                    <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:justify-end">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none"
                            />
                        </div>
                        <select
                            value={filterGate}
                            onChange={(e) => setFilterGate(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                        >
                            <option value="">Todos os Portões</option>
                            {GATES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                            <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
                            <input
                                type="text"
                                value={filterSearch}
                                onChange={(e) => setFilterSearch(e.target.value)}
                                placeholder="Buscar nome, doc, placa..."
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none w-full"
                            />
                        </div>
                        <button onClick={fetchRecords} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Hora</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Portão</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest hidden sm:table-cell">Tipo</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest hidden sm:table-cell">Doc</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ingresso</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest hidden md:table-cell">Veículo</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest hidden md:table-cell">Destino</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Acesso</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} className="text-center py-8 text-sm text-slate-400 italic">Carregando...</td></tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr><td colSpan={9} className="text-center py-8 text-sm text-slate-400 italic">Nenhum registro encontrado</td></tr>
                            ) : (
                                filteredRecords.map((record) => (
                                    <tr key={record.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-xs font-bold text-slate-600">
                                            {new Date(record.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${record.guard_gate === 'PORTÃO G1' ? 'bg-blue-100 text-blue-700' :
                                                    record.guard_gate === 'PORTÃO G2' ? 'bg-emerald-100 text-emerald-700' :
                                                        'bg-amber-100 text-amber-700'
                                                }`}>
                                                {record.guard_gate.replace('PORTÃO ', '')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-bold text-slate-900">{record.name}</td>
                                        <td className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase hidden sm:table-cell">{record.characteristic}</td>
                                        <td className="px-4 py-3 text-xs font-mono text-slate-600 hidden sm:table-cell">{record.identification || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                                                {record.access_mode === 'Pedestre' ? <Footprints className="w-3 h-3" /> : <Car className="w-3 h-3" />}
                                                {record.access_mode}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">
                                            {record.vehicle_model ? `${record.vehicle_model} ${record.vehicle_plate || ''}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{record.destination || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${record.access_category === 'Entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {record.access_category}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {filteredRecords.length} registro{filteredRecords.length !== 1 ? 's' : ''} encontrado{filteredRecords.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>
        </div>
    );
}
