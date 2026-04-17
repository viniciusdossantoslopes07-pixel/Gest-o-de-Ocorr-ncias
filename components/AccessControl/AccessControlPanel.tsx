import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { User } from '../../types';
import {
    DoorOpen, Car, Footprints, ArrowDownToLine, ArrowUpFromLine, Shield, UserCheck, Search, Calendar, RefreshCw, Plus, X,
    ChevronDown, Clock, Filter, Truck, Building2, BadgeCheck, Database, Info, Check,
    History, Sparkles, ChevronUp, AlertCircle, BarChart3, List, Printer
} from 'lucide-react';
import AccessStatistics from './AccessStatistics';
import { Combobox } from '../Combobox';
import AdvancedSearchPrintView from './AdvancedSearchPrintView';

interface AccessControlPanelProps {
    user: User;
    isDarkMode?: boolean;
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

export default function AccessControlPanel({ user, isDarkMode = false }: AccessControlPanelProps) {
    // Dark mode helpers
    const dk = isDarkMode;
    const card = 'glass-panel';
    const cardSm = 'glass-panel';
    const surfaceBg = dk ? 'bg-slate-700/60' : 'bg-slate-50';
    const surfaceBorder = dk ? 'border-slate-600' : 'border-slate-100';
    const inputCls = 'glass-input';
    const textPrimary = dk ? 'text-white' : 'text-slate-900';
    const textSecondary = dk ? 'text-slate-300' : 'text-slate-600';
    const textMuted = dk ? 'text-slate-400' : 'text-slate-500';
    const hoverRow = dk ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50';
    // Tab State
    const [activeTab, setActiveTab] = useState<'registrar' | 'estatisticas' | 'busca'>('registrar');
    const [showStats, setShowStats] = useState(true);
    const [historyGateFilter, setHistoryGateFilter] = useState('');

    // Form state
    const [selectedGate, setSelectedGate] = useState('');
    const [name, setName] = useState('');
    const [characteristic, setCharacteristic] = useState('');
    const [identification, setIdentification] = useState('');
    const [accessMode, setAccessMode] = useState<'Pedestre' | 'Veículo' | ''>('');
    const [accessCategory, setAccessCategory] = useState<'Entrada' | 'Saída' | ''>('');
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
    const [showPrintView, setShowPrintView] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Search Filters
    const [searchStartDate, setSearchStartDate] = useState('');
    const [searchEndDate, setSearchEndDate] = useState('');
    const [activeQuickDate, setActiveQuickDate] = useState<number | null | undefined>(null);
    const [searchFilterType, setSearchFilterType] = useState<'all' | 'Pedestre' | 'Veículo'>('all');
    const [searchFilterCategory, setSearchFilterCategory] = useState<'all' | 'Entrada' | 'Saída'>('all');
    const [searchFilterCharacteristic, setSearchFilterCharacteristic] = useState<string>('all');
    const [searchFilterGate, setSearchFilterGate] = useState<string>('all');
    const [searchLimit, setSearchLimit] = useState(100);

    // Reseta o limite se os filtros mudarem
    useEffect(() => {
        setSearchLimit(100);
    }, [searchQuery, searchStartDate, searchEndDate, searchFilterType, searchFilterCategory, searchFilterCharacteristic, searchFilterGate]);

    const handleQuickDate = (days: number | null) => {
        setActiveQuickDate(days);
        if (days === null) {
            setSearchStartDate('');
            setSearchEndDate('');
            return;
        }
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        setSearchEndDate(end.toISOString().split('T')[0]);
        setSearchStartDate(start.toISOString().split('T')[0]);
    };

    const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
        setActiveQuickDate(undefined);
        if (type === 'start') setSearchStartDate(value);
        else setSearchEndDate(value);
    };

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

            const { data, error } = await query.limit(5); // Apenas o último registroé necessário para auto-fill

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
                const [year, month, day] = filterDate.split('-').map(Number);
                const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
                const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
                query = query.gte('timestamp', startOfDay).lte('timestamp', endOfDay);
            }

            if (filterGate) {
                query = query.eq('guard_gate', filterGate);
            }

            const { data, error } = await query.limit(3000);
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
                const [y, m, d] = searchStartDate.split('-').map(Number);
                query = query.gte('timestamp', new Date(y, m - 1, d, 0, 0, 0, 0).toISOString());
            }
            if (searchEndDate) {
                const [y, m, d] = searchEndDate.split('-').map(Number);
                query = query.lte('timestamp', new Date(y, m - 1, d, 23, 59, 59, 999).toISOString());
            }

            // Apply Type Filter
            if (searchFilterType !== 'all') {
                query = query.eq('access_mode', searchFilterType);
            }

            // Apply Category Filter
            if (searchFilterCategory !== 'all') {
                query = query.eq('access_category', searchFilterCategory);
            }

            // Apply Characteristic Filter
            if (searchFilterCharacteristic !== 'all') {
                query = query.eq('characteristic', searchFilterCharacteristic);
            }

            // Apply Gate Filter
            if (searchFilterGate !== 'all') {
                query = query.eq('guard_gate', searchFilterGate);
            }

            // Se o filtro rápido for 'HOJE' (0), puxa até 20.000 para não estourar o dia
            const limit = activeQuickDate === 0 ? 20000 : Math.min(searchLimit, 20000);
            const { data, error } = await query.limit(limit);

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
    }, [searchQuery, activeTab, searchStartDate, searchEndDate, searchFilterType, searchFilterCategory, searchFilterCharacteristic, searchFilterGate, searchLimit]);

    const handleSubmit = async () => {
        if (!selectedGate) {
            alert('Por favor, selecione o portão (G1, G2 ou G3).');
            return;
        }

        if (!accessCategory) {
            alert('Por favor, selecione se é Entrada ou Saída.');
            return;
        }

        if (!accessMode) {
            alert('Por favor, selecione se é Pedestre ou Veículo.');
            return;
        }

        if (!name.trim()) {
            alert('Informe o nome.');
            return;
        }

        if (!characteristic) {
            alert('Por favor, selecione a modalidade (MILITAR, CIVIL, etc).');
            return;
        }

        if (accessCategory === 'Entrada') {
            if (!destination.trim()) {
                alert('Por favor, informe o destino.');
                return;
            }
            if (!DESTINATIONS.includes(destination)) {
                alert('Por favor, selecione um destino válido da lista.');
                return;
            }

            // Validação de Autorizador para Prestador/Entregador
            if ((characteristic === 'PRESTADOR' || characteristic === 'ENTREGADOR') && !authorizer.trim()) {
                alert(`Para ${characteristic}, o campo AUTORIZADOR é obrigatório.`);
                return;
            }
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
            setCharacteristic('');
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
            <div className={`flex p-1 rounded-xl mb-4 ${dk ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                <button
                    onClick={() => setActiveTab('registrar')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'registrar'
                        ? (dk ? 'bg-slate-600 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm')
                        : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-600/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50')
                        }`}
                >
                    <List className="w-4 h-4" />
                    Registrar
                </button>
                <button
                    onClick={() => setActiveTab('estatisticas')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'estatisticas'
                        ? (dk ? 'bg-slate-600 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm')
                        : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-600/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50')
                        }`}
                >
                    <BarChart3 className="w-4 h-4" />
                    BI
                </button>
                <button
                    onClick={() => setActiveTab('busca')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'busca'
                        ? (dk ? 'bg-slate-600 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm')
                        : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-600/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50')
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
                    <div className={`glass-panel border-t-4 relative z-20 ${selectedGate === 'PORTÃO G1' ? 'border-t-blue-500' :
                        selectedGate === 'PORTÃO G2' ? 'border-t-emerald-500' :
                        selectedGate === 'PORTÃO G3' ? 'border-t-amber-500' : 'border-t-slate-300'
                        }`}>
                        {/* Header: Title + Gate Selectors */}
                        <div className={`p-3 border-b flex flex-wrap items-center justify-between gap-3 border-white/10 bg-black/10`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${selectedGate === 'PORTÃO G1' ? 'bg-blue-100 text-blue-600' :
                                    selectedGate === 'PORTÃO G2' ? 'bg-emerald-100 text-emerald-600' :
                                    selectedGate === 'PORTÃO G3' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                    <DoorOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className={`font-black text-sm uppercase tracking-wider ${dk ? 'text-white' : 'text-slate-800'}`}>
                                        Novo Registro
                                    </h3>
                                    <p className={`text-[10px] font-bold uppercase tracking-tight ${textMuted}`}>Registro de Entrada/Saída</p>
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
                                    className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-[10px] font-black uppercase transition-all shadow-sm active:scale-95 ${dk ? 'bg-slate-700 border-slate-600 text-blue-400 hover:bg-slate-600' : 'bg-white border-slate-200 text-blue-600 hover:bg-blue-50'}`}
                                >
                                    <Database className="w-3.5 h-3.5" /> Importar
                                </button>
                            </div>

                            {/* Gate Selectors - Compact & Inline */}
                            <div className={`flex p-1 rounded-xl w-full ${dk ? 'bg-slate-600/50' : 'bg-slate-200/50'}`}>
                                {GATES.map(gate => {
                                    const isSelected = selectedGate === gate;
                                    let activeClass = '';
                                    if (isSelected) {
                                        if (gate === 'PORTÃO G1') activeClass = 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-100 scale-[1.02]';
                                        else if (gate === 'PORTÃO G2') activeClass = 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-100 scale-[1.02]';
                                        else if (gate === 'PORTÃO G3') activeClass = 'bg-amber-600 text-white shadow-lg ring-2 ring-amber-100 scale-[1.02]';
                                    } else {
                                        activeClass = dk ? 'text-slate-400 hover:text-white hover:bg-slate-500/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/80';
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
                                <div className={`p-1 rounded-2xl flex ${dk ? 'bg-slate-600/50' : 'bg-slate-200'}`}>
                                    <button
                                        onClick={() => setAccessCategory('Entrada')}
                                        className={`flex-1 py-2 sm:py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase flex items-center justify-center gap-2 transition-all ${accessCategory === 'Entrada'
                                            ? 'bg-emerald-500 text-white shadow-lg scale-[1.02]'
                                            : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-500/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300/30')
                                            }`}
                                    >
                                        <ArrowDownToLine className="w-4 h-4" /> Entrada
                                    </button>
                                    <button
                                        onClick={() => setAccessCategory('Saída')}
                                        className={`flex-1 py-2 sm:py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase flex items-center justify-center gap-2 transition-all ${accessCategory === 'Saída'
                                            ? 'bg-red-500 text-white shadow-lg scale-[1.02]'
                                            : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-500/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300/30')
                                            }`}
                                    >
                                        <ArrowUpFromLine className="w-4 h-4" /> Saída
                                    </button>
                                </div>

                                {/* Access Mode Toggle */}
                                <div className={`p-1 rounded-2xl flex ${dk ? 'bg-slate-600/50' : 'bg-slate-200'}`}>
                                    <button
                                        onClick={() => setAccessMode('Pedestre')}
                                        className={`flex-1 py-2 sm:py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase flex items-center justify-center gap-2 transition-all ${accessMode === 'Pedestre'
                                            ? 'bg-slate-800 text-white shadow-lg scale-[1.02]'
                                            : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-500/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300/30')
                                            }`}
                                    >
                                        <Footprints className="w-4 h-4" /> Pedestre
                                    </button>
                                    <button
                                        onClick={() => setAccessMode('Veículo')}
                                        className={`flex-1 py-2 sm:py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase flex items-center justify-center gap-2 transition-all ${accessMode === 'Veículo'
                                            ? 'bg-violet-600 text-white shadow-lg scale-[1.02]'
                                            : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-500/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300/30')
                                            }`}
                                    >
                                        <Car className="w-4 h-4" /> Veículo
                                    </button>
                                </div>
                            </div>

                            {/* Row 2: Characteristic - Horizontal Scroll */}
                            <div className="overflow-x-auto pb-1 -mx-1 px-1">
                                <div className="flex gap-2">
                                    {CHARACTERISTICS.map(c => {
                                        let activeColor = 'bg-slate-800 text-white border-slate-800 shadow scale-[1.02]';
                                        if (c === 'MILITAR') activeColor = 'bg-blue-600 text-white border-blue-700 shadow-lg ring-2 ring-blue-500/30 scale-[1.02]';
                                        if (c === 'CIVIL') activeColor = 'bg-emerald-600 text-white border-emerald-700 shadow-lg ring-2 ring-emerald-500/30 scale-[1.02]';
                                        if (c === 'PRESTADOR') activeColor = 'bg-amber-600 text-white border-amber-700 shadow-lg ring-2 ring-amber-500/30 scale-[1.02]';
                                        if (c === 'ENTREGADOR') activeColor = 'bg-violet-600 text-white border-violet-700 shadow-lg ring-2 ring-violet-500/30 scale-[1.02]';

                                        return (
                                            <button
                                                key={c}
                                                onClick={() => setCharacteristic(c)}
                                                className={`whitespace-nowrap px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all border ${characteristic === c
                                                    ? activeColor
                                                    : (dk ? 'bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')
                                                    }`}
                                            >
                                                {c}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Row 3: Name + Identification */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="NOME COMPLETO"
                                    className={`w-full border rounded-xl p-2.5 sm:p-3.5 font-black text-sm outline-none uppercase transition-all focus:ring-4 ${inputCls}`}
                                    autoFocus
                                />
                                <div className="relative">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={identification}
                                        onChange={(e) => setIdentification(e.target.value.replace(/\D/g, ''))}
                                        placeholder="IDENTIFICAÇÃO (SARAM / CPF / RG)"
                                        className={`w-full border rounded-xl p-2.5 sm:p-3.5 font-black text-sm outline-none uppercase transition-all focus:ring-4 ${inputCls}`}
                                    />
                                    {identification && isFrequentVisitor && (
                                        <History className="absolute right-3 top-3.5 w-4 h-4 text-amber-500 animate-pulse" />
                                    )}
                                </div>
                            </div>

                            {/* Row 4: Vehicle Details (Conditional) */}
                            {accessMode === 'Veículo' && (
                                <div className={`grid grid-cols-2 gap-2 sm:gap-3 animate-fade-in p-1.5 sm:p-2 rounded-xl border ${dk ? 'bg-violet-900/20 border-violet-800/30' : 'bg-violet-50 border-violet-100'}`}>
                                    <input
                                        type="text"
                                        value={vehicleModel}
                                        onChange={(e) => setVehicleModel(e.target.value)}
                                        placeholder="MODELO"
                                        className={`w-full border rounded-lg p-2 font-bold text-xs outline-none uppercase ${dk ? 'bg-slate-700/60 border-violet-700/50 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/40' : 'bg-white border-violet-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400'}`}
                                    />
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={vehiclePlate}
                                            onChange={(e) => setVehiclePlate(e.target.value)}
                                            placeholder="PLACA"
                                            className={`w-full border rounded-lg p-2 font-bold text-xs outline-none uppercase ${dk ? 'bg-slate-700/60 border-violet-700/50 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/40' : 'bg-white border-violet-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400'}`}
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
                                        placeholder="DESTINO (OBRIGATÓRIO)"
                                        disabled={accessCategory === 'Saída'}
                                        isDarkMode={isDarkMode}
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={authorizer}
                                    onChange={(e) => setAuthorizer(e.target.value)}
                                    placeholder={(accessCategory === 'Entrada' && (characteristic === 'PRESTADOR' || characteristic === 'ENTREGADOR')) ? "AUTORIZADOR (OBRIGATÓRIO)" : "AUTORIZADOR"}
                                    disabled={accessCategory === 'Saída'}
                                    className={`w-full border rounded-xl p-2.5 sm:p-3 font-bold text-sm outline-none uppercase focus:ring-2 ${inputCls} ${accessCategory === 'Saída' ? 'opacity-40 cursor-not-allowed' : ''} ${(accessCategory === 'Entrada' && (characteristic === 'PRESTADOR' || characteristic === 'ENTREGADOR') && !authorizer.trim()) ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={
                                    submitting || 
                                    !name.trim() || 
                                    !selectedGate || 
                                    !accessCategory || 
                                    !accessMode ||
                                    (accessCategory === 'Entrada' && (characteristic === 'PRESTADOR' || characteristic === 'ENTREGADOR') && !authorizer.trim())
                                }
                                className={`w-full py-3.5 rounded-xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg border-b-4 active:border-b-0 active:translate-y-1 ${accessCategory === 'Entrada'
                                    ? 'bg-emerald-500 text-white border-emerald-700 hover:bg-emerald-600'
                                    : accessCategory === 'Saída' ? 'bg-red-500 text-white border-red-700 hover:bg-red-600'
                                    : 'bg-slate-500 text-white border-slate-700 hover:bg-slate-600'
                                    } disabled:opacity-40 disabled:cursor-not-allowed disabled:border-none`}
                            >
                                {submitting ? (
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        {accessCategory === 'Entrada' ? <ArrowDownToLine className="w-4 h-4" /> : accessCategory === 'Saída' ? <ArrowUpFromLine className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        CONFIRMAR {accessCategory === 'Entrada' ? 'ENTRADA' : accessCategory === 'Saída' ? 'SAÍDA' : 'REGISTRO'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* 1.5. Daily Summary (Restored) */}
                    <div className={`glass-panel overflow-hidden mb-4 p-0`}>
                        <button
                            onClick={() => setShowStats(!showStats)}
                            className={`flex-1 flex items-center justify-between p-2.5 transition-colors ${dk ? 'bg-slate-700/40 hover:bg-slate-700/60' : 'bg-slate-50 hover:bg-slate-100'}`}
                        >
                            <span className={`text-xs font-black uppercase flex items-center gap-2 ${textSecondary}`}>
                                <RefreshCw className="w-3.5 h-3.5" /> Resumo do Dia
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${dk ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>{(historyGateFilter ? records.filter(r => r.guard_gate === historyGateFilter) : records).length}</span>
                            </span>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                {/* Gate Filters - agora controlam AMBOS os containers */}
                                <div className="flex gap-1">
                                    {['', 'PORTÃO G1', 'PORTÃO G2', 'PORTÃO G3'].map(gate => {
                                        const label = gate ? gate.replace('PORTÃO ', '') : 'Todos';
                                        const isActive = historyGateFilter === gate;
                                        return (
                                            <button
                                                key={gate}
                                                onClick={() => setHistoryGateFilter(gate)}
                                                className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all ${isActive
                                                    ? (gate === 'PORTÃO G1' ? 'bg-blue-600 text-white' : gate === 'PORTÃO G2' ? 'bg-emerald-600 text-white' : gate === 'PORTÃO G3' ? 'bg-amber-600 text-white' : (dk ? 'bg-slate-500 text-white' : 'bg-slate-700 text-white'))
                                                    : (dk ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                                                    }`}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                                {showStats ? <ChevronUp className={`w-4 h-4 ${textMuted}`} /> : <ChevronDown className={`w-4 h-4 ${textMuted}`} />}
                            </div>
                        </button>

                        {showStats && (
                            <div className="p-2 grid grid-cols-2 sm:grid-cols-4 gap-2 animate-fade-in">
                                {/* Os cards filtram pelo portão selecionado */}
                                {(() => {
                                    const filtered = historyGateFilter ? records.filter(r => r.guard_gate === historyGateFilter) : records;
                                    return (
                                        <>
                                            <div className={`p-1.5 rounded-lg border text-center ${dk ? 'bg-emerald-900/20 border-emerald-800/30' : 'bg-emerald-50 border-emerald-100'}`}>
                                                <p className="text-[9px] font-bold text-emerald-600 uppercase">Entradas</p>
                                                <p className="text-base font-black text-emerald-700 leading-none mt-0.5">{filtered.filter(r => r.access_category === 'Entrada').length}</p>
                                            </div>
                                            <div className={`p-1.5 rounded-lg border text-center ${dk ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-100'}`}>
                                                <p className="text-[9px] font-bold text-red-600 uppercase">Saídas</p>
                                                <p className="text-base font-black text-red-700 leading-none mt-0.5">{filtered.filter(r => r.access_category === 'Saída').length}</p>
                                            </div>
                                            <div className={`p-1.5 rounded-lg border text-center relative overflow-hidden ${dk ? 'bg-blue-900/20 border-blue-800/30' : 'bg-blue-50 border-blue-100'}`}>
                                                <Footprints className={`absolute -right-1 -bottom-1 w-8 h-8 opacity-10 ${dk ? 'text-blue-400' : 'text-blue-600'}`} />
                                                <p className="text-[9px] font-bold text-blue-600 uppercase">Pedestres</p>
                                                <p className="text-base font-black text-blue-700 leading-none mt-0.5">{filtered.filter(r => r.access_mode === 'Pedestre').length}</p>
                                            </div>
                                            <div className={`p-1.5 rounded-lg border text-center relative overflow-hidden ${dk ? 'bg-violet-900/20 border-violet-800/30' : 'bg-violet-50 border-violet-100'}`}>
                                                <Car className={`absolute -right-1 -bottom-1 w-8 h-8 opacity-10 ${dk ? 'text-violet-400' : 'text-violet-600'}`} />
                                                <p className="text-[9px] font-bold text-violet-600 uppercase">Veículos</p>
                                                <p className="text-base font-black text-violet-700 leading-none mt-0.5">{filtered.filter(r => r.access_mode === 'Veículo').length}</p>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {/* 2. History List (Compact) */}
                    <div className={`glass-panel overflow-hidden p-0`}>
                        <div className={`p-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${dk ? 'border-slate-700' : 'border-slate-100'}`}>
                            <span className={`text-xs font-black uppercase flex items-center gap-2 ${textSecondary}`}>
                                <History className="w-3.5 h-3.5" /> Últimos Acessos (Hoje)
                            </span>
                            <div className={`flex gap-2 text-[10px] ${textMuted}`}>
                                <span>Entradas: {(historyGateFilter ? records.filter(r => r.guard_gate === historyGateFilter) : records).filter(r => r.access_category === 'Entrada').length}</span>
                                <span>Saídas: {(historyGateFilter ? records.filter(r => r.guard_gate === historyGateFilter) : records).filter(r => r.access_category === 'Saída').length}</span>
                                {historyGateFilter && (
                                    <span className={`font-bold ${dk ? 'text-blue-400' : 'text-blue-600'}`}>• {historyGateFilter.replace('PORTÃO ', '')}</span>
                                )}
                            </div>
                        </div>

                        {/* Compact Table */}
                        <div className="overflow-x-auto max-h-[300px]">
                            <table className="w-full text-left">
                                <thead className={`sticky top-0 shadow-sm z-10 ${dk ? 'bg-slate-700' : 'bg-slate-50'}`}>
                                    <tr>
                                        <th className={`px-3 py-2 text-[9px] font-black uppercase ${textMuted}`}>Hora</th>
                                        <th className={`px-3 py-2 text-[9px] font-black uppercase ${textMuted}`}>Local</th>
                                        <th className={`px-3 py-2 text-[9px] font-black uppercase ${textMuted}`}>Nome / Detalhes</th>
                                        <th className={`px-3 py-2 text-[9px] font-black uppercase text-right ${textMuted}`}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={4} className="text-center py-4 text-xs text-slate-400 italic">Carregando...</td></tr>
                                    ) : records.length === 0 ? (
                                        <tr><td colSpan={4} className="text-center py-4 text-xs text-slate-400 italic">Nenhum registro encontrado.</td></tr>
                                    ) : (
                                        (historyGateFilter ? records.filter(r => r.guard_gate === historyGateFilter) : records).map((record) => (
                                            <tr key={record.id} className={`border-b ${dk ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-slate-50 hover:bg-slate-50'}`}>
                                                <td className={`px-3 py-2 text-[10px] font-bold align-top ${textSecondary}`}>
                                                    {new Date(record.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className={`px-3 py-2 text-[10px] font-bold align-top ${textSecondary}`}>
                                                    {record.guard_gate.replace('PORTÃO ', '')}
                                                </td>
                                                <td className="px-3 py-2 align-top">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5">
                                                            {record.access_mode === 'Veículo' ? (
                                                                <Car className={`w-3 h-3 ${dk ? 'text-slate-500' : 'text-slate-400'}`} />
                                                            ) : (
                                                                <Footprints className={`w-3 h-3 ${dk ? 'text-slate-500' : 'text-slate-400'}`} />
                                                            )}
                                                            <span className={`text-xs font-bold ${textPrimary}`}>{record.name}</span>
                                                        </div>
                                                        <div className={`flex items-center gap-1 text-[9px] mt-0.5 ${textMuted}`}>
                                                            <span className="uppercase">{record.characteristic}</span>
                                                            {record.access_mode === 'Veículo' && (
                                                                <>• {record.vehicle_model} <span className="font-mono">{record.vehicle_plate}</span></>
                                                            )}
                                                        </div>
                                                        {record.destination && (
                                                            <span className="text-[9px] font-bold text-blue-600/80 uppercase mt-0.5">
                                                                {record.destination}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-right align-top">
                                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${record.access_category === 'Entrada'
                                                        ? (dk ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                                                        : (dk ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
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
                <AccessStatistics isDarkMode={isDarkMode} />
            )}

            {/* TAB CONTENT: BUSCA */}
            {activeTab === 'busca' && (
                <div className="space-y-4 animate-fade-in">
                    {/* Header Global c/ Filtros de Data */}
                    <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between mb-2">
                        <div>
                            <h2 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${textPrimary}`}>
                                <Search className="w-6 h-6 text-blue-600" />
                                Busca Avançada
                            </h2>
                            <p className={`text-sm ${textMuted}`}>Histórico de acesso e rastreamento de dados.</p>
                        </div>
                        
                        <div className={`flex flex-col sm:flex-row gap-2 p-1.5 rounded-xl border shadow-sm ${dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <div className="flex flex-wrap justify-center sm:justify-start gap-1 w-full sm:w-auto">
                                {([
                                    { label: 'Hoje', value: 0 },
                                    { label: '7 Dias', value: 7 },
                                    { label: '30 Dias', value: 30 },
                                    { label: 'Tudo', value: null }
                                ] as const).map(preset => (
                                    <button
                                        key={String(preset.value)}
                                        onClick={() => handleQuickDate(preset.value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-1 sm:flex-none text-center ${activeQuickDate === preset.value
                                            ? (dk ? 'bg-blue-900/40 text-blue-400 shadow-sm' : 'bg-blue-100 text-blue-700 shadow-sm')
                                            : (dk ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50')
                                            }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                            <div className={`w-px mx-1 hidden sm:block ${dk ? 'bg-slate-700' : 'bg-slate-200'}`} />
                            <div className="flex items-center justify-center sm:justify-start gap-2 px-2 pb-1 sm:pb-0">
                                <input
                                    type="date"
                                    value={searchStartDate}
                                    onChange={(e) => handleCustomDateChange('start', e.target.value)}
                                    className={`bg-transparent text-xs font-bold outline-none w-24 ${dk ? 'text-slate-200 color-scheme-dark' : 'text-slate-700'}`}
                                    style={{ colorScheme: dk ? 'dark' : 'normal' }}
                                />
                                <span className={`text-xs ${dk ? 'text-slate-500' : 'text-slate-300'}`}>à</span>
                                <input
                                    type="date"
                                    value={searchEndDate}
                                    onChange={(e) => handleCustomDateChange('end', e.target.value)}
                                    className={`bg-transparent text-xs font-bold outline-none w-24 ${dk ? 'text-slate-200 color-scheme-dark' : 'text-slate-700'}`}
                                    style={{ colorScheme: dk ? 'dark' : 'normal' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={`p-4 md:p-6 rounded-2xl shadow-sm border space-y-4 ${card}`}>
                        {/* Search Input */}
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="NOME, PLACA, MODELO, DOC OU DESTINO..."
                                className={`w-full pl-10 md:pl-12 pr-4 py-3 md:py-4 border rounded-xl font-bold text-sm md:text-lg outline-none transition-all uppercase focus:ring-4 ${inputCls}`}
                                autoFocus
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                            {loadingSearch && (
                                <RefreshCw className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />
                            )}
                        </div>

                        {/* Filters Panel */}
                        <div className="flex flex-col gap-3 pt-2">
                            <div className="flex flex-col md:flex-row gap-3 flex-wrap">
                                {/* Gate Filter */}
                                <div className={`flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 p-2 rounded-xl border ${dk ? 'bg-slate-700/40 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                                    <span className={`text-[10px] font-black uppercase pl-1 sm:pl-2 whitespace-nowrap ${textMuted}`}>Portão:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {(['all', 'PORTÃO G1', 'PORTÃO G2', 'PORTÃO G3'] as const).map(gate => {
                                            const label = gate === 'all' ? 'Todos' : gate.replace('PORTÃO ', '');
                                            return (
                                                <button
                                                    key={gate}
                                                    onClick={() => setSearchFilterGate(gate)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${searchFilterGate === gate
                                                        ? 'bg-violet-600 text-white shadow-sm'
                                                        : (dk ? 'bg-slate-600 text-slate-300 hover:bg-slate-500 border border-slate-500' : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200')
                                                        }`}
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Type Filter */}
                                <div className={`flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 p-2 rounded-xl border ${dk ? 'bg-slate-700/40 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                                    <span className={`text-[10px] font-black uppercase pl-1 sm:pl-2 whitespace-nowrap ${textMuted}`}>Tipo:</span>
                                <div className="flex flex-wrap gap-1">
                                {(['all', 'Pedestre', 'Veículo'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setSearchFilterType(type)}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${searchFilterType === type
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : (dk ? 'bg-slate-600 text-slate-300 hover:bg-slate-500 border border-slate-500' : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200')
                                            }`}
                                    >
                                        {type === 'all' ? 'Todos' : type}
                                    </button>
                                ))}
                                </div>
                            </div>

                        {/* Category Filters */}
                        <div className={`flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 p-2 rounded-xl border ${dk ? 'bg-slate-700/40 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                            <span className={`text-[10px] font-black uppercase pl-1 sm:pl-2 whitespace-nowrap ${textMuted}`}>Sentido:</span>
                            <div className="flex flex-wrap gap-1">
                                {(['all', 'Entrada', 'Saída'] as const).map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSearchFilterCategory(cat)}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${searchFilterCategory === cat
                                            ? (cat === 'Entrada' ? 'bg-emerald-600' : cat === 'Saída' ? 'bg-red-600' : 'bg-slate-800') + ' text-white shadow-sm'
                                            : (dk ? 'bg-slate-600 text-slate-300 hover:bg-slate-500 border border-slate-500' : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200')
                                            }`}
                                    >
                                        {cat === 'all' ? 'Todos' : cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Characteristic Filter */}
                        <div className={`flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 p-2 rounded-xl border ${dk ? 'bg-slate-700/40 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                            <span className={`text-[10px] font-black uppercase pl-1 sm:pl-2 whitespace-nowrap ${textMuted}`}>Característica:</span>
                            <div className="flex flex-wrap gap-1">
                                {(['all', 'CIVIL', 'MILITAR', 'PRESTADOR', 'ENTREGADOR'] as const).map(char => (
                                    <button
                                        key={char}
                                        onClick={() => setSearchFilterCharacteristic(char)}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${searchFilterCharacteristic === char
                                            ? 'bg-amber-600 text-white shadow-sm'
                                            : (dk ? 'bg-slate-600 text-slate-300 hover:bg-slate-500 border border-slate-500' : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200')
                                            }`}
                                    >
                                        {char === 'all' ? 'Todos' : char}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="ml-auto flex items-center mt-2 md:mt-0">
                            <button
                                onClick={() => setShowPrintView(true)}
                                disabled={searchResults.length === 0}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${dk ? 'bg-blue-900/40 border border-blue-800 text-blue-400 hover:bg-blue-800/60' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20'} ${searchResults.length > 0 && !dk ? 'animate-pulse ring-2 ring-blue-600/30' : ''}`}
                            >
                                <Printer className="w-4 h-4" /> 
                                Extrair Relatório
                            </button>
                        </div>

                        </div> {/* clse flex-col md:flex-row gap-3 */}
                    </div> {/* close Filters Panel */}
                    </div> {/* close card wrapper */}

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
                            <div className="space-y-4">
                                {/* Search Statistics */}
                                {searchResults.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 animate-in auto-rows-fr fade-in slide-in-from-top-4">
                                        <div className={`p-2.5 rounded-xl border flex flex-col justify-center items-center relative overflow-hidden ${dk ? 'bg-emerald-900/20 border-emerald-800/30' : 'bg-emerald-50 border-emerald-100'}`}>
                                            <p className="text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Entradas</p>
                                            <p className="text-xl sm:text-2xl font-black text-emerald-700 leading-none mt-1">{searchResults.filter(r => r.access_category === 'Entrada').length}</p>
                                        </div>
                                        <div className={`p-2.5 rounded-xl border flex flex-col justify-center items-center relative overflow-hidden ${dk ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-100'}`}>
                                            <p className="text-[9px] sm:text-[10px] font-bold text-red-600 uppercase tracking-widest">Saídas</p>
                                            <p className="text-xl sm:text-2xl font-black text-red-700 leading-none mt-1">{searchResults.filter(r => r.access_category === 'Saída').length}</p>
                                        </div>
                                        <div className={`p-2.5 rounded-xl border flex flex-col justify-center items-center relative overflow-hidden ${dk ? 'bg-blue-900/20 border-blue-800/30' : 'bg-blue-50 border-blue-100'}`}>
                                            <Footprints className={`absolute -right-1 -bottom-1 w-10 h-10 opacity-10 ${dk ? 'text-blue-400' : 'text-blue-600'}`} />
                                            <p className="text-[9px] sm:text-[10px] font-bold text-blue-600 uppercase tracking-widest">Pedestres</p>
                                            <p className="text-xl sm:text-2xl font-black text-blue-700 leading-none mt-1">{searchResults.filter(r => r.access_mode === 'Pedestre').length}</p>
                                        </div>
                                        <div className={`p-2.5 rounded-xl border flex flex-col justify-center items-center relative overflow-hidden ${dk ? 'bg-violet-900/20 border-violet-800/30' : 'bg-violet-50 border-violet-100'}`}>
                                            <Car className={`absolute -right-1 -bottom-1 w-10 h-10 opacity-10 ${dk ? 'text-violet-400' : 'text-violet-600'}`} />
                                            <p className="text-[9px] sm:text-[10px] font-bold text-violet-600 uppercase tracking-widest">Veículos</p>
                                            <p className="text-xl sm:text-2xl font-black text-violet-700 leading-none mt-1">{searchResults.filter(r => r.access_mode === 'Veículo').length}</p>
                                        </div>
                                    </div>
                                )}

                                <div className={`rounded-xl shadow-sm border overflow-hidden animate-in fade-in slide-in-from-bottom-4 ${card}`}>
                                    <div className={`p-3 border-b flex items-center justify-between ${dk ? 'border-slate-700' : 'border-slate-100'}`}>
                                    <span className={`text-xs font-black uppercase flex items-center gap-2 ${textSecondary}`}>
                                        <List className="w-3.5 h-3.5" /> Resultados Encontrados
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${dk ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                                        {searchResults.length} Registros
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className={`border-b ${dk ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
                                            <tr>
                                                <th className={`px-4 py-3 text-[9px] font-black uppercase ${textMuted}`}>Data / Hora</th>
                                                <th className={`px-4 py-3 text-[9px] font-black uppercase ${textMuted}`}>Local / Tipo</th>
                                                <th className={`px-4 py-3 text-[9px] font-black uppercase ${textMuted}`}>Solicitante / Veículo</th>
                                                <th className={`px-4 py-3 text-[9px] font-black uppercase text-right ${textMuted}`}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${dk ? 'divide-slate-700/50' : 'divide-slate-50'}`}>
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
                                                    <tr key={record.id} className={`transition-colors ${dk ? 'hover:bg-slate-700/30' : 'hover:bg-blue-50/30'}`}>
                                                        <td className="px-4 py-3 align-top">
                                                            <div className="flex flex-col">
                                                                <span className={`text-xs font-bold ${textPrimary}`}>
                                                                    {new Date(record.timestamp).toLocaleDateString('pt-BR')}
                                                                </span>
                                                                <span className={`text-[10px] font-medium flex items-center gap-1 ${textMuted}`}>
                                                                    <Clock className="w-3 h-3" />
                                                                    {new Date(record.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            <div className="flex flex-col">
                                                                <span className={`text-[10px] font-black uppercase ${dk ? 'text-slate-300' : 'text-slate-700'}`}>
                                                                    {record.guard_gate.replace('PORTÃO ', 'G')}
                                                                </span>
                                                                <span className={`text-[9px] font-bold uppercase mt-0.5 ${textMuted}`}>
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
                                                                <span className={`text-xs font-black uppercase ${textPrimary}`}>
                                                                    {record.name}
                                                                </span>
                                                                {record.access_mode === 'Veículo' && (
                                                                    <div className={`flex items-center gap-1.5 mt-1 w-fit px-1.5 py-0.5 rounded ${dk ? 'bg-slate-600' : 'bg-slate-100'}`}>
                                                                        <Car className={`w-3 h-3 ${textMuted}`} />
                                                                        <span className={`text-[10px] font-bold uppercase ${textSecondary}`}>
                                                                            {record.vehicle_model} • <span className={textPrimary}>{record.vehicle_plate}</span>
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
                                                                ? (dk ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                                                                : (dk ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
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

                                {searchResults.length >= searchLimit && searchLimit < 20000 && (
                                    <div className={`p-4 flex justify-center border-t ${dk ? 'border-slate-700' : 'border-slate-100'}`}>
                                        <button
                                            onClick={() => setSearchLimit(prev => prev + 500)}
                                            disabled={loadingSearch}
                                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all shadow-sm flex items-center gap-2 ${dk ? 'bg-slate-700 text-blue-400 hover:bg-slate-600' : 'bg-slate-100 text-blue-600 hover:bg-slate-200'}`}
                                        >
                                            {loadingSearch ? (
                                                <><RefreshCw className="w-4 h-4 animate-spin" /> Carregando...</>
                                            ) : (
                                                <><Database className="w-4 h-4" /> Carregar mais 500 registros</>
                                            )}
                                        </button>
                                    </div>
                                )}
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
                        <div className={`w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${dk ? 'bg-slate-800' : 'bg-white'}`}>
                            <div className={`p-4 border-b flex items-center justify-between ${dk ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
                                <h3 className={`font-black text-lg uppercase tracking-tight flex items-center gap-2 ${dk ? 'text-white' : 'text-slate-800'}`}>
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
                                <div className={`border rounded-xl p-4 text-sm space-y-2 ${dk ? 'bg-blue-900/20 border-blue-800/30 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
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
                                    className={`w-full h-96 p-4 font-mono text-xs border rounded-xl outline-none resize-none focus:ring-4 ${inputCls}`}
                                    autoFocus
                                />
                            </div>

                            <div className={`p-4 border-t flex justify-end gap-3 ${dk ? 'border-slate-700 bg-slate-700' : 'border-slate-100 bg-slate-50'}`}>
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className={`px-6 py-3 rounded-xl font-bold uppercase text-xs transition-all ${dk ? 'text-slate-300 hover:bg-slate-600' : 'text-slate-500 hover:bg-slate-200'}`}
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

            {showPrintView && (
                <AdvancedSearchPrintView
                    records={searchResults}
                    searchQuery={searchQuery}
                    startDate={searchStartDate}
                    endDate={searchEndDate}
                    onClose={() => setShowPrintView(false)}
                />
            )}
        </div>
    );
}
