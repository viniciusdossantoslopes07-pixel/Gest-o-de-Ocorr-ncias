import React, { useMemo, useState } from 'react';
import { Vehicle, VehicleLoan } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import {
  Car,
  TrendingUp,
  Gauge,
  Wrench,
  Ban,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Award,
  Clock,
  Sparkles
} from 'lucide-react';
import { FAB_CATEGORIES } from './VehicleAdminModal';

interface VehicleBIStatsProps {
  vehicles: Vehicle[];
  loans: VehicleLoan[];
  isDarkMode: boolean;
}

export const VehicleBIStats: React.FC<VehicleBIStatsProps> = ({
  vehicles = [],
  loans = [],
  isDarkMode
}) => {
  const [timeFilter, setTimeFilter] = useState<'all' | '30days' | '7days'>('all');

  // Filtragem de empréstimos por período
  const filteredLoans = useMemo(() => {
    if (timeFilter === 'all') return loans;
    const now = new Date();
    const days = timeFilter === '7days' ? 7 : 30;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return loans.filter((l) => new Date(l.created_at || l.departure_date) >= cutoff);
  }, [loans, timeFilter]);

  // Métricas Principais (KPIs)
  const stats = useMemo(() => {
    const totalVehicles = vehicles.length;
    const available = vehicles.filter((v) => v.status === 'Disponível').length;
    const inUse = vehicles.filter((v) => v.status === 'Cautelada').length;
    const maintenance = vehicles.filter(
      (v) => v.status === 'Em Manutenção' || v.status === 'Manutenção'
    ).length;
    const alienacao = vehicles.filter((v) => v.status === 'Alienação').length;
    const baixada = vehicles.filter((v) => v.status === 'Baixada').length;

    // Prontidão: Disponíveis + Em Uso (ativas operacionalmente) / Total
    const readinessRate =
      totalVehicles > 0 ? Math.round(((available + inUse) / totalVehicles) * 100) : 0;

    // KM Total Percorrido (apenas missões devolvidas com km registrado)
    const totalKmTraveled = filteredLoans.reduce((sum, l) => {
      const dist =
        l.distance_traveled ||
        (l.return_odometer && l.departure_odometer
          ? Math.max(0, l.return_odometer - l.departure_odometer)
          : 0);
      return sum + dist;
    }, 0);

    // Média de KM por Missão
    const completedLoans = filteredLoans.filter((l) => l.status === 'Devolvido');
    const avgKmPerMission =
      completedLoans.length > 0 ? Math.round(totalKmTraveled / completedLoans.length) : 0;

    // Viatura Mais Utilizada
    const vehicleMissionCounts: Record<string, { count: number; km: number; vehicle?: Vehicle }> = {};
    filteredLoans.forEach((l) => {
      const vtr = l.vehicle;
      const key = vtr?.reg_fab || l.vehicle_id;
      if (!vehicleMissionCounts[key]) {
        vehicleMissionCounts[key] = { count: 0, km: 0, vehicle: vtr };
      }
      vehicleMissionCounts[key].count += 1;
      const dist =
        l.distance_traveled ||
        (l.return_odometer && l.departure_odometer
          ? Math.max(0, l.return_odometer - l.departure_odometer)
          : 0);
      vehicleMissionCounts[key].km += dist;
    });

    const topVehicleEntry = Object.entries(vehicleMissionCounts).sort(
      (a, b) => b[1].count - a[1].count
    )[0];

    return {
      totalVehicles,
      available,
      inUse,
      maintenance,
      alienacao,
      baixada,
      readinessRate,
      totalKmTraveled,
      avgKmPerMission,
      totalMissions: filteredLoans.length,
      topVehicle: topVehicleEntry
        ? {
            reg_fab: topVehicleEntry[0],
            name: topVehicleEntry[1].vehicle?.model || 'Viatura',
            count: topVehicleEntry[1].count,
            km: topVehicleEntry[1].km
          }
        : null
    };
  }, [vehicles, filteredLoans]);

  // Gráfico 1: VTRs Mais Utilizadas (Top 6 por quantidade de missões)
  const topVehiclesData = useMemo(() => {
    const map: Record<string, { name: string; missoes: number; km: number }> = {};

    // Inicializar com todas as viaturas
    vehicles.forEach((v) => {
      map[v.id] = {
        name: `${v.reg_fab} (${v.model.split(' ')[0]})`,
        missoes: 0,
        km: 0
      };
    });

    // Somar missões
    filteredLoans.forEach((l) => {
      const vId = l.vehicle_id;
      if (!map[vId]) {
        const v = l.vehicle;
        map[vId] = {
          name: v ? `${v.reg_fab} (${v.model.split(' ')[0]})` : 'VTR',
          missoes: 0,
          km: 0
        };
      }
      map[vId].missoes += 1;
      const dist =
        l.distance_traveled ||
        (l.return_odometer && l.departure_odometer
          ? Math.max(0, l.return_odometer - l.departure_odometer)
          : 0);
      map[vId].km += dist;
    });

    return Object.values(map)
      .sort((a, b) => b.missoes - a.missoes)
      .slice(0, 6);
  }, [vehicles, filteredLoans]);

  // Gráfico 2: Distribuição por Status da Frota
  const statusPieData = useMemo(() => {
    const data = [
      { name: 'Disponível', value: stats.available, color: '#10b981' },
      { name: 'Em Missão', value: stats.inUse, color: '#3b82f6' },
      { name: 'Manutenção', value: stats.maintenance, color: '#f59e0b' },
      { name: 'Alienação', value: stats.alienacao, color: '#8b5cf6' },
      { name: 'Baixada', value: stats.baixada, color: '#ef4444' }
    ].filter((item) => item.value > 0);

    return data;
  }, [stats]);

  // Gráfico 3: Missões ao Longo do Tempo (Últimos dias ou agrupado)
  const timelineData = useMemo(() => {
    const dateMap: Record<string, { date: string; missoes: number; km: number }> = {};

    filteredLoans.forEach((l) => {
      const rawDate = l.departure_date || l.created_at;
      if (!rawDate) return;
      const dateKey = new Date(rawDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { date: dateKey, missoes: 0, km: 0 };
      }
      dateMap[dateKey].missoes += 1;
      const dist =
        l.distance_traveled ||
        (l.return_odometer && l.departure_odometer
          ? Math.max(0, l.return_odometer - l.departure_odometer)
          : 0);
      dateMap[dateKey].km += dist;
    });

    return Object.values(dateMap).slice(-8);
  }, [filteredLoans]);

  // Gráfico 4: Top Condutores (Militares com mais missões)
  const topDriversData = useMemo(() => {
    const driverMap: Record<string, { name: string; missoes: number }> = {};

    filteredLoans.forEach((l) => {
      const key = `${l.driver_rank} ${l.driver_name}`;
      if (!driverMap[key]) {
        driverMap[key] = { name: key, missoes: 0 };
      }
      driverMap[key].missoes += 1;
    });

    return Object.values(driverMap)
      .sort((a, b) => b.missoes - a.missoes)
      .slice(0, 5);
  }, [filteredLoans]);

  // Normaliza o campo category para o padrão sem hífen: P1, P2, P13...
  const normalizeCategory = (c?: string): string => {
    if (!c) return 'P1';
    return c.replace(/^P-/, 'P');
  };

  // Gráfico: Composição da Frota por Categoria (Pie donut)
  const categoryPieData = useMemo(() => {
    const CATEGORY_COLORS: Record<string, string> = {
      P1: '#6366f1', P2: '#3b82f6', P3: '#06b6d4', P4: '#10b981',
      P5: '#84cc16', P6: '#f59e0b', P7: '#f97316', P8: '#ef4444',
      P9: '#ec4899', P10: '#a855f7', P11: '#8b5cf6', P12: '#0ea5e9',
      P13: '#14b8a6', P14: '#22c55e', P15: '#eab308', P16: '#fb923c',
      P17: '#f43f5e', P18: '#a78bfa', P19: '#34d399', P20: '#60a5fa'
    };
    const map: Record<string, number> = {};
    vehicles.forEach((v) => {
      const cat = normalizeCategory(v.category);
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => parseInt(a[0].replace('P', '')) - parseInt(b[0].replace('P', '')))
      .map(([cat, count]) => ({
        name: cat,
        value: count,
        color: CATEGORY_COLORS[cat] || '#64748b'
      }));
  }, [vehicles]);

  // Dados por categoria para o gráfico de barras
  const categoryBarData = useMemo(() => {
    const map: Record<string, { category: string; viaturas: number; missoes: number }> = {};
    for (let i = 1; i <= 20; i++) {
      const cat = `P${i}`;
      map[cat] = { category: cat, viaturas: 0, missoes: 0 };
    }
    vehicles.forEach((v) => {
      const cat = normalizeCategory(v.category);
      if (map[cat]) map[cat].viaturas += 1;
    });
    filteredLoans.forEach((l) => {
      const v = l.vehicle || vehicles.find((item) => item.id === l.vehicle_id);
      const cat = normalizeCategory(v?.category);
      if (map[cat]) map[cat].missoes += 1;
    });
    return Object.values(map).filter((c) => c.viaturas > 0 || c.missoes > 0);
  }, [vehicles, filteredLoans]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Barra de Filtro de Período */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Painel de Inteligência e Métricas da Frota (BI)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Análise operacional de uso de viaturas, quilometragem, disponibilidade e manutenções.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => setTimeFilter('7days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeFilter === '7days'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            7 dias
          </button>
          <button
            onClick={() => setTimeFilter('30days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeFilter === '30days'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            30 dias
          </button>
          <button
            onClick={() => setTimeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Geral (Total)
          </button>
        </div>
      </div>

      {/* Cards de KPI no Topo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Prontidão */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Prontidão Operacional
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.readinessRate}%
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {stats.available + stats.inUse} de {stats.totalVehicles} ativas
            </span>
          </div>
        </div>

        {/* KM Total */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quilometragem Total
            </span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
              <Gauge className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {stats.totalKmTraveled.toLocaleString('pt-BR')} km
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Média: {stats.avgKmPerMission} km/missão
            </span>
          </div>
        </div>

        {/* VTR Mais Utilizada */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              VTR Mais Utilizada
            </span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div>
            {stats.topVehicle ? (
              <>
                <span className="text-lg font-black text-slate-900 dark:text-white truncate block">
                  {stats.topVehicle.reg_fab}
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  {stats.topVehicle.count} missões • {stats.topVehicle.km} km
                </span>
              </>
            ) : (
              <span className="text-sm font-bold text-slate-400">Sem missões</span>
            )}
          </div>
        </div>

        {/* Em Manutenção */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
              Em Manutenção
            </span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
              <Wrench className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {stats.maintenance}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Oficina / Reparo técnico
            </span>
          </div>
        </div>

        {/* Em Alienação */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">
              Alienação / Baixa
            </span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
              <Ban className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {stats.alienacao + stats.baixada}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Processo de desativação
            </span>
          </div>
        </div>
      </div>

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* GRÁFICO 1: VTRs Mais Utilizadas */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-500" />
                Viaturas Mais Demandadas (Ranking de Missões)
              </h4>
              <p className="text-xs text-slate-400">Quantidade de saídas operacionais por viatura</p>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              Top 6 VTRs
            </span>
          </div>

          <div className="h-64 w-full">
            {topVehiclesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topVehiclesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                  <XAxis
                    dataKey="name"
                    stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                    fontSize={11}
                    allowDecimals={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: isDarkMode ? '#ffffff' : '#0f172a'
                    }}
                  />
                  <Bar dataKey="missoes" name="Missões Realizadas" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Nenhum dado de missão registrado ainda.
              </div>
            )}
          </div>
        </div>

        {/* GRÁFICO 2: Distribuição por Status da Frota */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Composição da Frota por Status
              </h4>
              <p className="text-xs text-slate-400">Visão percentual do estado das viaturas</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: isDarkMode ? '#ffffff' : '#0f172a'
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">Nenhuma viatura cadastrada.</div>
            )}
          </div>
        </div>
      </div>

      {/* Gráficos Secundários: Status + Categorias (Pie duplo) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* GRÁFICO 2: Distribuição por Status da Frota */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Composição da Frota por Status
              </h4>
              <p className="text-xs text-slate-400">Visão percentual do estado das viaturas</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: isDarkMode ? '#ffffff' : '#0f172a'
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">Nenhuma viatura cadastrada.</div>
            )}
          </div>
        </div>

        {/* GRÁFICO 2b: Composição por Categoria FAB (Donut) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Car className="w-4 h-4 text-indigo-500" />
              Composição da Frota por Categoria FAB
            </h4>
            <p className="text-xs text-slate-400">Quantidade de viaturas por classificação (P1–P20)</p>
          </div>

          {categoryPieData.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
              {/* Donut */}
              <div className="h-56 w-56 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell key={`cat-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                        borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: isDarkMode ? '#ffffff' : '#0f172a'
                      }}
                      formatter={(value: number, name: string) => [`${value} vtr(s)`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legenda customizada em grade */}
              <div className="flex flex-col gap-1.5 flex-1 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                {categoryPieData.map((entry) => {
                  const fullLabel = FAB_CATEGORIES.find((c) => c.value === entry.name)?.label || entry.name;
                  return (
                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span
                        className="font-bold text-slate-700 dark:text-slate-300 truncate"
                        title={fullLabel}
                      >
                        {fullLabel}
                      </span>
                      <span className="text-slate-400 ml-auto font-black shrink-0">{entry.value} vtr</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              Nenhuma viatura cadastrada.
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* GRÁFICO 3: Histórico de Utilização ao longo do tempo */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                Histórico de Cautelas e Saídas Operacionais
              </h4>
              <p className="text-xs text-slate-400">Fluxo de missões ao longo das datas</p>
            </div>
          </div>

          <div className="h-60 w-full">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMissoes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                  <XAxis
                    dataKey="date"
                    stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                    fontSize={11}
                    allowDecimals={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: isDarkMode ? '#ffffff' : '#0f172a'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="missoes"
                    name="Missões"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMissoes)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Nenhuma missão recente para plotar.
              </div>
            )}
          </div>
        </div>

        {/* GRÁFICO 4: Top Militares Condutores */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Condutores Mais Frequentes
              </h4>
              <p className="text-xs text-slate-400">Militares que mais retiraram viaturas</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {topDriversData.length > 0 ? (
              topDriversData.map((d, idx) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-black flex items-center justify-center shrink-0">
                      {idx + 1}º
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {d.name}
                    </span>
                  </div>
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40">
                    {d.missoes} {d.missoes === 1 ? 'saída' : 'saídas'}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Nenhum condutor registrado ainda.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GRÁFICO 5: Frota e Utilização por Categoria FAB */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Car className="w-4 h-4 text-indigo-500" />
              Frota e Utilização por Categoria FAB (P1 até P20)
            </h4>
            <p className="text-xs text-slate-400">
              Distribuição do efetivo de viaturas e volume de missões segundo a classificação oficial da FAB
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoryBarData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
              <XAxis
                dataKey="category"
                stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                fontSize={11}
                allowDecimals={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                  borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: isDarkMode ? '#ffffff' : '#0f172a'
                }}
              />
              <Legend />
              <Bar dataKey="viaturas" name="Qtd de Viaturas na Frota" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="missoes" name="Missões Realizadas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
