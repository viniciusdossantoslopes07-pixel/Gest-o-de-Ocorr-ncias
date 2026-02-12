import React, { useState, useEffect } from 'react';
import { User, MissionOrder } from '../types';
import { FileText, BarChart3, Download, Calendar, Shield, MapPin, Package } from 'lucide-react';
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
        recentMissions: [] as any[],
        loanHistory: 0,
        activeLoans: 0
    });
    const [loading, setLoading] = useState(false);

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
            // 1. Fetch Mission Orders where user is in personnel
            const { data: missions, error: mError } = await supabase
                .from('mission_orders')
                .select('*')
                .contains('personnel', `[{"id": "${user.id}"}]`) // Query JSONB array for user
                .order('date', { ascending: false });

            if (mError) throw mError;

            // 2. Fetch Material Loans (History)
            const { data: loans, error: lError } = await supabase
                .from('movimentacao_cautela')
                .select('id, status, quantidade')
                .eq('id_usuario', user.id);

            if (lError) throw lError;

            // Process Data
            const totalMissions = missions?.length || 0;
            const recentMissions = missions?.slice(0, 5) || [];

            // Group by Type
            const typeCount: Record<string, number> = {};
            missions?.forEach((m: any) => {
                const type = m.mission || 'Outros';
                typeCount[type] = (typeCount[type] || 0) + 1;
            });
            const missionsByType = Object.entries(typeCount).map(([name, value]) => ({ name, value }));

            // Loans
            const loanHistory = loans?.length || 0;
            const activeLoans = loans?.filter((l: any) => l.status === 'Em Uso').reduce((acc: number, curr: any) => acc + (curr.quantidade || 1), 0) || 0;


            setStats({
                totalMissions,
                totalHours: 0, // Need accurate duration data for this, defaulting to 0 or could estimate
                missionsByType,
                recentMissions,
                loanHistory,
                activeLoans
            });

        } catch (error) {
            console.error('Error fetching personal stats:', error);
        } finally {
            setLoading(false);
        }
    };

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

        // Header
        doc.setFontSize(18);
        doc.text('Relatório Individual - GSD-SP', 20, 20);

        doc.setFontSize(12);
        doc.text(`Militar: ${user.rank} ${user.warName}`, 20, 30);
        doc.text(`Saram: ${user.saram}`, 20, 36);
        doc.text(`Data: ${new Date().toLocaleDateString()}`, 20, 42);

        doc.line(20, 48, 190, 48);

        // Stats Summary
        doc.setFontSize(14);
        doc.text('Resumo Operacional', 20, 60);

        doc.setFontSize(12);
        doc.text(`Total de Missões: ${stats.totalMissions}`, 20, 70);
        doc.text(`Cautelas Ativas: ${stats.activeLoans} itens`, 20, 78);
        doc.text(`Histórico de Cautelas: ${stats.loanHistory} registros`, 20, 86);

        // Recent Missions
        doc.setFontSize(14);
        doc.text('Últimas Missões', 20, 100);

        let y = 110;
        stats.recentMissions.forEach((m: any) => {
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

        doc.save(`Relatorio_${user.warName}_${new Date().toISOString().split('T')[0]}.pdf`);
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
                            Painel pessoal de controle e estatísticas
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
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <h3 className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Missões Cumpridas</h3>
                                    </div>
                                    <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stats.totalMissions}</p>
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
                                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <h3 className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Total de Cautelas</h3>
                                    </div>
                                    <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stats.loanHistory}</p>
                                    <p className="text-xs text-slate-500 mt-1">Histórico completo</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Chart */}
                                <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-slate-200'}`}>
                                    <h3 className={`font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Tipos de Missão</h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={stats.missionsByType}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {stats.missionsByType.map((entry, index) => (
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
                                    <h3 className={`font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Últimas Missões</h3>
                                    <div className="space-y-4">
                                        {stats.recentMissions.map((mission: any) => (
                                            <div key={mission.id} className={`flex items-start gap-3 p-3 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                                <div className="mt-1 p-2 bg-blue-100 text-blue-600 rounded-lg">
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h4 className={`font-bold text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                                        {mission.mission}
                                                        <span className="text-xs font-normal text-slate-500 ml-2">({mission.omis_number})</span>
                                                    </h4>
                                                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {mission.location}
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-1">{new Date(mission.date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {stats.recentMissions.length === 0 && (
                                            <p className="text-slate-500 text-sm italic">Nenhuma missão recente encontrada.</p>
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
