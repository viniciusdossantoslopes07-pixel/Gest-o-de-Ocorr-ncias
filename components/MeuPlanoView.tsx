import React, { useState, useEffect, useMemo } from 'react';
import { User, MissionOrder } from '../types';
import { FileText, BarChart3, Download, Calendar, Shield, MapPin, Package, Filter, X, CheckCircle2 } from 'lucide-react';
import MissionRequestList from './MissionRequestList';
import { supabase } from '../services/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { jsPDF } from 'jspdf';

interface MeuPlanoViewProps {
    user: User;
    isDarkMode?: boolean;
}

export default function MeuPlanoView({ user, isDarkMode = false }: MeuPlanoViewProps) {
    const [activeTab, setActiveTab] = useState<'estatisticas' | 'solicitacoes'>('estatisticas');
    const [stats, setStats] = useState({
        totalMissions: 0,
        totalHours: 0,
        missionsByType: [] as any[],
        loansByCategory: [] as any[],
        recentMissions: [] as any[],
        loanHistory: 0,
        activeLoans: 0,
        attendanceHistory: [] as any[],
        attendanceRate: 0,
        attendanceByStatus: [] as any[]
    });
    const [loading, setLoading] = useState(false);
    const [allMissions, setAllMissions] = useState<any[]>([]);
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');
    const [filterType, setFilterType] = useState('');

    // Data for Requests Tab
    const [requests, setRequests] = useState<any[]>([]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    useEffect(() => {
        if (activeTab === 'estatisticas') {
            fetchPersonalStats();
        } else {
            fetchMyRequests();
        }
    }, [activeTab, user.id]);

    const fetchPersonalStats = async () => {
        setLoading(true);
        try {
            // 1. Fetch Mission Orders where user is in personnel AND status is CONCLUIDA
            const { data: missions, error: mError } = await supabase
                .from('mission_orders')
                .select('*')
                .eq('status', 'CONCLUIDA') // Only finalized missions
                .contains('personnel', `[{"saram": "${user.saram}"}]`) // Query JSONB array for user by SARAM
                .order('date', { ascending: false });

            if (mError) throw mError;
            setAllMissions(missions || []);

            // 2. Fetch Material Loans (History) with Material Category Join
            const { data: loans, error: lError } = await supabase
                .from('movimentacao_cautela')
                .select(`
                    id, 
                    status, 
                    quantidade,
                    gestao_estoque (
                        tipo_de_material
                    )
                `)
                .eq('id_usuario', user.id);

            if (lError) throw lError;

            // 3. Fetch Attendance Records for this militar (using SARAM)
            const { data: attendance, error: aError } = await supabase
                .from('attendance_records')
                .select(`
                    id,
                    status,
                    timestamp,
                    daily_attendance (
                        date,
                        call_type
                    )
                `)
                .eq('saram', user.saram)
                .order('timestamp', { ascending: false });

            if (aError) throw aError;

            // Process Initial Data (Full)
            processAndSetStats(missions || [], loans || [], attendance || []);

        } catch (error) {
            console.error('Error fetching personal stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const processAndSetStats = (missions: any[], loans: any[], attendance: any[]) => {
        const totalMissions = missions.length;
        const recentMissions = missions.slice(0, 5);

        // Group by Type
        const typeCount: Record<string, number> = {};
        missions.forEach((m: any) => {
            const type = m.mission || 'Outros';
            typeCount[type] = (typeCount[type] || 0) + 1;
        });
        const missionsByType = Object.entries(typeCount).map(([name, value]) => ({ name, value }));

        // Group Loans by Category
        const categoryCount: Record<string, number> = {};
        loans.forEach((l: any) => {
            const category = l.gestao_estoque?.tipo_de_material || 'Outros';
            categoryCount[category] = (categoryCount[category] || 0) + (l.quantidade || 1);
        });
        const loansByCategory = Object.entries(categoryCount)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const loanHistory = loans.length;
        const activeLoans = loans.filter((l: any) => l.status === 'Em Uso').reduce((acc: number, curr: any) => acc + (curr.quantidade || 1), 0);

        // Process Attendance
        const validAttendance = attendance.filter((a: any) => !['NIL', 'N'].includes(a.status));
        const totalAttendance = validAttendance.length;
        const presenceCount = validAttendance.filter((a: any) =>
            ['P', 'ESV', 'MIS', 'SV'].includes(a.status)
        ).length;
        const attendanceRate = totalAttendance > 0 ? (presenceCount / totalAttendance) * 100 : 0;

        const statusCount: Record<string, number> = {};
        validAttendance.forEach((a: any) => {
            const status = a.status || 'Outros';
            statusCount[status] = (statusCount[status] || 0) + 1;
        });
        const attendanceByStatus = Object.entries(statusCount).map(([name, value]) => ({ name, value }));

        setStats({
            totalMissions,
            totalHours: 0,
            missionsByType,
            loansByCategory,
            recentMissions,
            loanHistory,
            activeLoans,
            attendanceHistory: validAttendance,
            attendanceRate,
            attendanceByStatus
        });
    };

    // Derived filtered stats
    const filteredStats = useMemo(() => {
        const filtered = allMissions.filter(m => {
            const matchType = !filterType || m.mission === filterType;
            const mDate = new Date(m.date);
            const matchDateStart = !filterDateStart || mDate >= new Date(filterDateStart);
            const matchDateEnd = !filterDateEnd || mDate <= new Date(filterDateEnd);
            return matchType && matchDateStart && matchDateEnd;
        });

        // Re-calculate grouped data for charts and cards based on filtered set
        const typeCount: Record<string, number> = {};
        filtered.forEach((m: any) => {
            const type = m.mission || 'Outros';
            typeCount[type] = (typeCount[type] || 0) + 1;
        });
        const missionsByType = Object.entries(typeCount).map(([name, value]) => ({ name, value }));
        const recentMissions = filtered.slice(0, 5);

        // Filter Attendance
        const filteredAttendance = stats.attendanceHistory.filter(a => {
            const aDate = new Date(a.daily_attendance?.date || a.timestamp);
            const matchDateStart = !filterDateStart || aDate >= new Date(filterDateStart);
            const matchDateEnd = !filterDateEnd || aDate <= new Date(filterDateEnd);
            // Attendance history is already filtered for valid records in state, but let's be safe
            const isValid = !['NIL', 'N'].includes(a.status);
            return matchDateStart && matchDateEnd && isValid;
        });

        const fPresenceCount = filteredAttendance.filter((a: any) =>
            ['P', 'ESV', 'MIS', 'SV'].includes(a.status)
        ).length;
        const fAttendanceRate = filteredAttendance.length > 0 ? (fPresenceCount / filteredAttendance.length) * 100 : 0;

        const fStatusCount: Record<string, number> = {};
        filteredAttendance.forEach((a: any) => {
            const status = a.status || 'Outros';
            fStatusCount[status] = (fStatusCount[status] || 0) + 1;
        });
        const fAttendanceByStatus = Object.entries(fStatusCount).map(([name, value]) => ({ name, value }));

        return {
            totalMissions: filtered.length,
            missionsByType,
            recentMissions,
            attendanceRate: fAttendanceRate,
            attendanceByStatus: fAttendanceByStatus,
            attendanceHistory: filteredAttendance,
            allFiltered: filtered
        };
    }, [allMissions, filterType, filterDateStart, filterDateEnd, stats.attendanceHistory]);

    const missionTypes = useMemo(() => {
        const types = new Set<string>();
        allMissions.forEach(m => { if (m.mission) types.add(m.mission); });
        return Array.from(types).sort();
    }, [allMissions]);

    const clearFilters = () => {
        setFilterDateStart('');
        setFilterDateEnd('');
        setFilterType('');
    };

    const hasActiveFilters = filterDateStart || filterDateEnd || filterType;

    const fetchMyRequests = async () => {
        const { data } = await supabase
            .from('missoes_gsd')
            .select('*')
            .eq('solicitante_id', user.id)
            .order('data_criacao', { ascending: false });
        if (data) setRequests(data);
    };

    const generateReport = () => {
        const doc = new jsPDF();
        const missionsToPrint = hasActiveFilters ? filteredStats.allFiltered : allMissions;

        // Header
        doc.setFontSize(18);
        doc.text('Relatório Individual - GSD-SP', 20, 20);

        doc.setFontSize(12);
        doc.text(`Militar: ${user.rank} ${user.warName}`, 20, 30);
        doc.text(`ID Militar: ${user.militarId || 'N/A'}`, 20, 36);
        doc.text(`Saram: ${user.saram}`, 20, 42);
        doc.text(`Data: ${new Date().toLocaleDateString()}`, 20, 48);

        if (hasActiveFilters) {
            doc.setFontSize(10);
            doc.setTextColor(100);
            let filterText = 'Filtros aplicados: ';
            if (filterType) filterText += `Tipo: ${filterType} | `;
            if (filterDateStart || filterDateEnd) filterText += `Período: ${filterDateStart || '...'} a ${filterDateEnd || '...'}`;
            doc.text(filterText, 20, 54);
            doc.setTextColor(0);
        }

        doc.line(20, 56, 190, 56);

        // Stats Summary
        doc.setFontSize(14);
        doc.text('Resumo Operacional', 20, 65);

        doc.setFontSize(12);
        doc.text(`Total de Missões: ${hasActiveFilters ? filteredStats.totalMissions : stats.totalMissions}`, 20, 75);
        doc.text(`Assiduidade: ${(hasActiveFilters ? filteredStats.attendanceRate : stats.attendanceRate).toFixed(1)}%`, 20, 83);
        doc.text(`Cautelas Ativas: ${stats.activeLoans} itens`, 20, 91);
        doc.text(`Histórico de Cautelas: ${stats.loanHistory} registros`, 20, 99);

        // Recent Missions
        doc.setFontSize(14);
        doc.text(hasActiveFilters ? 'Missões Filtradas' : 'Últimas Missões', 20, 105);

        let y = 115;
        const listToRender = hasActiveFilters ? missionsToPrint.slice(0, 15) : stats.recentMissions;

        listToRender.forEach((m: any) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            doc.setFontSize(10);
            const date = new Date(m.date).toLocaleDateString();
            doc.text(`${date} - ${m.mission} (${m.omis_number})`, 20, y);
            y += 6;
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(`Local: ${m.location}`, 25, y);
            y += 8;
            doc.setTextColor(0);
        });

        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>

                {/* Header */}
                <div className={`p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <div>
                        <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Meu Plano
                        </h1>
                        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            ID Militar: <span className="font-bold">{user.militarId || 'N/A'}</span> | Painel pessoal de controle e estatísticas
                        </p>
                    </div>
                    {activeTab === 'estatisticas' && (
                        <button
                            onClick={generateReport}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Gerar Relatório PDF
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className={`flex gap-2 px-6 pt-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <button
                        onClick={() => setActiveTab('estatisticas')}
                        className={`flex items-center gap-2 px-4 py-3 font-bold text-sm rounded-t-xl transition-all ${activeTab === 'estatisticas'
                            ? isDarkMode
                                ? 'bg-slate-700 text-white border-b-2 border-blue-500'
                                : 'bg-slate-50 text-blue-600 border-b-2 border-blue-600'
                            : isDarkMode
                                ? 'text-slate-400 hover:text-slate-200'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        Estatísticas Pessoais
                    </button>

                    <button
                        onClick={() => setActiveTab('solicitacoes')}
                        className={`flex items-center gap-2 px-4 py-3 font-bold text-sm rounded-t-xl transition-all ${activeTab === 'solicitacoes'
                            ? isDarkMode
                                ? 'bg-slate-700 text-white border-b-2 border-blue-500'
                                : 'bg-slate-50 text-blue-600 border-b-2 border-blue-600'
                            : isDarkMode
                                ? 'text-slate-400 hover:text-slate-200'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Minhas Solicitações
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {activeTab === 'estatisticas' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Filter Bar */}
                            <div className={`p-4 rounded-2xl border flex flex-wrap items-center gap-4 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                                <div className={`flex items-center gap-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <Filter className="w-4 h-4 text-blue-500" />
                                    <span className="font-bold text-xs uppercase tracking-wider">Filtrar</span>
                                </div>

                                <div className={`flex flex-wrap items-center gap-3 bg-opacity-50 rounded-xl px-3 py-1.5 ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <input
                                        type="date"
                                        value={filterDateStart}
                                        onChange={(e) => setFilterDateStart(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-slate-500 outline-none w-28"
                                    />
                                    <span className="text-slate-400 text-xs">até</span>
                                    <input
                                        type="date"
                                        value={filterDateEnd}
                                        onChange={(e) => setFilterDateEnd(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-slate-500 outline-none w-28"
                                    />
                                </div>

                                <div className={`flex items-center gap-3 bg-opacity-50 rounded-xl px-3 py-1.5 flex-1 min-w-[150px] ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-slate-500 outline-none flex-1 appearance-none cursor-pointer"
                                    >
                                        <option value="">Todos os Tipos</option>
                                        {missionTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>

                                {hasActiveFilters && (
                                    <button
                                        onClick={clearFilters}
                                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                        title="Limpar Filtros"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <h3 className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Missões Cumpridas</h3>
                                    </div>
                                    <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{hasActiveFilters ? filteredStats.totalMissions : stats.totalMissions}</p>
                                    <p className="text-xs text-slate-500 mt-1">Participações em OMIS</p>
                                </div>

                                <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                            <Package className="w-5 h-5" />
                                        </div>
                                        <h3 className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Material em Uso</h3>
                                    </div>
                                    <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stats.activeLoans}</p>
                                    <p className="text-xs text-slate-500 mt-1">Itens cautelados atualmente</p>
                                </div>

                                <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <h3 className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Assiduidade</h3>
                                    </div>
                                    <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {(hasActiveFilters ? filteredStats.attendanceRate : stats.attendanceRate).toFixed(1)}%
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">Percentual de presença efetiva</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Chart */}
                                <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-slate-200'}`}>
                                    <h3 className={`font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Tipos de Missão {hasActiveFilters && '(Filtrado)'}</h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={hasActiveFilters ? filteredStats.missionsByType : stats.missionsByType}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {(hasActiveFilters ? filteredStats.missionsByType : stats.missionsByType).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* List */}
                                <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-slate-200'}`}>
                                    <h3 className={`font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {hasActiveFilters ? 'Missões no Período' : 'Últimas Missões'}
                                    </h3>
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                                        {(hasActiveFilters ? filteredStats.recentMissions : stats.recentMissions).map((mission: any) => (
                                            <div key={mission.id} className={`flex items-start gap-3 p-3 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                                <div className="mt-1 p-2 bg-blue-100 text-blue-600 rounded-lg flex-shrink-0">
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className={`font-bold text-sm truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                                        {mission.mission}
                                                        <span className="text-xs font-normal text-slate-500 ml-2">({mission.omis_number})</span>
                                                    </h4>
                                                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                                        <MapPin className="w-3 h-3" />
                                                        <span className="truncate">{mission.location}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-1">{new Date(mission.date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {(hasActiveFilters ? filteredStats.recentMissions : stats.recentMissions).length === 0 && (
                                            <p className="text-slate-500 text-sm italic py-4 text-center">Nenhuma missão encontrada com estes filtros.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Material Categories Chart */}
                                <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-slate-200'}`}>
                                    <h3 className={`font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Categorias de Materiais Cautelados</h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={stats.loansByCategory}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {stats.loansByCategory.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Attendance Status Chart */}
                                <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-slate-200'}`}>
                                    <h3 className={`font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Distribuição de Frequência</h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={hasActiveFilters ? filteredStats.attendanceByStatus : stats.attendanceByStatus}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {(hasActiveFilters ? filteredStats.attendanceByStatus : stats.attendanceByStatus).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Attendance List */}
                                <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-slate-200'}`}>
                                    <h3 className={`font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        Últimas Chamadas
                                    </h3>
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                                        {(hasActiveFilters ? filteredStats.attendanceHistory : stats.attendanceHistory).slice(0, 10).map((record: any) => (
                                            <div key={record.id} className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-8 rounded-full ${['P', 'ESV', 'MIS', 'SV'].includes(record.status) ? 'bg-emerald-500' : 'bg-red-500'
                                                        }`} />
                                                    <div>
                                                        <p className={`font-bold text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                                            {new Date(record.daily_attendance?.date || record.timestamp).toLocaleDateString()}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{record.daily_attendance?.call_type || 'Chamada'}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${['P', 'ESV', 'MIS', 'SV'].includes(record.status)
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {record.status}
                                                </span>
                                            </div>
                                        ))}
                                        {(hasActiveFilters ? filteredStats.attendanceHistory : stats.attendanceHistory).length === 0 && (
                                            <p className="text-slate-500 text-sm italic py-4 text-center">Nenhum registro de frequência encontrado.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'solicitacoes' && (
                        <div>
                            <MissionRequestList
                                missions={requests}
                                onProcess={async () => { }}
                                onGenerateOrder={async () => { }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
