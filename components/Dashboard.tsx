
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

    return {
      total: occurrences.length,
      critical: occurrences.filter(o => o.urgency === Urgency.CRITICAL).length,
      pending: occurrences.filter(o => o.status !== Status.CLOSED && o.status !== Status.RESOLVED).length,
      resolved: occurrences.filter(o => o.status === Status.RESOLVED || o.status === Status.CLOSED).length,
      typeData: Object.keys(byType).map(key => ({ name: key, value: byType[key] })),
      statusData: Object.keys(byStatus).map(key => ({ name: key, value: byStatus[key] })),
      urgencyData: Object.keys(byUrgency).map(key => ({ name: key, value: byUrgency[key] })),
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold mb-6">Ocorrências por Tipo</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.typeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
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
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            {stats.urgencyData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className="text-slate-600 truncate">{item.name}: {item.value}</span>
              </div>
            ))}
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
