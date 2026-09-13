
import { type FC } from 'react';
import { Occurrence, Status, Urgency } from '../types';
import { STATUS_COLORS, URGENCY_COLORS } from '../constants';
import { Clock, AlertCircle, User as UserIcon, ArrowRight, Crown } from 'lucide-react';

interface KanbanBoardProps {
  occurrences: Occurrence[];
  onSelect: (occ: Occurrence) => void;
  isDarkMode?: boolean;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ occurrences, onSelect, isDarkMode }) => {
  const columns = [
    { title: 'N1: Adjunto', status: Status.TRIAGE },
    { title: 'N2: OSD', status: Status.ESCALATED },
    { title: 'N3: Setor', status: Status.RESOLVED }
  ];

  const getSLAColor = (deadline?: string) => {
    if (!deadline) return 'text-slate-400';
    const now = new Date();
    const target = new Date(deadline);
    const diff = target.getTime() - now.getTime();
    if (diff < 0) return 'text-red-600 font-bold animate-pulse';
    if (diff < 3600000) return 'text-orange-500 font-bold';
    return 'text-green-600';
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 h-[calc(100vh-200px)]">
      {columns.map(col => (
        <div key={col.title} className="flex-shrink-0 w-80 flex flex-col">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'} ${col.status === Status.COMMAND_REVIEW ? (isDarkMode ? 'text-white' : 'text-slate-900') : ''}`}>
              {col.status === Status.COMMAND_REVIEW && <Crown className="w-4 h-4 text-amber-500" />}
              {col.title}
              <span className={`px-2 py-0.5 rounded-full text-xs ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                {occurrences.filter(o => o.status === col.status).length}
              </span>
            </h3>
          </div>

          <div className={`flex-1 rounded-xl p-3 space-y-3 overflow-y-auto border ${col.status === Status.COMMAND_REVIEW ? (isDarkMode ? 'bg-amber-950/20 border-amber-500/30' : 'bg-slate-900/5 border-amber-500/20') : (isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-100/50 border-slate-200')}`}>
            {occurrences.filter(o => o.status === col.status).map(occ => (
              <div
                key={occ.id}
                onClick={() => onSelect(occ)}
                className={`p-4 rounded-xl shadow-sm border transition-all cursor-pointer group ${isDarkMode ? 'bg-slate-800/90 border-slate-700 hover:border-blue-500 text-white' : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'} ${col.status === Status.COMMAND_REVIEW ? (isDarkMode ? 'hover:border-amber-400' : 'hover:border-amber-500') : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${URGENCY_COLORS[occ.urgency]}`}>
                    {occ.urgency}
                  </span>
                  <div className={`flex items-center gap-1 text-[10px] ${getSLAColor(occ.sla_deadline)}`}>
                    <Clock className="w-3 h-3" />
                    {occ.sla_deadline ? 'SLA: ' + new Date(occ.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'SLA N/A'}
                  </div>
                </div>

                <h4 className={`font-bold text-sm mb-1 truncate ${isDarkMode ? 'text-white group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'} ${col.status === Status.COMMAND_REVIEW ? (isDarkMode ? 'group-hover:text-amber-400' : 'group-hover:text-amber-600') : ''}`}>{occ.title}</h4>
                <p className={`text-xs mb-3 line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{occ.description}</p>

                <div className={`flex items-center justify-between pt-3 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-50'}`}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${col.status === Status.COMMAND_REVIEW ? (isDarkMode ? 'bg-amber-900/40 text-amber-300 border-amber-700' : 'bg-amber-100 text-amber-600 border-amber-200') : (isDarkMode ? 'bg-blue-900/40 text-blue-300 border-blue-700' : 'bg-blue-100 text-blue-600 border-blue-200')}`}>
                      {occ.creator[0]}
                    </div>
                    <span className={`text-[10px] truncate max-w-[80px] ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>{occ.creator}</span>
                  </div>
                  <div className="flex gap-2">
                    {occ.attachments.length > 0 && <AlertCircle className={`w-3.5 h-3.5 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />}
                    <ArrowRight className={`w-3.5 h-3.5 transition-all ${isDarkMode ? 'text-slate-600 group-hover:text-blue-400' : 'text-slate-300 group-hover:text-blue-500'} ${col.status === Status.COMMAND_REVIEW ? (isDarkMode ? 'group-hover:text-amber-400' : 'group-hover:text-amber-500') : ''}`} />
                  </div>
                </div>
              </div>
            ))}
            {occurrences.filter(o => o.status === col.status).length === 0 && (
              <div className={`text-center py-8 text-xs italic ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Nenhum registro nesta fase
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KanbanBoard;
