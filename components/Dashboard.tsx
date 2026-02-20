
import { useMemo, useState, useEffect, FC } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area
} from 'recharts';
import { Occurrence, Status, Urgency } from '../types';
import { STATUS_COLORS, URGENCY_COLORS } from '../constants';
import { getDashboardInsights } from '../services/geminiService';
import { Sparkles, TrendingUp, AlertCircle, Clock, Crown, ShieldCheck, MapPin, Building2 } from 'lucide-react';

interface DashboardProps {
  occurrences: Occurrence[];
  isDarkMode: boolean;
}

type Period = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

const Dashboard: FC<DashboardProps> = ({ occurrences, isDarkMode }) => {
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [period, setPeriod] = useState<Period>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Filter Logic
  const filteredOccurrences = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return occurrences.filter(occ => {
      const occDate = new Date(occ.date);
      const occDay = new Date(occDate.getFullYear(), occDate.getMonth(), occDate.getDate());

      switch (period) {
        case 'today':
          return occDay.getTime() === today.getTime();
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          return occDay >= weekAgo && occDay <= today;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setDate(today.getDate() - 30);
          return occDay >= monthAgo && occDay <= today;
        case 'year':
          const yearStart = new Date(today.getFullYear(), 0, 1);
          return occDay >= yearStart;
        case 'custom':
          const start = new Date(dateRange.start);
          const end = new Date(dateRange.end);
          return occDay >= start && occDay <= end;
        default:
          return true;
      }
    });
  }, [occurrences, period, dateRange]);

  const handleGenerateInsights = async () => {
    setIsAiLoading(true);
    setAiInsights('Conectando à Central de Inteligência e processando dados...');
    try {
      const insights = await getDashboardInsights(filteredOccurrences);
      setAiInsights(insights);
    } catch (error) {
      setAiInsights('Erro ao gerar análise de inteligência. Verifique a conexão.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'today': return 'Hoje';
      case 'week': return 'Últimos 7 Dias';
      case 'month': return 'Últimos 30 Dias';
      case 'year': return `Ano de ${new Date().getFullYear()}`;
      case 'custom': return `${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}`;
      default: return 'Todo o Período';
    }
  };

  const stats = useMemo(() => {
    const dataToAnalyze = filteredOccurrences;

    const byType = dataToAnalyze.reduce((acc: any, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {});

    const byStatus = dataToAnalyze.reduce((acc: any, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});

    const byUrgency = dataToAnalyze.reduce((acc: any, curr) => {
      acc[curr.urgency] = (acc[curr.urgency] || 0) + 1;
      return acc;
    }, {});

    // BI Logic: Top Reporters (Quem abriu)
    const byCreator = occurrences.reduce((acc: any, curr) => {
      acc[curr.creator] = (acc[curr.creator] || 0) + 1;
      return acc;
    }, {});
    const topReporters = Object.entries(byCreator)
      .map(([name, count]) => ({ name, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // BI Logic: Top Resolvers (Quem atuou na timeline)
    const resolverCounts: Record<string, number> = {};
    occurrences.forEach(occurrence => {
      occurrence.timeline.forEach(event => {
        // Ignorar o criador se ele aparecer na timeline apenas registrando (opcional, mas timeline costuma ter atualizações)
        // Vamos contar todas as iterações como "atuação"
        if (event.updatedBy) {
          resolverCounts[event.updatedBy] = (resolverCounts[event.updatedBy] || 0) + 1;
        }
      });
    });
    const topResolvers = Object.entries(resolverCounts)
      .map(([name, count]) => ({ name, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // BI Logic: Top Locations
    const byLocation = occurrences.reduce((acc: any, curr) => {
      acc[curr.location] = (acc[curr.location] || 0) + 1;
      return acc;
    }, {});
    const topLocations = Object.entries(byLocation)
      .map(([name, count]) => ({ name, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // BI Logic: Top Sectors
    const bySector = occurrences.reduce((acc: any, curr) => {
      const sector = curr.sector || 'Não Informado';
      acc[sector] = (acc[sector] || 0) + 1;
      return acc;
    }, {});
    const topSectors = Object.entries(bySector)
      .map(([name, count]) => ({ name, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // BI Logic: Peak Hours (Dynamic based on filtered data)
    const hours = Array(24).fill(0);
    dataToAnalyze.forEach(o => {
      const hour = new Date(o.date).getHours();
      hours[hour]++;
    });
    const peakHours = hours.map((count, hour) => ({
      hour: hour.toString().padStart(2, '0'),
      count
    }));

    return {
      total: dataToAnalyze.length,
      critical: dataToAnalyze.filter(o => o.urgency === Urgency.CRITICAL).length,
      pending: dataToAnalyze.filter(o => o.status !== Status.CLOSED && o.status !== Status.RESOLVED).length,
      pendingStatus: dataToAnalyze.filter(o => o.status === Status.PENDING).length,
      resolved: dataToAnalyze.filter(o => o.status === Status.RESOLVED || o.status === Status.CLOSED).length,
      typeData: Object.keys(byType).map(key => ({ name: key, value: byType[key] })),
      statusData: Object.keys(byStatus).map(key => ({ name: key, value: byStatus[key] })),
      urgencyData: Object.keys(byUrgency).map(key => ({ name: key, value: byUrgency[key] })),
      topReporters,
      topResolvers,
      topLocations,
      topSectors,
      peakHours,
    };
  }, [filteredOccurrences]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#6366f1'];

  return (
    <div className="space-y-6 animate-fade-in p-1">
      {/* Intelligence Header & Filters */}
      <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-lg border flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden transition-colors duration-300`}>
        <div className={`absolute top-0 right-0 w-64 h-64 ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'} rounded-full blur-3xl -z-10 opacity-50 translate-x-1/3 -translate-y-1/3`}></div>

        <div className="flex items-center gap-5 w-full md:w-auto">
          <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl shadow-blue-200 text-white">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Painel de Inteligência</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Dados em Tempo Real: <span className="text-blue-600">{getPeriodLabel()}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <div className="flex bg-slate-100 p-1.5 rounded-xl shadow-inner">
            {[
              { id: 'all', label: 'Tudo' },
              { id: 'today', label: 'Hoje' },
              { id: 'week', label: '7 Dias' },
              { id: 'month', label: '30 Dias' },
              { id: 'year', label: 'Este Ano' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as Period)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all duration-300 ${period === p.id
                  ? `${isDarkMode ? 'bg-slate-700 text-blue-400' : 'bg-white text-blue-600 shadow-md scale-105'}`
                  : `${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border shadow-sm hover:shadow-md transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-none' : 'bg-white border-slate-200'}`}>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Período:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  setDateRange(prev => ({ ...prev, start: e.target.value }));
                  setPeriod('custom');
                }}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none w-24 cursor-pointer hover:text-blue-600 transition-colors"
                title="Data Inicial"
              />
              <span className="text-slate-300 font-light">/</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  setDateRange(prev => ({ ...prev, end: e.target.value }));
                  setPeriod('custom');
                }}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none w-24 cursor-pointer hover:text-blue-600 transition-colors"
                title="Data Final"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className={`p-6 rounded-2xl shadow-sm border hover:shadow-xl transition-all duration-300 group ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total</span>
            <div className={`p-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors ${isDarkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-500'}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{stats.total}</div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">ocorrências registradas</p>
        </div>

        <div className={`p-6 rounded-2xl shadow-sm border hover:shadow-xl transition-all duration-300 group relative overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="absolute right-0 top-0 h-full w-1 bg-red-500"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Críticas</span>
            <div className={`p-2 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors ${isDarkMode ? 'bg-red-900/20 text-red-500' : 'bg-red-50 text-red-500'}`}>
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-red-600">{stats.critical}</div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">prioridade máxima</p>
        </div>

        <div className={`p-6 rounded-2xl shadow-sm border hover:shadow-xl transition-all duration-300 group ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Em Aberto</span>
            <div className={`p-2 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors ${isDarkMode ? 'bg-orange-900/20 text-orange-500' : 'bg-orange-50 text-orange-500'}`}>
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-orange-500">{stats.pending}</div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">aguardando resolução</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-white p-6 rounded-2xl shadow-sm border border-amber-100 hover:shadow-xl transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-amber-700 text-xs font-bold uppercase tracking-wider">Pendentes</span>
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="text-4xl font-black text-amber-600">{stats.pendingStatus}</div>
          <p className="text-[10px] text-amber-500 mt-2 font-medium">status "pendente"</p>
        </div>

        <div className={`p-6 rounded-2xl shadow-sm border hover:shadow-xl transition-all duration-300 group border-b-4 border-b-emerald-500 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-amber-50 to-white border-amber-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Resolvidas</span>
            <div className={`p-2 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors ${isDarkMode ? 'bg-emerald-900/20 text-emerald-500' : 'bg-emerald-50 text-emerald-500'}`}>
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-emerald-600">{stats.resolved}</div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">finalizadas com sucesso</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-none' : 'bg-white border-slate-100 shadow-lg'} p-8 rounded-3xl border relative overflow-hidden transition-all duration-300`}>
          <h3 className={`text-lg font-black mb-8 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
            Tipologia de Ocorrências
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.typeData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                <YAxis dataKey="name" type="category" fontSize={11} tickLine={false} axisLine={false} width={110} tick={{ fill: isDarkMode ? '#cbd5e1' : '#475569', fontWeight: 600 }} />
                <Tooltip
                  cursor={{ fill: isDarkMode ? '#1e293b' : '#f1f5f9' }}
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px',
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                    color: isDarkMode ? '#f8fafc' : '#0f172a'
                  }}
                  itemStyle={{ color: isDarkMode ? '#f8fafc' : '#0f172a' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={24}>
                  {stats.typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-none' : 'bg-white border-slate-100 shadow-lg'} p-8 rounded-3xl border relative overflow-hidden transition-all duration-300`}>
          <h3 className={`text-lg font-black mb-8 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            <span className="w-1.5 h-6 bg-purple-600 rounded-full"></span>
            Distribuição por Urgência
          </h3>
          <div className="h-[350px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.urgencyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={6}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {stats.urgencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-[-40px] relative z-10 px-4">
            {stats.urgencyData.map((item, i) => (
              <div key={item.name} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className={`text-xs font-bold truncate max-w-[100px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.name}</span>
                <span className={`text-xs font-black px-1.5 rounded-md border ml-1 ${isDarkMode ? 'text-white bg-slate-800 border-slate-600' : 'text-slate-900 bg-white border-slate-100'}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Top Relatores */}
        <div className={`p-6 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-none' : 'bg-white border-slate-100 shadow-sm'}`}>
          <h3 className={`text-[10px] font-black uppercase mb-5 tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>
            <Crown className="w-3 h-3" /> Principais Relatores
          </h3>
          <div className="space-y-4">
            {stats.topReporters.map((reporter, index) => (
              <div key={index} className="flex items-center justify-between group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-all ${index === 0 ? (isDarkMode ? 'bg-yellow-900/30 text-yellow-500' : 'bg-yellow-100 text-yellow-700') : (isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-50 text-slate-500')}`}>
                    {index + 1}
                  </div>
                  <span className={`text-xs font-bold truncate transition-colors ${isDarkMode ? 'text-slate-300 group-hover:text-blue-400' : 'text-slate-700 group-hover:text-blue-600'}`}>{reporter.name}</span>
                </div>
                <span className={`text-xs font-black px-2 py-1 rounded-lg ${isDarkMode ? 'bg-slate-900/50 text-white' : 'bg-slate-50 text-slate-900'}`}>{reporter.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Resolvers (Atuantes) */}
        <div className={`p-6 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-none' : 'bg-white border-slate-100 shadow-sm'}`}>
          <h3 className="text-[10px] font-black uppercase text-slate-400 mb-5 tracking-widest flex items-center gap-2">
            <ShieldCheck className="w-3 h-3" /> Mais Atuantes
          </h3>
          <div className="space-y-4">
            {stats.topResolvers.map((resolver, index) => (
              <div key={index} className="flex items-center justify-between group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-all ${index === 0 ? 'bg-green-100 text-green-700 shadow-green-100' : 'bg-slate-50 text-slate-500'}`}>
                    {index + 1}
                  </div>
                  <span className="text-xs font-bold text-slate-700 truncate group-hover:text-emerald-600 transition-colors">{resolver.name}</span>
                </div>
                <span className="text-xs font-black text-slate-900 bg-slate-50 px-2 py-1 rounded-lg">{resolver.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Locais */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-[10px] font-black uppercase text-slate-400 mb-5 tracking-widest flex items-center gap-2">
            <MapPin className="w-3 h-3" /> Locais Críticos
          </h3>
          <div className="space-y-4">
            {stats.topLocations.map((location, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                  <span className="text-xs font-bold text-slate-700 truncate" title={location.name}>{location.name}</span>
                </div>
                <div className="flex items-center gap-2 w-16 justify-end">
                  <div className={`h-1.5 flex-1 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${(location.count / stats.total) * 100}%` }}></div>
                  </div>
                  <span className={`text-[10px] font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{location.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Setores */}
        <div className={`p-6 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-none' : 'bg-white border-slate-100 shadow-sm'}`}>
          <h3 className="text-[10px] font-black uppercase text-slate-400 mb-5 tracking-widest flex items-center gap-2">
            <Building2 className="w-3 h-3" /> Demandas por Setor
          </h3>
          <div className="space-y-4">
            {stats.topSectors.map((sector, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                  <span className={`text-xs font-bold truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`} title={sector.name}>{sector.name}</span>
                </div>
                <div className="flex items-center gap-2 w-16 justify-end">
                  <div className={`h-1.5 flex-1 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(sector.count / stats.total) * 100}%` }}></div>
                  </div>
                  <span className={`text-[10px] font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{sector.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Pico de Horário - Full Width */}
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-6 tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
            Análise Temporal (24h)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.peakHours} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="hour" fontSize={11} tickLine={false} axisLine={false} interval={2} tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b' }} tickFormatter={(v) => `${v}h`} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px',
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                    color: isDarkMode ? '#f8fafc' : '#0f172a'
                  }}
                  labelFormatter={(label) => `${label}h`}
                />
                <Area type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: isDarkMode ? '#1e293b' : '#fff' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#f59e0b' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={`p-8 rounded-3xl shadow-2xl border relative overflow-hidden transition-all hover:scale-[1.005] duration-500 group ${isDarkMode ? 'bg-slate-800 border-blue-900/50' : 'bg-gradient-to-r from-blue-900 to-indigo-900 border-blue-800/50 text-white'}`}>
        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity duration-700">
          <Sparkles className="w-64 h-64 -translate-y-12 translate-x-12" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                <Sparkles className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">IA Tática (Gemini 2.0)</h3>
                <p className="text-blue-200 text-xs font-medium uppercase tracking-widest mt-0.5">Análise de Dados & Probabilidade</p>
              </div>
            </div>

            {!aiInsights && !isAiLoading && (
              <button
                onClick={handleGenerateInsights}
                className="bg-white text-blue-900 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Gerar Relatório de Inteligência
              </button>
            )}
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 min-h-[100px]">
            {isAiLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-4 text-blue-200 animate-pulse">
                <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-bold tracking-wide uppercase">Processando vetores de dados...</span>
              </div>
            ) : aiInsights ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-p:text-blue-50 prose-strong:text-white prose-strong:font-black">
                  <p className={`whitespace-pre-line text-sm md:text-base ${isDarkMode ? 'text-slate-300' : 'text-blue-50'}`}>
                    {aiInsights}
                  </p>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleGenerateInsights}
                    className="text-xs text-blue-300 hover:text-white flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity font-bold uppercase tracking-wider"
                  >
                    <Sparkles className="w-3 h-3" /> Atualizar Análise
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-blue-200/60">
                <p className="italic text-base mb-2">"A inteligência é a capacidade de adaptar-se à mudança."</p>
                <p className="text-xs font-bold uppercase tracking-widest opacity-50">Solicite uma análise para identificar padrões e tendências ocultas.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
