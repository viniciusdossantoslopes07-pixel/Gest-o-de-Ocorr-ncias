import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { User } from '../../types';
import {
    DoorOpen, Car, Footprints, ArrowDownToLine, ArrowUpFromLine,
    Shield, UserCheck, Search, Calendar, RefreshCw, Plus, X,
    ChevronDown, Clock, Filter, Truck, Building2, BadgeCheck, Database, Info, Check,
    History, Sparkles, ChevronUp, AlertCircle, BarChart3, List
} from 'lucide-react';
import AccessStatistics from './AccessStatistics';
import { Combobox } from '../Combobox';

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
    // Tab State
    const [activeTab, setActiveTab] = useState<'registrar' | 'estatisticas' | 'busca'>('registrar');
    const [showStats, setShowStats] = useState(true);

    // Form state
    const [selectedGate, setSelectedGate] = useState('PORTÃO G1');
    const [name, setName] = useState('');
    const [characteristic, setCharacteristic] = useState('CIVIL');
    const [identification, setIdentification] = useState('');
    const [accessMode, setAccessMode] = useState<'Pedestre' | 'Veículo'>('Veículo');
    const [accessCategory, setAccessCategory] = useState<'Entrada' | 'Saída'>('Entrada');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [authorizer, setAuthorizer] = useState('');
    const [authorizerId, setAuthorizerId] = useState('');
    const [destination, setDestination] = useState('');

    // Frequent Visitor State
    const [visitorStats, setVisitorStats] = useState<{ count: number; lastVisit: string | null }>({ count: 0, lastVisit: null });
    const [isFrequentVisitor, setIsFrequentVisitor] = useState(false);

    // Data state
    const [records, setRecords] = useState<AccessRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Import Logic
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState('');
    const [importing, setImporting] = useState(false);

    // Filter state (for the list)
    const [filterGate, setFilterGate] = useState('');

    // Default to local date (YYYY-MM-DD) to avoid timezone issues
    const [filterDate, setFilterDate] = useState(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    });

    // Global Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<AccessRecord[]>([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Search Filters
    const [searchStartDate, setSearchStartDate] = useState('');
    const [searchEndDate, setSearchEndDate] = useState('');
    const [searchFilterType, setSearchFilterType] = useState<'all' | 'Pedestre' | 'Veículo'>('all');
    const [searchFilterCategory, setSearchFilterCategory] = useState<'all' | 'Entrada' | 'Saída'>('all');

    useEffect(() => {
        if (activeTab === 'registrar') {
            fetchRecords();
        }
    }, [filterDate, filterGate, activeTab]);

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

            const { data, error } = await query.limit(50); // Reduced limit for list view
            if (error) throw error;
            setRecords(data || []);
        } catch (err) {
            console.error('Erro ao buscar registros:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGlobalSearch = async () => {
        // If searching text, require 3 chars. If searching by date only, text can be empty.
        const isTextSearch = searchQuery.trim().length >= 3;
        const isDateSearch = searchStartDate || searchEndDate;

        if (!isTextSearch && !isDateSearch) {
            setSearchResults([]);
            setHasSearched(false);
            return;
        }

        setLoadingSearch(true);
        setHasSearched(true);
        try {
            let query = supabase
                .from('access_control')
                .select('*')
                .order('timestamp', { ascending: false });

            // Apply Text Filter
            if (isTextSearch) {
                const queryTerm = `%${searchQuery.trim().toUpperCase()}%`;
                query = query.or(`name.ilike.${queryTerm},vehicle_plate.ilike.${queryTerm},vehicle_model.ilike.${queryTerm},identification.ilike.${queryTerm},destination.ilike.${queryTerm}`);
            }

            // Apply Date Filters
            if (searchStartDate) {
                query = query.gte('timestamp', `${searchStartDate}T00:00:00`);
            }
            if (searchEndDate) {
                query = query.lte('timestamp', `${searchEndDate}T23:59:59`);
            }

            // Apply Type Filter
            if (searchFilterType !== 'all') {
                query = query.eq('access_mode', searchFilterType);
            }

            // Apply Category Filter
            if (searchFilterCategory !== 'all') {
                query = query.eq('access_category', searchFilterCategory);
            }

            const { data, error } = await query.limit(50);

            if (error) throw error;
            setSearchResults(data || []);
        } catch (err) {
            console.error('Erro na busca global:', err);
            // @ts-ignore
            alert('Erro ao realizar busca: ' + err.message);
        } finally {
            setLoadingSearch(false);
        }
    };

    // Debounce search (Text only auto-trigger)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeTab === 'busca') {
                // Trigger if text is valid OR if dates are set (and text is empty or valid)
                if (searchQuery.trim().length >= 3 || ((searchStartDate || searchEndDate) && searchQuery.trim().length === 0)) {
                    handleGlobalSearch();
                }
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [searchQuery, activeTab, searchStartDate, searchEndDate, searchFilterType, searchFilterCategory]);

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

    const processImport = async () => {
        if (!importText.trim()) return;
        setImporting(true);

        try {
            const lines = importText.split('\n').filter(l => l.trim());

            // Basic headers parsing or assuming default structure if copied from Excel
            // We'll try to map flexibly based on user provided structure
            // Provided: Carimbo de | data/hora | GUARDA | Nome ...
            const headers = lines[0].split('\t').map(h => h.trim().toUpperCase());
            const dataLines = lines.slice(1);

            const recordsToInsert: any[] = [];

            const idxGuard = headers.findIndex(h => h.includes('GUARDA') || h.includes('PORTÃO'));
            const idxName = headers.findIndex(h => h.includes('NOME'));
            const idxChar = headers.findIndex(h => h.includes('CARACTERISTICA') || h.includes('CARACTERÍSTICA'));
            const idxIdent = headers.findIndex(h => h.includes('IDENTIDADE') || h.includes('IDENTIFICAÇÃO') || h.includes('DOCUMENTO'));
            const idxMode = headers.findIndex(h => h.includes('FORMA') || h.includes('MODO') || h.includes('INGRESSO'));
            const idxCat1 = headers.findIndex(h => h.includes('CATEGORIA'));
            const idxCat2 = headers.findIndex(h => h.includes('TIPO') && (h.includes('ACESSO') || h.includes('TIPO')));
            const idxVehicle = headers.findIndex(h => h.includes('MODELO') || h.includes('VEÍCULO') || h.includes('VEICULO'));
            const idxPlate = headers.findIndex(h => h.includes('PLACA'));
            const idxDest = headers.findIndex(h => h.includes('DESTINO'));
            const idxAuth = headers.findIndex(h => h.includes('AUTORIZA'));

            // Date & Time
            const idxDate = headers.findIndex(h => h.includes('CARIMBO') || h.includes('DATA'));
            const idxTime = headers.findIndex(h => h.includes('HORA'));

            for (const line of dataLines) {
                const cols = line.split('\t').map(c => c.trim());
                if (cols.length < 2) continue;

                let timestamp = new Date().toISOString();
                try {
                    let dateStr = '';
                    let timeStr = '';

                    if (idxDate >= 0) dateStr = cols[idxDate].replace(/-/g, '').trim(); // Remove trailing dash from user format
                    if (idxTime >= 0) timeStr = cols[idxTime];

                    // Fallback heuristics
                    if (!dateStr || !dateStr.includes('/')) {
                        const d = cols.find(c => c.match(/\d{2}\/\d{2}\/\d{4}/));
                        if (d) dateStr = d.replace(/-/g, '').trim();
                    }
                    if (!timeStr || !timeStr.includes(':')) {
                        const t = cols.find(c => c.match(/\d{2}:\d{2}/));
                        if (t) timeStr = t;
                    }

                    if (dateStr && timeStr) {
                        const [day, month, year] = dateStr.split('/');
                        const [hour, minute, second] = timeStr.split(':');
                        if (day && month && year && hour && minute) {
                            const dt = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), second ? parseInt(second) : 0);
                            if (!isNaN(dt.getTime())) timestamp = dt.toISOString();
                        }
                    }
                } catch (e) { console.error('Date parse error', e); }

                let guard = idxGuard >= 0 ? cols[idxGuard] : 'PORTÃO G1';
                // Normalize Gate
                const G = guard.toUpperCase();
                if (G.includes('G1')) guard = 'PORTÃO G1';
                else if (G.includes('G2')) guard = 'PORTÃO G2';
                else if (G.includes('G3')) guard = 'PORTÃO G3';
                else guard = 'PORTÃO G1';

                let category = 'Entrada';
                const c1 = idxCat1 >= 0 ? cols[idxCat1]?.toUpperCase() : '';
                const c2 = idxCat2 >= 0 ? cols[idxCat2]?.toUpperCase() : '';
                if (c1.includes('SAÍDA') || c1.includes('SAIDA') || c2.includes('SAÍDA') || c2.includes('SAIDA')) category = 'Saída';

                recordsToInsert.push({
                    guard_gate: guard,
                    name: (idxName >= 0 ? cols[idxName] : 'NÃO INFORMADO') || 'NÃO INFORMADO',
                    characteristic: (() => {
                        const raw = (idxChar >= 0 ? cols[idxChar] : 'MILITAR')?.toUpperCase() || 'MILITAR';
                        if (CHARACTERISTICS.includes(raw)) return raw;
                        // Fallback mapping or default
                        if (raw.includes('MILITAR')) return 'MILITAR';
                        if (raw.includes('CIVIL')) return 'CIVIL';
                        return 'CIVIL'; // Safe default
                    })(),
                    identification: idxIdent >= 0 ? cols[idxIdent] : '',
                    access_mode: (idxMode >= 0 ? cols[idxMode] : 'Pedestre') || 'Pedestre',
                    access_category: category,
                    vehicle_model: idxVehicle >= 0 ? cols[idxVehicle] : '',
                    vehicle_plate: idxPlate >= 0 ? cols[idxPlate] : '',
                    destination: idxDest >= 0 ? cols[idxDest] : '',
                    authorizer: idxAuth >= 0 ? cols[idxAuth] : '',
                    timestamp: timestamp,
                    created_at: new Date().toISOString(),
                    registered_by: user.id
                });
            }

            if (recordsToInsert.length > 0) {
                const chunkSize = 100;
                let inserted = 0;
                for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
                    const chunk = recordsToInsert.slice(i, i + chunkSize);
                    await supabase.from('access_control').insert(chunk);
                    inserted += chunk.length;
                }
                alert(`${inserted} registros importados com sucesso!`);
                setImportText('');
                setShowImportModal(false);
                fetchRecords();
            } else {
                alert('Nenhum registro encontrado. Verifique se copiou o cabeçalho.');
            }

        } catch (err: any) {
            console.error(err);
            alert('Erro na importação: ' + err.message);
        } finally {
            setImporting(false);
        }
    };



    // Simple today stats for the card (retained but simplified)
    const todayStats = useMemo(() => {
        // Only calculate based on fetched records (which might be limited)
        // ideally we would do a separate count query but keeping it simple for now as per original logic
        const entries = records.filter(r => r.access_category === 'Entrada').length;
        const exits = records.filter(r => r.access_category === 'Saída').length;
        return { entries, exits, total: records.length };
    }, [records]);


    return (
        <div className="space-y-4 animate-fade-in max-w-7xl mx-auto pb-20">

            {/* Navigation Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl mb-4">
                <button
                    onClick={() => setActiveTab('registrar')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'registrar'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                        }`}
                >
                    <List className="w-4 h-4" />
                    Registrar
                </button>
                <button
                    onClick={() => setActiveTab('estatisticas')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'estatisticas'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                        }`}
                >
                    <BarChart3 className="w-4 h-4" />
                    BI
                </button>
                <button
                    onClick={() => setActiveTab('busca')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'busca'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                        }`}
                >
                    <Search className="w-4 h-4" />
                    Busca
                </button>

            </div>

            {/* TAB CONTENT: REGISTRAR */}
            {activeTab === 'registrar' && (
                <div className="space-y-4 animate-fade-in">
                    {/* 1. Registration Card */}
                    <div className={`bg-white rounded-2xl shadow-xl overflow-hidden border-t-4 ${selectedGate === 'PORTÃO G1' ? 'border-t-blue-500' :
                        selectedGate === 'PORTÃO G2' ? 'border-t-emerald-500' : 'border-t-amber-500'
                        }`}>
                        {/* Header: Title + Gate Selectors */}
                        <div className="p-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${selectedGate === 'PORTÃO G1' ? 'bg-blue-100 text-blue-600' :
                                    selectedGate === 'PORTÃO G2' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                    }`}>
                                    <DoorOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                                        Novo Registro
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Registro de Entrada/Saída</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {isFrequentVisitor && (
                                    <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1 rounded-full border border-amber-200 shadow-sm animate-pulse">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-tight">{visitorStats.count} ACESSOS</span>
                                    </div>
                                )}
                                <button
                                    onClick={() => setShowImportModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 transition-all shadow-sm active:scale-95"
                                >
                                    <Database className="w-3.5 h-3.5" /> Importar
                                </button>
                            </div>

                            {/* Gate Selectors - Compact & Inline */}
                            <div className="flex bg-slate-200/50 p-1 rounded-xl w-full">
                                {GATES.map(gate => {
                                    const isSelected = selectedGate === gate;
                                    let activeClass = '';
                                    if (isSelected) {
                                        if (gate === 'PORTÃO G1') activeClass = 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-100 scale-[1.02]';
                                        else if (gate === 'PORTÃO G2') activeClass = 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-100 scale-[1.02]';
                                        else if (gate === 'PORTÃO G3') activeClass = 'bg-amber-600 text-white shadow-lg ring-2 ring-amber-100 scale-[1.02]';
                                    } else {
                                        activeClass = 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/80';
                                    }

                                    return (
                                        <button
                                            key={gate}
                                            onClick={() => setSelectedGate(gate)}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap z-10 ${activeClass}`}
                                        >
                                            {gate.replace('PORTÃO ', '')}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-3 sm:p-5 space-y-2.5 sm:space-y-3">
                            {/* Row 1: Access Type & Mode (Compact) */}
                            <div className="grid grid-cols-2 gap-2">
                                {/* Access Category Toggle */}
                                <div className="bg-slate-200 p-1 rounded-2xl flex">
                                    <button
                                        onClick={() => setAccessCategory('Entrada')}
                                        className={`flex-1 py-2 sm:py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase flex items-center justify-center gap-2 transition-all ${accessCategory === 'Entrada'
                                            ? 'bg-emerald-500 text-white shadow-lg scale-[1.02]'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300/30'
                                            }`}
                                    >
                                        <ArrowDownToLine className="w-4 h-4" /> Entrada
                                    </button>
                                    <button
                                        onClick={() => setAccessCategory('Saída')}
                                        className={`flex-1 py-2 sm:py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase flex items-center justify-center gap-2 transition-all ${accessCategory === 'Saída'
                                            ? 'bg-red-500 text-white shadow-lg scale-[1.02]'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300/30'
                                            }`}
                                    >
                                        <ArrowUpFromLine className="w-4 h-4" /> Saída
                                    </button>
                                </div>

                                {/* Access Mode Toggle */}
                                <div className="bg-slate-200 p-1 rounded-2xl flex">
                                    <button
                                        onClick={() => setAccessMode('Pedestre')}
                                        className={`flex-1 py-2 sm:py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase flex items-center justify-center gap-2 transition-all ${accessMode === 'Pedestre'
                                            ? 'bg-slate-800 text-white shadow-lg scale-[1.02]'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300/30'
                                            }`}
                                    >
                                        <Footprints className="w-4 h-4" /> Pedestre
                                    </button>
                                    <button
                                        onClick={() => setAccessMode('Veículo')}
                                        className={`flex-1 py-2 sm:py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase flex items-center justify-center gap-2 transition-all ${accessMode === 'Veículo'
                                            ? 'bg-violet-600 text-white shadow-lg scale-[1.02]'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300/30'
                                            }`}
                                    >
                                        <Car className="w-4 h-4" /> Veículo
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
                                            className={`whitespace-nowrap px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all border ${characteristic === c
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="NOME COMPLETO"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3.5 font-black text-sm text-slate-900 placeholder:text-slate-400 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none uppercase transition-all"
                                    autoFocus
                                />
                                <div className="relative">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={identification}
                                        onChange={(e) => setIdentification(e.target.value.replace(/\D/g, ''))}
                                        placeholder="IDENTIFICAÇÃO (SARAM / CPF / RG)"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3.5 font-black text-sm text-slate-900 placeholder:text-slate-400 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none uppercase transition-all"
                                    />
                                    {identification && isFrequentVisitor && (
                                        <History className="absolute right-3 top-3.5 w-4 h-4 text-amber-500 animate-pulse" />
                                    )}
                                </div>
                            </div>

                            {/* Row 4: Vehicle Details (Conditional) */}
                            {accessMode === 'Veículo' && (
                                <div className="grid grid-cols-2 gap-2 sm:gap-3 animate-fade-in bg-violet-50 p-1.5 sm:p-2 rounded-xl border border-violet-100">
                                    <input
                                        type="text"
                                        value={vehicleModel}
                                        onChange={(e) => setVehicleModel(e.target.value)}
                                        placeholder="MODELO"
                                        className="w-full bg-white border border-violet-200 rounded-lg p-2 font-bold text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400 outline-none uppercase"
                                    />
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={vehiclePlate}
                                            onChange={(e) => setVehiclePlate(e.target.value)}
                                            placeholder="PLACA"
                                            className="w-full bg-white border border-violet-200 rounded-lg p-2 font-bold text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400 outline-none uppercase"
                                        />
                                        {vehiclePlate && isFrequentVisitor && (
                                            <History className="absolute right-2 top-2.5 w-3.5 h-3.5 text-amber-500" />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Row 5: Destination + Authorizer */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                <div className="relative">
                                    <Combobox
                                        options={DESTINATIONS}
                                        value={destination}
                                        onChange={setDestination}
                                        placeholder="DESTINO"
                                        disabled={accessCategory === 'Saída'}
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={authorizer}
                                    onChange={(e) => setAuthorizer(e.target.value)}
                                    placeholder="AUTORIZADOR (Opcional)"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3 font-bold text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
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

                    {/* 1.5. Daily Summary (Restored) */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
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
                                    <p className="text-base font-black text-blue-700 leading-none mt-0.5">{records.filter(r => r.access_mode === 'Pedestre').length}</p>
                                </div>
                                <div className="bg-violet-50 p-1.5 rounded-lg border border-violet-100 text-center">
                                    <p className="text-[9px] font-bold text-violet-600 uppercase">Veículos</p>
                                    <p className="text-base font-black text-violet-700 leading-none mt-0.5">{records.filter(r => r.access_mode === 'Veículo').length}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. History List (Compact) */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-black uppercase text-slate-600 flex items-center gap-2">
                                <History className="w-3.5 h-3.5" /> Últimos Acessos (Hoje)
                            </span>
                            <div className="flex gap-2 text-[10px] text-slate-400">
                                <span>Entradas: {todayStats.entries}</span>
                                <span>Saídas: {todayStats.exits}</span>
                            </div>
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
                                    ) : records.length === 0 ? (
                                        <tr><td colSpan={4} className="text-center py-4 text-xs text-slate-400 italic">Nenhum registro encontrado.</td></tr>
                                    ) : (
                                        records.map((record) => (
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
            )}

            {/* TAB CONTENT: ESTATÍSTICAS */}
            {activeTab === 'estatisticas' && (
                <AccessStatistics />
            )}

            {/* TAB CONTENT: BUSCA */}
            {activeTab === 'busca' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                        {/* Search Input */}
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Pesquisar por NOME, PLACA, MODELO, IDENTIFICAÇÃO ou DESTINO..."
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 font-bold text-lg text-slate-900 placeholder:text-slate-400 focus:border-blue-500 outline-none transition-all uppercase"
                                autoFocus
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                            {loadingSearch && (
                                <RefreshCw className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />
                            )}
                        </div>

                        {/* Filters Panel */}
                        <div className="flex flex-col md:flex-row gap-4 pt-2">
                            {/* Date Range */}
                            <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-black uppercase text-slate-400 pl-2 whitespace-nowrap">Tipo:</span>
                                {(['all', 'Pedestre', 'Veículo'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setSearchFilterType(type)}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${searchFilterType === type
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200'
                                            }`}
                                    >
                                        {type === 'all' ? 'Todos' : type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Category Filters */}
                        <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200 overflow-x-auto">
                            <span className="text-[10px] font-black uppercase text-slate-400 pl-2 whitespace-nowrap">Sentido:</span>
                            <div className="flex gap-1">
                                {(['all', 'Entrada', 'Saída'] as const).map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSearchFilterCategory(cat)}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${searchFilterCategory === cat
                                            ? (cat === 'Entrada' ? 'bg-emerald-600' : cat === 'Saída' ? 'bg-red-600' : 'bg-slate-800') + ' text-white shadow-sm'
                                            : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200'
                                            }`}
                                    >
                                        {cat === 'all' ? 'Todos' : cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {!searchQuery && !searchStartDate && !searchEndDate ? (
                        <p className="text-xs text-slate-400 font-medium px-1 text-center py-2">
                            Digite para buscar ou use os filtros de data para ver o histórico.
                        </p>
                    ) : (
                        <div className="flex items-center justify-between px-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {loadingSearch ? 'Buscando...' : `${searchResults.length} Resultados encontrados`}
                            </p>
                        </div>
                    )}


                    {/* Search Results */}
                    {
                        hasSearched && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                                <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-black uppercase text-slate-600 flex items-center gap-2">
                                        <List className="w-3.5 h-3.5" /> Resultados Encontrados
                                    </span>
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                        {searchResults.length} Registros
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase">Data / Hora</th>
                                                <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase">Local / Tipo</th>
                                                <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase">Solicitante / Veículo</th>
                                                <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {searchResults.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="text-center py-8">
                                                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                                            <Search className="w-8 h-8 opacity-20" />
                                                            <p className="text-sm font-bold">Nenhum registro encontrado para "{searchQuery}"</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                searchResults.map((record) => (
                                                    <tr key={record.id} className="hover:bg-blue-50/30 transition-colors">
                                                        <td className="px-4 py-3 align-top">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-slate-900">
                                                                    {new Date(record.timestamp).toLocaleDateString('pt-BR')}
                                                                </span>
                                                                <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    {new Date(record.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-slate-700 uppercase">
                                                                    {record.guard_gate.replace('PORTÃO ', 'G')}
                                                                </span>
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                                                                    {record.access_mode} • {record.characteristic}
                                                                </span>
                                                                {record.destination && (
                                                                    <span className="text-[9px] font-bold text-blue-600 uppercase mt-0.5">
                                                                        Dest: {record.destination}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-slate-800 uppercase">
                                                                    {record.name}
                                                                </span>
                                                                {record.access_mode === 'Veículo' && (
                                                                    <div className="flex items-center gap-1.5 mt-1 bg-slate-100 w-fit px-1.5 py-0.5 rounded">
                                                                        <Car className="w-3 h-3 text-slate-500" />
                                                                        <span className="text-[10px] font-bold text-slate-600 uppercase">
                                                                            {record.vehicle_model} • <span className="text-slate-900">{record.vehicle_plate}</span>
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {record.identification && (
                                                                    <span className="text-[9px] font-medium text-slate-400 mt-0.5">
                                                                        Doc: {record.identification}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right align-top">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black uppercase ${record.access_category === 'Entrada'
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {record.access_category === 'Entrada' ? (
                                                                    <ArrowDownToLine className="w-3 h-3" />
                                                                ) : (
                                                                    <ArrowUpFromLine className="w-3 h-3" />
                                                                )}
                                                                {record.access_category}
                                                            </span>
                                                            {record.authorizer && (
                                                                <div className="mt-1 text-[9px] text-slate-400 font-medium">
                                                                    Aut: {record.authorizer}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    }
                </div>
            )}


            {/* IMPORT MODAL */}
            {
                showImportModal && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h3 className="font-black text-lg uppercase tracking-tight text-slate-800 flex items-center gap-2">
                                    <Database className="w-5 h-5 text-blue-600" />
                                    Importação de Dados
                                </h3>
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto space-y-4">
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-2">
                                    <p className="font-bold flex items-center gap-2">
                                        <Info className="w-4 h-4" /> Instruções:
                                    </p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Copie os dados da planilha (com cabeçalho) e cole abaixo.</li>
                                        <li>O sistema identifica automaticamente cabeçalhos como "GUARDA", "NOME", etc.</li>
                                        <li>Aguarde a mensagem de confirmação após clicar em Importar.</li>
                                    </ul>
                                </div>

                                <textarea
                                    value={importText}
                                    onChange={(e) => setImportText(e.target.value)}
                                    placeholder="Cole seus dados aqui..."
                                    className="w-full h-96 p-4 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none resize-none"
                                    autoFocus
                                />
                            </div>

                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="px-6 py-3 rounded-xl font-bold uppercase text-xs text-slate-500 hover:bg-slate-200 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={processImport}
                                    disabled={importing || !importText.trim()}
                                    className="px-8 py-3 rounded-xl font-bold uppercase text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                                >
                                    {importing ? 'Processando...' : 'Importar Dados'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
