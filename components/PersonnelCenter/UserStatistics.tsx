import React, { useMemo } from 'react';
import { User } from '../../types';
import { useSectors } from '../../contexts/SectorsContext';
import { BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { RANKS } from '../../constants';

interface UserStatisticsProps {
    users: User[]; // Já virão filtrados inteligentemente
    isDarkMode: boolean;
    activeUnitFilter: 'TODAS' | 'GSD-SP' | 'BASP';
}

const UserStatistics: React.FC<UserStatisticsProps> = ({ users, isDarkMode, activeUnitFilter }) => {
    const { sectors } = useSectors();

    // Filtra apenas o pessoal ativo e não funcional para as estatísticas
    const statsUsers = useMemo(() => users.filter(u => u.active !== false && !u.is_functional), [users]);

    // Estatísticas por Posto/Graduação
    const rankStats = useMemo(() => {
        const counts: Record<string, number> = {};
        RANKS.forEach(r => counts[r] = 0);
        statsUsers.forEach(u => {
            if (u.rank && counts[u.rank] !== undefined) {
                counts[u.rank]++;
            }
        });
        return RANKS.map(rank => ({
            rank,
            count: counts[rank]
        })).filter(item => item.count > 0);
    }, [statsUsers]);

    const maxRankCount = Math.max(...rankStats.map(s => s.count), 1);

    // Estatísticas por Unidade (só mostra se a visualização for TODAS)
    const unitStats = useMemo(() => {
        let gsd = 0;
        let basp = 0;
        statsUsers.forEach(u => {
            const sectorObj = sectors.find(s => s.name === u.sector);
            if (sectorObj?.unit === 'BASP') basp++;
            else gsd++; 
        });
        return { gsd, basp, total: gsd + basp };
    }, [statsUsers, sectors]);

    // Setores com maior efetivo (Top 5)
    const topSectors = useMemo(() => {
        const counts: Record<string, number> = {};
        statsUsers.forEach(u => {
            if (u.sector && u.sector !== 'SEM SETOR') {
                counts[u.sector] = (counts[u.sector] || 0) + 1;
            }
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));
    }, [statsUsers]);

    const maxTopSectorCount = Math.max(...topSectors.map(s => s.count), 1);

    return (
        <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`grid grid-cols-1 ${activeUnitFilter === 'TODAS' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-6`}>
                
                {/* Efetivo por Unidade (Exibido apenas na visão global) */}
                {activeUnitFilter === 'TODAS' && (
                    <div className={`p-6 md:p-8 rounded-[2rem] border shadow-sm ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-100'}`}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                <PieChartIcon className="w-5 h-5" />
                            </div>
                            <h3 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Composição por Unidade</h3>
                        </div>
                        
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-4 h-4 rounded-full bg-blue-500" />
                                <div>
                                    <p className={`text-[10px] font-bold tracking-widest uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>GSD-SP</p>
                                    <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{unitStats.gsd}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold text-blue-500">{Math.round((unitStats.gsd / Math.max(unitStats.total, 1)) * 100)}%</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-4 h-4 rounded-full bg-emerald-500" />
                                <div>
                                    <p className={`text-[10px] font-bold tracking-widest uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>BASP</p>
                                    <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{unitStats.basp}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold text-emerald-500">{Math.round((unitStats.basp / Math.max(unitStats.total, 1)) * 100)}%</p>
                            </div>
                        </div>

                        <div className="w-full h-3 mt-6 flex rounded-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                            <div style={{ width: `${(unitStats.gsd / Math.max(unitStats.total, 1)) * 100}%` }} className="h-full bg-blue-500 transition-all duration-1000" />
                            <div style={{ width: `${(unitStats.basp / Math.max(unitStats.total, 1)) * 100}%` }} className="h-full bg-emerald-500 transition-all duration-1000" />
                        </div>
                    </div>
                )}

                {/* Top Setores */}
                <div className={`p-6 md:p-8 rounded-[2rem] border shadow-sm ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <h3 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Maiores Setores ({activeUnitFilter})</h3>
                    </div>

                    <div className="space-y-4">
                        {topSectors.map((sector, index) => (
                            <div key={sector.name} className="relative">
                                <div className="flex justify-between items-end mb-1 relative z-10 px-1">
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        {index + 1}. {sector.name}
                                    </span>
                                    <span className={`text-xs font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                                        {sector.count} <span className="text-[9px] text-slate-500">mil</span>
                                    </span>
                                </div>
                                <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${isDarkMode ? 'bg-amber-500/80' : 'bg-amber-500'}`}
                                        style={{ width: `${(sector.count / maxTopSectorCount) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        {topSectors.length === 0 && (
                            <p className="text-center text-slate-500 text-xs py-4">Nenhum dado cadastrado.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Grafico de Hierarquia (Barras) */}
            <div className={`p-6 md:p-8 rounded-[2rem] border shadow-sm ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center gap-3 mb-10">
                    <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Pirâmide Hierárquica</h3>
                        <p className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Distribuição completa do efetivo por postos e graduações</p>
                    </div>
                </div>

                <div className="h-48 md:h-64 flex items-end gap-2 md:gap-4 pb-4 overflow-x-auto custom-scrollbar px-2">
                    {rankStats.map((stat) => (
                        <div key={stat.rank} className="flex-1 min-w-[30px] flex flex-col items-center justify-end gap-2 group">
                            <span className={`text-xs font-bold transition-all ${isDarkMode ? 'text-blue-400 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0' : 'text-blue-600 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'}`}>
                                {stat.count}
                            </span>
                            <div 
                                className={`w-full max-w-[40px] rounded-t-xl transition-all duration-1000 ease-out group-hover:brightness-110 ${isDarkMode ? 'bg-gradient-to-t from-blue-900/50 to-blue-500/80 border-t-2 border-blue-400/50' : 'bg-gradient-to-t from-blue-100 to-blue-500 border-t-2 border-blue-600'}`}
                                style={{ height: `${(stat.count / maxRankCount) * 100}%`, minHeight: '4px' }}
                            />
                            <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-tighter ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {stat.rank}
                            </span>
                        </div>
                    ))}
                    {rankStats.length === 0 && (
                        <p className="w-full text-center text-slate-500 text-xs py-10">Nenhuma hierarquia.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserStatistics;
