import React, { type FC, useState } from 'react';
import {
  PlusCircle,
  AlertTriangle,
  Lock,
  Camera,
  UserCheck,
  Bell,
  ArrowRight,
  ShieldAlert,
  Activity,
  Zap,
  Shield,
  Truck,
  Users,
  Box,
  Clock,
  RefreshCw
} from 'lucide-react';
import { User, Occurrence } from '../types';
import { STATUS_COLORS, URGENCY_COLORS } from '../constants';

interface HomeViewProps {
  user: User;
  onNewOccurrence: (category?: string) => void;
  onViewAll: () => void;
  recentOccurrences: Occurrence[];
  onSelectOccurrence: (occ: Occurrence) => void;
  onRefresh?: () => Promise<void>;
  onRequestMission?: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({
  user,
  onNewOccurrence,
  onViewAll,
  recentOccurrences,
  onSelectOccurrence,
  onRefresh,
  onRequestMission
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const quickActions = [
    { title: 'Emergências', icon: <Zap className="w-8 h-8" />, color: 'bg-red-600', category: 'Ocorrências de Emergência' },
    { title: 'Acesso', icon: <Lock className="w-8 h-8" />, color: 'bg-orange-600', category: 'Controle de Acesso e Credenciamento' },
    { title: 'Patrimonial', icon: <Shield className="w-8 h-8" />, color: 'bg-blue-700', category: 'Segurança Orgânica / Patrimonial' },
    { title: 'Tecnologia', icon: <Camera className="w-8 h-8" />, color: 'bg-indigo-600', category: 'Segurança de Sistemas e Tecnologia' },
    { title: 'Tráfego', icon: <Truck className="w-8 h-8" />, color: 'bg-slate-700', category: 'Veículos e Tráfego Interno' },
    { title: 'Conduta', icon: <Users className="w-8 h-8" />, color: 'bg-purple-600', category: 'Pessoas e Conduta' },
    { title: 'Logística', icon: <Box className="w-8 h-8" />, color: 'bg-emerald-600', category: 'Materiais e Logística' },
  ];

  // Add Mission button if handler is provided
  if (onRequestMission) {
    quickActions.unshift({
      title: 'Missão', // User asked for "Solicitar missão" but title spacing in grid might be tight. "Missão" is concise. Let's try "Solicitar Missão" if space permits, or just "Missões".
      icon: <ShieldAlert className="w-8 h-8" />,
      color: 'bg-slate-900',
      category: 'MISSION_REQUEST'
    });
  }

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-12">
      {/* Welcome Section */}
      <div className="bg-slate-900 rounded-[2rem] lg:rounded-[2.5rem] p-6 lg:p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-full w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center overflow-hidden shadow-lg">
                <img src="/logo_gsd.jpg" alt="Logo GSD-SP" className="w-full h-full object-cover scale-110" />
              </div>
              <span className="text-blue-400 font-black tracking-widest text-[10px] uppercase">Comando de Operações</span>
            </div>
            {onRefresh && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold text-[10px] lg:text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? '...' : 'Atualizar'}
              </button>
            )}
          </div>
          <h2 className="text-2xl lg:text-4xl font-bold mb-2 lg:mb-3 tracking-tight">Guardião GSD-SP</h2>
          <p className="text-slate-400 max-w-md text-sm lg:text-lg leading-relaxed">Olá, {user.name}. Selecione uma categoria para abrir um novo chamado técnico ou operacional.</p>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <img src="/logo_gsd.jpg" alt="Logo Background" className="w-48 h-48 lg:w-64 lg:h-64 grayscale" />
        </div>
      </div>

      {/* Quick Launch Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
            <span className="w-8 h-[2px] bg-blue-600"></span>
            Abertura Rápida de Chamado
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => action.category === 'MISSION_REQUEST' && onRequestMission ? onRequestMission() : onNewOccurrence(action.category)}
              className="flex flex-col items-center justify-center p-4 lg:p-6 bg-white rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all group relative overflow-hidden active:scale-95"
            >
              <div className={`${action.color} p-3 lg:p-4 rounded-xl lg:rounded-2xl text-white mb-2 lg:mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                {React.cloneElement(action.icon as React.ReactElement, { className: 'w-6 h-6 lg:w-8 h-8' })}
              </div>
              <span className="text-[10px] lg:text-[11px] font-black text-slate-800 text-center uppercase tracking-tight">{action.title}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
            <span className="w-8 h-[2px] bg-orange-500"></span>
            Atividade Recente na Unidade
          </h3>
          <button
            onClick={onViewAll}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-2 group"
          >
            Ver Todos os Chamados
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {recentOccurrences.length > 0 ? (
            recentOccurrences.map((occ) => (
              <div
                key={occ.id}
                className="p-6 hover:bg-slate-50 cursor-pointer flex items-center justify-between group transition-colors"
                onClick={() => onSelectOccurrence(occ)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 lg:gap-5">
                    <div className={`mt-1.5 w-2.5 h-2.5 shrink-0 rounded-full ${occ.urgency === 'Crítica' ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50' : 'bg-slate-200'}`}></div>
                    <div>
                      <p className="text-sm lg:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{occ.title}</p>
                      <div className="flex flex-wrap items-center gap-2 lg:gap-3 mt-1">
                        <span className="text-[9px] lg:text-xs font-black text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded-md">{occ.category}</span>
                        <span className="hidden sm:inline text-[10px] text-slate-300">•</span>
                        <span className="text-[10px] lg:text-xs font-medium text-slate-500">{occ.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 ml-5 sm:ml-0">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] lg:text-[10px] font-black uppercase tracking-widest ${STATUS_COLORS[occ.status]}`}>
                      {occ.status}
                    </span>
                    <ArrowRight className="w-4 h-4 lg:w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-400">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-10" />
              <p className="font-medium">Nenhum chamado aberto recentemente.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomeView;
