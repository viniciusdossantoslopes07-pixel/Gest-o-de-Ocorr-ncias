
import { useMemo, useState, useEffect, FC } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Occurrence, Status, Urgency } from '../types';
import { STATUS_COLORS, URGENCY_COLORS } from '../constants';
import { getDashboardInsights } from '../services/geminiService';
import { Sparkles, TrendingUp, AlertCircle, Clock } from 'lucide-react';

interface DashboardProps {
  occurrences: Occurrence[];
}

const Dashboard: FC<DashboardProps> = ({ occurrences }) => {
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleGenerateInsights = async () => {
    setIsAiLoading(true);
    setAiInsights('Conectando à Inteligência Artificial e analisando dados...');
    try {
      const insights = await getDashboardInsights(occurrences);
      setAiInsights(insights);
    } catch (error) {
      setAiInsights('Erro ao gerar análise. Tente novamente.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const stats = useMemo(() => {
    const byType = occurrences.reduce((acc: any, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {});

    const byStatus = occurrences.reduce((acc: any, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});

    const byUrgency = occurrences.reduce((acc: any, curr) => {
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

    // BI Logic: Peak Hours
    const hours = Array(24).fill(0);
    occurrences.forEach(o => {
      const hour = new Date(o.date).getHours();
      hours[hour]++;
    });
    const peakHours = hours.map((count, hour) => ({
      hour: hour.toString().padStart(2, '0'),
      count
    }));

    return {
      total: occurrences.length,
      critical: occurrences.filter(o => o.urgency === Urgency.CRITICAL).length,
      pending: occurrences.filter(o => o.status !== Status.CLOSED && o.status !== Status.RESOLVED).length,
      resolved: occurrences.filter(o => o.status === Status.RESOLVED || o.status === Status.CLOSED).length,
      typeData: Object.keys(byType).map(key => ({ name: key, value: byType[key] })),
      statusData: Object.keys(byStatus).map(key => ({ name: key, value: byStatus[key] })),
      urgencyData: Object.keys(byUrgency).map(key => ({ name: key, value: byUrgency[key] })),
      topReporters,
      topResolvers,
      topLocations,
      topSectors,
      peakHours,
    };
  }, [occurrences]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#6366f1'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-medium">Total Ocorrências</span>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-medium">Críticas / Urgentes</span>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-red-600">{stats.critical}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-medium">Em Aberto</span>
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-medium">Resolvidas</span>
            <Sparkles className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600">{stats.resolved}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold mb-6">Ocorrências por Tipo</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.typeData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" fontSize={12} tickLine={false} axisLine={false} width={100} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold mb-6">Urgência</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.urgencyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.urgencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
            {stats.urgencyData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className="text-slate-600 truncate">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Top Relatores */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-4 tracking-wider">Top Relatores</h3>
          <div className="space-y-4">
            {stats.topReporters.map((reporter, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                    {index + 1}
                  </div>
                  <span className="text-xs font-medium text-slate-700 truncate">{reporter.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-900">{reporter.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Resolvers (Atuantes) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-4 tracking-wider">Top Atuantes (Resoluções)</h3>
          <div className="space-y-4">
            {stats.topResolvers.map((resolver, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${index === 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {index + 1}
                  </div>
                  <span className="text-xs font-medium text-slate-700 truncate">{resolver.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-900">{resolver.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Locais */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-4 tracking-wider">Locais Críticos</h3>
          <div className="space-y-4">
            {stats.topLocations.map((location, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
                  <span className="text-xs font-medium text-slate-700 truncate" title={location.name}>{location.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400" style={{ width: `${(location.count / stats.total) * 100}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">{location.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Setores */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-4 tracking-wider">Setores Demandantes</h3>
          <div className="space-y-4">
            {stats.topSectors.map((sector, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                  <span className="text-xs font-medium text-slate-700 truncate" title={sector.name}>{sector.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400" style={{ width: `${(sector.count / stats.total) * 100}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">{sector.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Pico de Horário - Full Width */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 tracking-wider">Pico de Horário (24h) - Distribuição Temporal</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.peakHours}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" fontSize={10} tickLine={false} axisLine={false} interval={1} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(label) => `${label}h`}
                />
                <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-blue-900 text-white p-6 rounded-xl shadow-lg border border-blue-800 relative overflow-hidden transition-all hover:shadow-blue-900/40 hover:shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles className="w-24 h-24" />
        </div>
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-300" />
            <h3 className="text-lg font-semibold">Análise de Tendências (Gemini AI)</h3>
          </div>
          {!aiInsights && !isAiLoading && (
            <button
              onClick={handleGenerateInsights}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-bold backdrop-blur-sm transition-all flex items-center gap-2 border border-white/10"
            >
              <Sparkles className="w-4 h-4" />
              Gerar Análise Inteligente
            </button>
          )}
        </div>

        <div className="prose prose-invert max-w-none relative z-10 min-h-[60px]">
          {isAiLoading ? (
            <div className="flex items-center gap-3 text-blue-200 animate-pulse">
              <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
              <span>Processando dados de segurança com IA...</span>
            </div>
          ) : aiInsights ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <p className="whitespace-pre-line text-blue-50 leading-relaxed mb-4">
                {aiInsights}
              </p>
              <button
                onClick={handleGenerateInsights}
                className="text-xs text-blue-300 hover:text-white underline underline-offset-4 opacity-70 hover:opacity-100 transition-opacity"
              >
                Atualizar análise
              </button>
            </div>
          ) : (
            <p className="text-blue-200/60 italic text-sm">
              Clique no botão acima para solicitar uma análise de inteligência artificial baseada nos dados atuais.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
