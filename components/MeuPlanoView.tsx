import React, { useState, useEffect, useMemo } from 'react';
import { User, MissionOrder } from '../types';
import { FileText, BarChart3, Download, Calendar, Shield, MapPin, Package, Filter, X, CheckCircle2, CarFront } from 'lucide-react';
import MissionRequestList from './MissionRequestList';
import { supabase } from '../services/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { jsPDF } from 'jspdf';
import PersonalReportPrintView from './PersonalReportPrintView';

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
        attendanceByStatus: [] as any[],
        activeVehicleLoans: 0,
        myVehicles: [] as any[]
    });
    const [loading, setLoading] = useState(false);
    const [allMissions, setAllMissions] = useState<any[]>([]);
    const [filterMonth, setFilterMonth] = useState('0'); // 0 = Todos
    const [filterYear, setFilterYear] = useState('');    // Vazio = Todos
    const [filterType, setFilterType] = useState('');
    const [showPrintView, setShowPrintView] = useState(false);
    const [personalSaram, setPersonalSaram] = useState<string>(() => {
        // Tenta recuperar o SARAM pessoal do localStorage para manter a sessão
        return localStorage.getItem('gsdsp_personal_saram') || '';
    });
    const [isEditingPersonalSaram, setIsEditingPersonalSaram] = useState(false);

    // Data for Requests Tab
    const [requests, setRequests] = useState<any[]>([]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    useEffect(() => {
        if (activeTab === 'estatisticas') {
            fetchPersonalStats();
        } else {
            fetchMyRequests();
        }
    }, [activeTab, user.id, personalSaram]);

    const fetchPersonalStats = async () => {
        setLoading(true);
        try {
            const userSaramStr = String(personalSaram || user.saram || '').trim();

            if (!userSaramStr) {
                setStats({ ...stats, totalMissions: 0, activeLoans: 0 });
                setLoading(false);
                return;
            }

            // 1. Determina o Target User ID (UUID) para Cautelas
            let targetUserId = user.id;
            if (userSaramStr !== user.saram) {
                const { data: userData, error: uError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('saram', userSaramStr)
                    .maybeSingle();

                if (userData) {
                    targetUserId = userData.id;
                } else if (uError) {
                    console.error('Error finding user by saram:', uError);
                }
            }

            // 2. Busca de dados em paralelo para melhor performance
            const [missionsRes, loansRes, attendanceRes] = await Promise.all([
                // Missões (OMIS)
                supabase
                    .from('mission_orders')
                    .select('*'),

                // Cautelas (Material em Uso)
                supabase
                    .from('movimentacao_cautela')
                    .select(`
                        id, 
                        status, 
                        quantidade,
                        gestao_estoque (
                            tipo_de_material
                        )
                    `)
                    .eq('id_usuario', targetUserId),

                // Assiduidade (Chamada) - limitada aos últimos 6 meses para não sobrecarregar o banco
                supabase
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
                    .eq('saram', userSaramStr)
                    .order('timestamp', { ascending: false })
                    .limit(500),
                    
                // Viaturas Cauteladas
                supabase
                    .from('vehicle_loans')
                    .select(`
                        id,
                        status,
                        departure_date,
                        vehicle:vehicles(reg_fab, model, plate, category, brand)
                    `)
                    .eq('driver_saram', userSaramStr)
                    .order('departure_date', { ascending: false })
            ]);

            // Verificação de erros individuais
            if (missionsRes.error) console.error('Missions error:', missionsRes.error);
            if (loansRes.error) console.error('Loans error:', loansRes.error);
            if (attendanceRes.error) console.error('Attendance error:', attendanceRes.error);
            if (vehiclesRes.error) console.error('Vehicles error:', vehiclesRes.error);

            // Filtramos as missões onde o usuário está no pessoal (via stringify para ser robusto)
            const userMissions = (missionsRes.data || []).filter(m => {
                try {
                    const personnelStr = JSON.stringify(m.personnel || []);
                    return personnelStr.includes(`"saram":"${userSaramStr}"`) ||
                        personnelStr.includes(`"saram":${userSaramStr}`) ||
                        personnelStr.includes(`"SARAM":"${userSaramStr}"`);
                } catch (e) {
                    return false;
                }
            });

            setAllMissions(userMissions);

            const missions = userMissions;
            const loans = loansRes.data || [];
            const attendance = attendanceRes.data || [];
            const vehicles = vehiclesRes.data || [];

            // 3. Process Initial Data (Full)
            processAndSetStats(missions, loans, attendance, vehicles);

        } catch (error) {
            console.error('Error fetching personal stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const processAndSetStats = (missions: any[], loans: any[], attendance: any[], vehicles: any[]) => {
        // Filtro de missões pendentes/concluídas (case insensitive e robusto)
        const concludedMissions = missions.filter(m => {
            const status = (m.status || '').toUpperCase().trim();
            return status === 'CONCLUIDA' ||
                status === 'CONCLUÍDA' ||
                status === 'FINALIZADA';
        });

        const totalMissions = concludedMissions.length;
        const recentMissions = missions.slice(0, 5);

        // Group by Type
        const typeCount: Record<string, number> = {};
        missions.forEach((m: any) => {
            const type = (m.mission || 'Outros').trim();
            typeCount[type] = (typeCount[type] || 0) + 1;
        });
        const missionsByType = Object.entries(typeCount).map(([name, value]) => ({ name, value }));

        // Group Loans by Category
        const categoryCount: Record<string, number> = {};
        loans.forEach((l: any) => {
            const category = (l.gestao_estoque?.tipo_de_material || 'Outros').trim();
            categoryCount[category] = (categoryCount[category] || 0) + (l.quantidade || 1);
        });
        const loansByCategory = Object.entries(categoryCount)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const loanHistory = loans.length;

        // Filtramos cautelas ativas com maior tolerância a variações de status
        const activeLoans = loans.filter((l: any) => {
            const status = (l.status || '').toUpperCase().trim();
            const isActive = ['EM USO', 'PENDENTE', 'RETIRADO', 'APROVADA', 'APROVADO'].includes(status);
            const isFinished = ['CONCLUIDO', 'CONCLUÍDO', 'DEVOLVIDO', 'REJEITADA', 'REJEITADO'].includes(status);
            return isActive && !isFinished;
        }).reduce((acc: number, curr: any) => acc + (curr.quantidade || 1), 0);

        // Process Attendance
        const validAttendance = attendance.filter((a: any) => {
            const status = (a.status || '').toUpperCase().trim();
            return !['NIL', 'N', 'NULL', ''].includes(status);
        });

        const totalAttendance = validAttendance.length;
        const presenceCount = validAttendance.filter((a: any) =>
            ['P', 'ESV', 'MIS', 'SV', 'PRESENÇA', 'PRESENCA'].includes((a.status || '').toUpperCase().trim())
        ).length;

        const attendanceRate = totalAttendance > 0 ? (presenceCount / totalAttendance) * 100 : 0;

        const statusCount: Record<string, number> = {};
        validAttendance.forEach((a: any) => {
            const status = (a.status || 'Outros').trim().toUpperCase();
            statusCount[status] = (statusCount[status] || 0) + 1;
        });
        const attendanceByStatus = Object.entries(statusCount).map(([name, value]) => ({ name, value }));

        // Process Vehicles
        const activeVehicles = vehicles.filter((v: any) => v.status === 'Em Uso');
        const activeVehicleLoans = activeVehicles.length;

        setStats({
            totalMissions, //KPI de missões FINALIZADAS
            totalHours: 0,
            missionsByType,
            loansByCategory,
            recentMissions,
            loanHistory,
            activeLoans,
            attendanceHistory: attendance, // Guardamos todos para filtros posteriores
            attendanceRate,
            attendanceByStatus,
            activeVehicleLoans,
            myVehicles: vehicles // Guardar histórico ou ativas
        });
    };

    // Derived filtered stats
    const filteredStats = useMemo(() => {
        const filtered = allMissions.filter(m => {
            const matchType = !filterType || m.mission === filterType;

            // Corrige o bug de Timezone extraindo a data
            const rawDate = m.date || '';
            const datePart = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0];

            if (!datePart.includes('-')) return false;

            const [y, mm] = datePart.split('-');
            const mYear = y;
            const mMonth = parseInt(mm, 10).toString();

            const matchYear = !filterYear || mYear === filterYear;
            const matchMonth = filterMonth === '0' || mMonth === filterMonth;

            return matchType && matchYear && matchMonth;
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
            const rawDate = a.daily_attendance?.date || a.timestamp || '';
            const datePart = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0];

            if (!datePart.includes('-')) return false;

            const [y, mm] = datePart.split('-');
            const aYear = y;
            const aMonth = parseInt(mm, 10).toString();

            const matchYear = !filterYear || aYear === filterYear;
            const matchMonth = filterMonth === '0' || aMonth === filterMonth;

            const status = (a.status || '').toUpperCase().trim();
            const isValid = !['NIL', 'N', 'NULL', ''].includes(status);

            return matchYear && matchMonth && isValid;
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

        const filteredMissionsCount = filtered.filter(m => {
            const status = (m.status || '').toUpperCase().trim();
            return status === 'CONCLUIDA' ||
                status === 'CONCLUÍDA' ||
                status === 'FINALIZADA';
        }).length;

        return {
            totalMissions: filteredMissionsCount,
            missionsByType,
            recentMissions,
            attendanceRate: fAttendanceRate,
            attendanceByStatus: fAttendanceByStatus,
            attendanceHistory: filteredAttendance,
            allFiltered: filtered,
            // Viaturas geralmente não são filtradas por mês da mesma forma na visão geral rápida
            activeVehicleLoans: stats.activeVehicleLoans,
            myVehicles: stats.myVehicles
        };
    }, [allMissions, filterType, filterMonth, filterYear, stats.attendanceHistory]);

    const missionTypes = useMemo(() => {
        const types = new Set<string>();
        allMissions.forEach(m => { if (m.mission) types.add(m.mission); });
        return Array.from(types).sort();
    }, [allMissions]);

    // Extrair listagem de Anos Dinâmica com base nas estatísticas reais
    const availableYears = useMemo(() => {
        const years = new Set<string>();
        allMissions.forEach(m => {
            if (m.date) {
                const rawDate = m.date || '';
                const datePart = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0];
                if (datePart.includes('-')) years.add(datePart.split('-')[0]);
            }
        });
        stats.attendanceHistory.forEach(a => {
            const rawDate = a.daily_attendance?.date || a.timestamp;
            if (rawDate) years.add(rawDate.split('-')[0]);
        });
        // Add current year if empty
        const currentYear = new Date().getFullYear().toString();
        years.add(currentYear);
        return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
    }, [allMissions, stats.attendanceHistory]);

    const clearFilters = () => {
        setFilterMonth('0');
        setFilterYear('');
        setFilterType('');
    };

    const hasActiveFilters = filterMonth !== '0' || filterYear !== '' || filterType !== '';

    const fetchMyRequests = async () => {
        const { data } = await supabase
            .from('missoes_gsd')
            .select('*')
            .eq('solicitante_id', user.id)
            .order('data_criacao', { ascending: false });
        if (data) setRequests(data);
    };

    const generateReport = () => {
        setShowPrintView(true);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className={`rounded-3xl border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-slate-900/90 border-slate-700/50 backdrop-blur-xl' : 'bg-white border-slate-200'}`}>

                {/* Header Premium com Gradiente */}
                <div className={`relative p-8 md:p-10 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'} overflow-hidden`}>
                    {/* Efeito luminoso de fundo */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
                    
                    <div className="relative z-10">
                        <h1 className={`text-4xl md:text-5xl font-black tracking-tight ${isDarkMode ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent'}`}>
                            Painel Individual
                        </h1>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-3">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isDarkMode ? 'bg-slate-800/80 border border-slate-700/50' : 'bg-slate-50 border border-slate-200'}`}>
                                <p className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Saram:
                                </p>
                            {isEditingPersonalSaram ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        autoFocus
                                        type="text"
                                        maxLength={7}
                                        placeholder="Digite seu SARAM"
                                        className={`px-2 py-1 text-xs font-bold border rounded outline-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-300'}`}
                                        value={personalSaram}
                                        onChange={(e) => setPersonalSaram(e.target.value.replace(/\D/g, ''))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                localStorage.setItem('gsdsp_personal_saram', personalSaram);
                                                setIsEditingPersonalSaram(false);
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            localStorage.setItem('gsdsp_personal_saram', personalSaram);
                                            setIsEditingPersonalSaram(false);
                                        }}
                                        className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase"
                                    >
                                        Vincular
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-black ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                        {personalSaram || user.saram || 'Não Informado'}
                                    </span>
                                    <button
                                        onClick={() => setIsEditingPersonalSaram(true)}
                                        className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}
                                        title="Alterar SARAM para visualização pessoal"
                                    >
                                        <Filter className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                            </div>
                            <span className="hidden sm:inline text-slate-300 dark:text-slate-600 font-light">|</span>
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isDarkMode ? 'bg-slate-800/80 border border-slate-700/50' : 'bg-slate-50 border border-slate-200'}`}>
                                <p className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    ID: <span className={isDarkMode ? 'text-blue-300' : 'text-blue-600'}>{user.militarId || 'FNC'}</span>
                                </p>
                            </div>
                        </div>
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

                {/* Tabs Estilo Premium Pílula */}
                <div className={`flex items-center gap-3 px-6 md:px-10 pt-6 pb-2 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <button
                        onClick={() => setActiveTab('estatisticas')}
                        className={`flex items-center gap-2.5 px-6 py-2.5 font-bold text-sm rounded-full transition-all duration-300 ${activeTab === 'estatisticas'
                            ? isDarkMode
                                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                                : 'bg-blue-600 text-white shadow-md'
                            : isDarkMode
                                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        Estatísticas Pessoais
                    </button>

                    <button
                        onClick={() => setActiveTab('solicitacoes')}
                        className={`flex items-center gap-2.5 px-6 py-2.5 font-bold text-sm rounded-full transition-all duration-300 ${activeTab === 'solicitacoes'
                            ? isDarkMode
                                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                                : 'bg-blue-600 text-white shadow-md'
                            : isDarkMode
                                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Minhas Solicitações
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 md:p-10">
                    {activeTab === 'estatisticas' && (
                        <div className="space-y-8 animate-fade-in">
                            {/* Filter Bar Premium */}
                            <div className={`p-4 rounded-2xl flex flex-wrap items-center gap-4 ${isDarkMode ? 'bg-slate-800/60 border border-slate-700/50 backdrop-blur-md shadow-sm' : 'bg-slate-50/80 border border-slate-200 backdrop-blur-md shadow-sm'}`}>
                                <div className={`flex items-center gap-2 pl-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                        <Filter className="w-4 h-4" />
                                    </div>
                                    <span className="font-bold text-xs uppercase tracking-widest">Filtros</span>
                                </div>

                                <div className={`flex flex-wrap items-center gap-3 rounded-xl px-4 py-2 ${isDarkMode ? 'bg-slate-900/50 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <select
                                        value={filterMonth}
                                        onChange={(e) => setFilterMonth(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-slate-500 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="0">Qualquer Mês</option>
                                        <option value="1">Janeiro</option>
                                        <option value="2">Fevereiro</option>
                                        <option value="3">Março</option>
                                        <option value="4">Abril</option>
                                        <option value="5">Maio</option>
                                        <option value="6">Junho</option>
                                        <option value="7">Julho</option>
                                        <option value="8">Agosto</option>
                                        <option value="9">Setembro</option>
                                        <option value="10">Outubro</option>
                                        <option value="11">Novembro</option>
                                        <option value="12">Dezembro</option>
                                    </select>

                                    <span className="text-slate-300">/</span>

                                    <select
                                        value={filterYear}
                                        onChange={(e) => setFilterYear(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-slate-500 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">Qualquer Ano</option>
                                        {availableYears.map(yr => (
                                            <option key={yr} value={yr}>{yr}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className={`flex items-center gap-3 rounded-xl px-4 py-2 flex-1 min-w-[200px] ${isDarkMode ? 'bg-slate-900/50 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
                                    <Shield className="w-4 h-4 text-slate-400" />
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        className="bg-transparent text-sm font-bold text-slate-500 outline-none flex-1 appearance-none cursor-pointer"
                                    >
                                        <option value="">Todos os Tipos de Missão</option>
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

                            {/* Stats Grid Premium */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className={`relative overflow-hidden p-6 rounded-3xl border transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50 shadow-lg' : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-md'}`}>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                                                <Shield className="w-5 h-5" />
                                            </div>
                                            <h3 className={`font-black text-sm uppercase tracking-wide ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Missões Cumpridas</h3>
                                        </div>
                                        <p className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{hasActiveFilters ? filteredStats.totalMissions : stats.totalMissions}</p>
                                        <p className="text-[10px] uppercase font-bold text-slate-500 mt-2 tracking-wider">Participações em OMIS</p>
                                    </div>
                                    <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
                                </div>

                                <div className={`relative overflow-hidden p-6 rounded-3xl border transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50 shadow-lg' : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-md'}`}>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <h3 className={`font-black text-sm uppercase tracking-wide ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Material em Uso</h3>
                                        </div>
                                        <p className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stats.activeLoans}</p>
                                        <p className="text-[10px] uppercase font-bold text-slate-500 mt-2 tracking-wider">Itens Cautelados Atualmente</p>
                                    </div>
                                    <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                                </div>

                                <div className={`relative overflow-hidden p-6 rounded-3xl border transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50 shadow-lg' : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-md'}`}>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
                                                <CarFront className="w-5 h-5" />
                                            </div>
                                            <h3 className={`font-black text-sm uppercase tracking-wide ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Viaturas (VTR)</h3>
                                        </div>
                                        <p className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stats.activeVehicleLoans}</p>
                                        <p className="text-[10px] uppercase font-bold text-slate-500 mt-2 tracking-wider">VTRs sob sua Cautela</p>
                                    </div>
                                    <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
                                </div>

                                <div className={`relative overflow-hidden p-6 rounded-3xl border transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50 shadow-lg' : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-md'}`}>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                            <h3 className={`font-black text-sm uppercase tracking-wide ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Assiduidade</h3>
                                        </div>
                                        <p className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {(hasActiveFilters ? filteredStats.attendanceRate : stats.attendanceRate).toFixed(1)}<span className="text-2xl text-slate-500">%</span>
                                        </p>
                                        <p className="text-[10px] uppercase font-bold text-slate-500 mt-2 tracking-wider">Presença Efetiva</p>
                                    </div>
                                    <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Chart */}
                                <div className={`p-8 rounded-3xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <h3 className={`font-black uppercase tracking-widest text-sm mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Tipos de Missão {hasActiveFilters && '(Filtrado)'}</h3>
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
                                <div className={`p-8 rounded-3xl border flex flex-col ${isDarkMode ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <h3 className={`font-black uppercase tracking-widest text-sm mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {hasActiveFilters ? 'Missões no Período' : 'Últimas Missões'}
                                    </h3>
                                    <div className="space-y-3 flex-1 overflow-y-auto pr-2 min-h-[300px]">
                                        {(hasActiveFilters ? filteredStats.recentMissions : stats.recentMissions).map((mission: any) => (
                                            <div key={mission.id} className={`flex items-start gap-4 p-4 rounded-2xl transition-colors hover:bg-opacity-80 ${isDarkMode ? 'bg-slate-900/50 border border-slate-800' : 'bg-slate-50 border border-slate-100'}`}>
                                                <div className="mt-0.5 p-2.5 bg-blue-500/10 text-blue-500 rounded-xl flex-shrink-0 shadow-inner">
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className={`font-black text-sm truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                                        {mission.mission}
                                                        <span className="text-xs font-bold text-slate-500 ml-2">#{mission.omis_number}</span>
                                                    </h4>
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mt-1.5">
                                                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                        <span className="truncate">{mission.location}</span>
                                                    </div>
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1.5">{new Date(mission.date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {(hasActiveFilters ? filteredStats.recentMissions : stats.recentMissions).length === 0 && (
                                            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                                                <div className={`p-4 rounded-full mb-3 ${isDarkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>
                                                    <FileText className="w-6 h-6" />
                                                </div>
                                                <p className="text-slate-500 text-sm font-bold">Nenhuma missão no período.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Viaturas Cauteladas */}
                                <div className={`p-8 rounded-3xl border flex flex-col ${isDarkMode ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <h3 className={`font-black uppercase tracking-widest text-sm mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        Minhas Viaturas Cauteladas
                                    </h3>
                                    <div className="space-y-3 flex-1 overflow-y-auto pr-2 min-h-[300px]">
                                        {stats.myVehicles.filter((l: any) => l.status === 'Em Uso').map((loan: any) => (
                                            <div key={loan.id} className={`flex items-start gap-4 p-4 rounded-2xl transition-colors hover:bg-opacity-80 ${isDarkMode ? 'bg-slate-900/50 border border-slate-800' : 'bg-slate-50 border border-slate-100'}`}>
                                                <div className="mt-0.5 p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl flex-shrink-0 shadow-inner">
                                                    <CarFront className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className={`font-black text-sm truncate flex items-center justify-between ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                                        {loan.vehicle?.brand} {loan.vehicle?.model}
                                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500">
                                                            {loan.status}
                                                        </span>
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className={`px-2 py-1 rounded text-xs font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-white text-slate-700 border border-slate-200 shadow-sm'}`}>
                                                            {loan.vehicle?.plate || 'SEM PLACA'}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-500">Reg: {loan.vehicle?.reg_fab}</span>
                                                    </div>
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-2">
                                                        Cautelada em: {new Date(loan.departure_date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {stats.myVehicles.filter((l: any) => l.status === 'Em Uso').length === 0 && (
                                            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                                                <div className={`p-4 rounded-full mb-3 ${isDarkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>
                                                    <CarFront className="w-6 h-6" />
                                                </div>
                                                <p className="text-slate-500 text-sm font-bold">Nenhuma viatura sob sua cautela no momento.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Material Categories Chart */}
                                <div className={`p-8 rounded-3xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <h3 className={`font-black uppercase tracking-widest text-sm mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Categorias Cauteladas (MatBel)</h3>
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
                                <div className={`p-8 rounded-3xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <h3 className={`font-black uppercase tracking-widest text-sm mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Distribuição de Frequência</h3>
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
                                <div className={`p-8 rounded-3xl border flex flex-col md:col-span-2 lg:col-span-1 ${isDarkMode ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <h3 className={`font-black uppercase tracking-widest text-sm mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        Últimas Chamadas
                                    </h3>
                                    <div className="space-y-3 flex-1 overflow-y-auto pr-2 max-h-[300px]">
                                        {(hasActiveFilters ? filteredStats.attendanceHistory : stats.attendanceHistory).slice(0, 10).map((record: any) => (
                                            <div key={record.id} className={`flex items-center justify-between p-4 rounded-2xl transition-colors hover:bg-opacity-80 ${isDarkMode ? 'bg-slate-900/50 border border-slate-800' : 'bg-slate-50 border border-slate-100'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-1.5 h-10 rounded-full ${['P', 'ESV', 'MIS', 'SV'].includes(record.status) ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                                                        }`} />
                                                    <div>
                                                        <p className={`font-black text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                                            {new Date(record.daily_attendance?.date || record.timestamp).toLocaleDateString()}
                                                        </p>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{record.daily_attendance?.call_type || 'Chamada'}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest ${['P', 'ESV', 'MIS', 'SV'].includes(record.status)
                                                    ? 'bg-emerald-500/10 text-emerald-500'
                                                    : 'bg-red-500/10 text-red-500'
                                                    }`}>
                                                    {record.status}
                                                </span>
                                            </div>
                                        ))}
                                        {(hasActiveFilters ? filteredStats.attendanceHistory : stats.attendanceHistory).length === 0 && (
                                            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                                                <p className="text-slate-500 text-sm font-bold">Nenhum registro de frequência no período.</p>
                                            </div>
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
                                currentUser={user}
                                onMissionUpdated={fetchMyRequests}
                                onDelete={fetchMyRequests}
                                isDarkMode={isDarkMode}
                            />
                        </div>
                    )}
                </div>
            </div>

            {showPrintView && (
                <PersonalReportPrintView
                    user={user}
                    stats={stats}
                    filteredStats={filteredStats}
                    hasActiveFilters={!!hasActiveFilters}
                    onClose={() => setShowPrintView(false)}
                    om={user.om}
                />
            )}
        </div>
    );
}
