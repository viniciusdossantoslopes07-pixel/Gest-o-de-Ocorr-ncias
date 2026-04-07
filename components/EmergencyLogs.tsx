import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { EmergencyLog } from '../types';
import { Siren, Clock, User, AlertCircle, RefreshCw } from 'lucide-react';

export default function EmergencyLogs() {
  const [logs, setLogs] = useState<EmergencyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('emergency_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching emergency logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <Siren className="w-6 h-6 text-red-500" />
            </div>
            Logs de Emergência
          </h1>
          <p className="text-slate-400 mt-2">
            Histórico completo de acionamentos do Alerta Sonoro no sistema.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700/80">
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data / Hora</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Militar / Usuário</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ação</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                      Carregando registros...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">Nenhum evento registrado ainda.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-300 font-medium">
                        <Clock className="w-4 h-4 text-slate-500" />
                        {new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="font-semibold text-white">{log.user_name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 shadow-sm shadow-red-500/10">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-sm">
                      {log.details || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
