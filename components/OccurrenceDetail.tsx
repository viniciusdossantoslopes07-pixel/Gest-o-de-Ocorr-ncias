
import { useState, useEffect, type FC, Fragment } from 'react';
import { Occurrence, Status, UserRole, User, Urgency } from '../types';
import { STATUS_COLORS, URGENCY_COLORS } from '../constants';
import {
  X, Clock, MapPin, Sparkles, ShieldCheck, Undo2,
  FileText, Edit2, Save, Building2, Printer, ChevronRight, SendHorizontal, Crown,
  ArrowUpRight, AlertCircle
} from 'lucide-react';
import { analyzeOccurrenceWithAI } from '../services/geminiService';

interface OccurrenceDetailProps {
  occurrence: Occurrence;
  user: User;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: Status, comment: string) => void;
  onUpdateOccurrence?: (id: string, updates: Partial<Occurrence>) => void;
  users?: User[];
}

const OccurrenceDetail: React.FC<OccurrenceDetailProps> = ({
  occurrence, user, onClose, onUpdateStatus, onUpdateOccurrence, users = []
}) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [comment, setComment] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(occurrence.title);
  const [editedDescription, setEditedDescription] = useState(occurrence.description);
  const [editedLocation, setEditedLocation] = useState(occurrence.location);
  const [editedUrgency, setEditedUrgency] = useState(occurrence.urgency);

  const handleGenerateAiAnalysis = async () => {
    setIsAiLoading(true);
    setAiAnalysis(null);
    try {
      const analysis = await analyzeOccurrenceWithAI(occurrence);
      setAiAnalysis(analysis);
    } catch (error) {
      setAiAnalysis("Erro ao gerar análise. Tente novamente.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const isAdmin = user.role === UserRole.ADMIN;
  const userLevel = user.accessLevel || 'N1';
  const isOM = userLevel === 'OM';
  const isClosed = occurrence.status === Status.CLOSED || occurrence.status === Status.FINALIZED;

  // Encontrar Posto/Grad e Nome de Guerra do relator
  const creatorUser = users.find(u => u.name === occurrence.creator);
  const creatorDisplay = creatorUser
    ? `${creatorUser.rank} ${creatorUser.warName || creatorUser.name.split(' ').pop()}`
    : occurrence.creator;

  const handleSaveEdit = () => {
    if (onUpdateOccurrence) {
      onUpdateOccurrence(occurrence.id, {
        title: editedTitle,
        description: editedDescription,
        location: editedLocation,
        urgency: editedUrgency
      });
    }
    setIsEditing(false);
  };

  const generateMilitaryReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const timelineHtml = occurrence.timeline.map(t => `
      <div style="margin-bottom: 10px; border-left: 2px solid #ccc; padding-left: 10px;">
        <p style="margin: 0; font-weight: bold;">${t.status}</p>
        <p style="margin: 0; font-size: 0.9em; color: #666;">Por: ${t.updatedBy} em ${new Date(t.timestamp).toLocaleString()}</p>
        <p style="margin: 5px 0 0 0;">${t.comment}</p>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório de Ocorrência - Comando</title>
          <style>
            body { font-family: sans-serif; padding: 40px; line-height: 1.5; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
            .header p { margin: 5px 0 0 0; font-weight: bold; }
            .section { margin-bottom: 25px; }
            .section-title { font-weight: bold; text-transform: uppercase; background: #f0f0f0; padding: 5px 10px; margin-bottom: 10px; border: 1px solid #ddd; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
            .ai-box { background: #f9f9f9; padding: 15px; border: 1px dashed #3b82f6; color: #1e3a8a; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/logo_gsd.jpg" alt="Logo GSD-SP" style="width: 80px; height: auto; margin-bottom: 10px;" />
            <h1>GUARDIÃO GSD-SP - SISTEMA DE DEFESA</h1>
            <p>RELATÓRIO TÉCNICO DE OCORRÊNCIA PARA O COMANDO DA UNIDADE</p>
            <p style="font-size: 12px; margin-top: 10px;">ID: ${occurrence.id}</p>
          </div>
          <div class="section">
            <div class="section-title">Dados Gerais</div>
            <div class="grid">
              <div>
                <p><strong>Título:</strong> ${occurrence.title}</p>
                <p><strong>Tipo:</strong> ${occurrence.type}</p>
                <p><strong>Data:</strong> ${new Date(occurrence.date).toLocaleString()}</p>
              </div>
              <div>
                <p><strong>Local:</strong> ${occurrence.location}</p>
                <p><strong>Relator:</strong> ${occurrence.creator}</p>
                <p><strong>Urgência:</strong> ${occurrence.urgency}</p>
              </div>
            </div>
          </div>
          <div class="section"><div class="section-title">Descrição</div><p>${occurrence.description}</p></div>
          <div class="section"><div class="section-title">Análise IA</div><div class="ai-box">${aiAnalysis || "Não disponível."}</div></div>
          <div class="section"><div class="section-title">Timeline</div>${timelineHtml}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white w-full max-w-6xl h-full sm:h-[90vh] overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between bg-white shrink-0 gap-4">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shrink-0 ${STATUS_COLORS[occurrence.status]}`}>
              {occurrence.status === Status.COMMAND_REVIEW || isOM ? <Crown className="w-5 h-5 sm:w-6 sm:h-6" /> : <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${URGENCY_COLORS[occurrence.urgency]}`}>
                  {occurrence.urgency}
                </span>
                <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 italic">
                  {creatorDisplay}
                </span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full text-lg sm:text-xl font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{occurrence.title}</h2>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 shrink-0">
            {isAdmin && !isEditing && !isClosed && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-2 text-blue-600 font-bold text-xs"
              >
                <Edit2 className="w-4 h-4" /> <span className="hidden sm:inline">Editar</span>
              </button>
            )}
            {isAdmin && !isEditing && (
              <button onClick={generateMilitaryReport} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] sm:text-xs font-bold hover:bg-slate-800 transition-all">
                <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Relatório OM</span><span className="sm:hidden">PDF</span>
              </button>
            )}
            {isEditing && (
              <div className="flex items-center gap-2">
                <button onClick={handleSaveEdit} className="bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"><Save className="w-3 h-3" /> Salvar</button>
                <button onClick={() => setIsEditing(false)} className="bg-slate-100 text-slate-500 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold">X</button>
              </div>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors order-last">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Stepper Status */}
        <div className="bg-slate-50 px-4 sm:px-8 py-3 border-b border-slate-200 flex items-center justify-start sm:justify-center gap-4 overflow-x-auto no-scrollbar">
          {[
            { label: 'Aberto', s: Status.REGISTERED },
            { label: 'N1: Adjunto', s: Status.TRIAGE },
            { label: 'N2: OSD', s: Status.ESCALATED },
            { label: 'N3: Setor', s: Status.RESOLVED },
            { label: 'OM: Comando', s: Status.COMMAND_REVIEW }
          ].map((step, i, arr) => {
            const isActive = occurrence.timeline.some(t => t.status === step.s) || occurrence.status === step.s;
            return (
              <Fragment key={i}>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>{i + 1}</div>
                  <span className={`text-[10px] font-bold uppercase tracking-tighter ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{step.label}</span>
                </div>
                {i < arr.length - 1 && <div className={`w-4 sm:w-12 h-[1px] ${isActive ? 'bg-blue-600' : 'bg-slate-200'}`}></div>}
              </Fragment>
            );
          })}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-slate-50 rounded-2xl p-5 sm:p-6 border border-slate-100 space-y-4 text-sm">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileText className="w-4 h-4" /> Resumo do Registro</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase">Local</p><p className="font-bold text-slate-800">{occurrence.location}</p></div>
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase">Relator</p><p className="font-bold text-slate-800">{occurrence.creator}</p></div>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Relato</p>
                  <p className="text-slate-600 leading-relaxed italic text-xs sm:text-sm">{occurrence.description}</p>
                </div>
              </div>
              <div className="bg-blue-900 rounded-2xl p-5 sm:p-6 text-blue-50 border border-blue-800 shadow-xl overflow-y-auto max-h-[300px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black text-blue-300 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-4 h-4" /> Análise IA</h3>
                  {!aiAnalysis && !isAiLoading && (
                    <button
                      onClick={handleGenerateAiAnalysis}
                      className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold backdrop-blur-sm transition-all flex items-center gap-2 border border-white/10"
                    >
                      <Sparkles className="w-3 h-3" />
                      Analisar
                    </button>
                  )}
                </div>

                {isAiLoading ? (
                  <div className="flex flex-col items-center justify-center py-4 gap-3 text-blue-200 animate-pulse">
                    <div className="w-6 h-6 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs">Processando dados...</span>
                  </div>
                ) : aiAnalysis ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <p className="text-xs sm:text-sm leading-relaxed italic mb-4">{aiAnalysis}</p>
                    <button
                      onClick={handleGenerateAiAnalysis}
                      className="text-[10px] text-blue-300 hover:text-white underline underline-offset-4 opacity-70 hover:opacity-100 transition-opacity"
                    >
                      Refazer análise
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-blue-200/60 italic text-[10px] sm:text-xs">
                    <p>Clique em "Analisar" para obter uma avaliação de risco baseada em IA.</p>
                  </div>
                )}
              </div>
            </div>

            <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Linha do Tempo Militar</h3>
              <div className="space-y-3">
                {occurrence.timeline.map((event) => (
                  <div key={event.id} className="flex gap-3 sm:gap-4 p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100"><ShieldCheck className="w-4 h-4" /></div>
                    <div className="text-xs sm:text-sm min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-bold text-slate-800 uppercase text-[9px] sm:text-[10px]">{event.status}</span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 whitespace-nowrap">{new Date(event.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-500 mt-1 break-words"><strong>{event.updatedBy}:</strong> {event.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50/50 p-4 sm:p-6 flex flex-col gap-6 overflow-y-auto shrink-0">
            {isAdmin ? (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      {isOM ? <Crown className="w-4 h-4 text-amber-500" /> : <ShieldCheck className="w-4 h-4 text-blue-500" />}
                      Despacho de Comando
                    </h3>
                    {isClosed && (
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-500 rounded text-[9px] font-black uppercase">Finalizado</span>
                    )}
                  </div>

                  {/* Assignment Dropdown */}
                  <div className={`bg-slate-100 p-3 rounded-xl border border-slate-200 ${isClosed ? 'opacity-60 grayscale' : ''}`}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Atribuir Responsável</label>
                    <div className="flex gap-2">
                      <select
                        disabled={isClosed}
                        className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none disabled:cursor-not-allowed"
                        value={occurrence.assigned_to || ''}
                        onChange={(e) => {
                          if (onUpdateOccurrence) {
                            onUpdateOccurrence(occurrence.id, { assigned_to: e.target.value });
                          }
                        }}
                      >
                        <option value="">Selecione um responsável...</option>
                        {users.map(u => (
                          <option key={u.id} value={u.name}>{u.name} ({u.rank})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      disabled={isClosed}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                      rows={4}
                      placeholder={isClosed ? "Registro finalizado para alterações." : "Escreva seu parecer..."}
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                    />
                    {isClosed && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <AlertCircle className="w-8 h-8 text-slate-300 opacity-20" />
                      </div>
                    )}
                  </div>

                  {/* Botão Salvar Comentário */}
                  {comment.trim() && !isClosed && (
                    <button
                      onClick={() => {
                        if (!comment.trim()) {
                          alert('Digite um comentário antes de salvar.');
                          return;
                        }
                        onUpdateStatus(occurrence.id, occurrence.status, comment);
                        setComment('');
                      }}
                      className="w-full mt-2 py-2 bg-slate-600 text-white rounded-lg font-bold text-xs hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Salvar Comentário
                    </button>
                  )}
                </div>

                <div className={`space-y-3 border-t border-slate-200 pt-4 ${isClosed ? 'hidden' : ''}`}>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ações Hierárquicas</p>

                  {/* PAINEL ESPECIAL COMANDANTE OM - GERENCIAMENTO TOTAL */}
                  {isOM && (
                    <div className="space-y-3 p-4 bg-slate-900 rounded-2xl border border-amber-500/30 shadow-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1"><Crown className="w-3 h-3" /> Console de Comando</p>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <button onClick={() => onUpdateStatus(occurrence.id, Status.TRIAGE, comment || 'Escalonamento Direto via Comando OM p/ N1.')} className="w-full py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg font-bold text-[10px] uppercase hover:bg-blue-600/30 transition-all flex items-center justify-between px-3">
                          Direto p/ N1 (Adjunto) <ArrowUpRight className="w-3 h-3" />
                        </button>
                        <button onClick={() => onUpdateStatus(occurrence.id, Status.ESCALATED, comment || 'Escalonamento Direto via Comando OM p/ N2.')} className="w-full py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg font-bold text-[10px] uppercase hover:bg-purple-600/30 transition-all flex items-center justify-between px-3">
                          Direto p/ N2 (OSD) <ArrowUpRight className="w-3 h-3" />
                        </button>
                        <button onClick={() => onUpdateStatus(occurrence.id, Status.RESOLVED, comment || 'Escalonamento Direto via Comando OM p/ N3.')} className="w-full py-2 bg-orange-600/20 text-orange-400 border border-orange-500/30 rounded-lg font-bold text-[10px] uppercase hover:bg-orange-600/30 transition-all flex items-center justify-between px-3">
                          Direto p/ N3 (Setor) <ArrowUpRight className="w-3 h-3" />
                        </button>
                        <div className="h-[1px] bg-white/10 my-1" />
                        <button
                          onClick={() => {
                            if (!comment) {
                              alert('O Comando deve inserir um parecer final antes de arquivar.');
                              return;
                            }
                            onUpdateStatus(occurrence.id, Status.CLOSED, comment);
                          }}
                          className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                          <ShieldCheck className="w-4 h-4" /> Finalizar e Arquivar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* FLUXOS PADRÃO POR NÍVEL (N1, N2, N3) */}
                  {!isOM && (
                    <div className="space-y-2">
                      {/* N1: Adjunto / Oficial de Dia */}
                      {userLevel === 'N1' && (occurrence.status === Status.REGISTERED || occurrence.status === Status.RETURNED) && (
                        <button onClick={() => onUpdateStatus(occurrence.id, Status.TRIAGE, comment || 'Assumido para triagem pelo N1 (Adjunto).')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-xs">Assumir Triagem N1</button>
                      )}

                      {/* Ações do N1 (Agora envia para N2: OSD) */}
                      {userLevel === 'N1' && occurrence.status === Status.TRIAGE && (
                        <div className="grid grid-cols-1 gap-2">
                          <button onClick={() => onUpdateStatus(occurrence.id, Status.ESCALATED, comment || 'Triagem N1 concluída. Segue para N2 (OSD).')} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2"><SendHorizontal className="w-4 h-4" /> Enviar p/ N2 (OSD)</button>

                          {/* Opção de N1 enviar direto para N3 se selecionar setor (mas fluxo pede N2 primeiro, deixaremos opcional se desejado, mas user pediu N1 -> N2) */}

                          <button onClick={() => onUpdateStatus(occurrence.id, Status.RETURNED, comment || 'Solicitado ajuste de informações pelo N1.')} className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2"><Undo2 className="w-4 h-4" /> Devolver p/ Ajuste</button>
                        </div>
                      )}

                      {/* Ações do N2 (OSD) - Envia para N3 (Setor) ou Finaliza */}
                      {userLevel === 'N2' && occurrence.status === Status.ESCALATED && (
                        <div className="grid grid-cols-1 gap-2">
                          {/* Só pode enviar para N3 se tiver setor atribuído */}
                          <div className="p-3 bg-orange-50 rounded-xl border border-orange-100 mb-2">
                            <p className="text-[10px] font-bold text-orange-600 uppercase mb-2">Atribuir Setor (N3)</p>
                            <select
                              className="w-full bg-white border border-orange-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-orange-500 outline-none mb-2"
                              value={occurrence.sector || ''}
                              onChange={(e) => {
                                if (onUpdateOccurrence) {
                                  onUpdateOccurrence(occurrence.id, { sector: e.target.value });
                                }
                              }}
                            >
                              <option value="">Selecione um Setor...</option>
                              <option value="SOP">SOP</option>
                              <option value="SAP">SAP</option>
                              <option value="GSAU">GSAU</option>
                              <option value="INTELIGENCIA">INTELIGÊNCIA</option>
                              <option value="COMUNICACAO">COMUNICAÇÃO</option>
                              <option value="JURIDICO">JURÍDICO</option>
                            </select>
                            <button
                              disabled={!occurrence.sector}
                              onClick={() => onUpdateStatus(occurrence.id, Status.RESOLVED, comment || `Encaminhado ao setor ${occurrence.sector} para providências (N3).`)}
                              className="w-full py-2 bg-orange-600 text-white rounded-lg font-bold text-[10px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Enviar p/ Setor (N3)
                            </button>
                          </div>

                          <button onClick={() => onUpdateStatus(occurrence.id, Status.TRIAGE, comment || 'Retornado ao N1 para complementação.')} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2"><Undo2 className="w-4 h-4" /> Devolver ao N1</button>
                        </div>
                      )}

                      {/* Ações do N3 (Setor) */}
                      {userLevel === 'N3' && occurrence.status === Status.RESOLVED && (
                        <div className="grid grid-cols-1 gap-2">
                          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 mb-2">
                            <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Setor Responsável: {occurrence.sector || 'Não definido'}</p>
                            <p className="text-[10px] text-slate-500 italic">Realize as ações necessárias. Você pode finalizar diretamente ou devolver.</p>
                          </div>

                          <button
                            onClick={() => {
                              if (!comment) {
                                alert('Por favor, descreva a tratativa realizada no campo de despacho antes de finalizar.');
                                return;
                              }
                              onUpdateStatus(occurrence.id, Status.CLOSED, comment);
                            }}
                            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all"
                          >
                            <ShieldCheck className="w-4 h-4" /> Finalizar Tratativa (N3)
                          </button>

                          <button onClick={() => onUpdateStatus(occurrence.id, Status.ESCALATED, comment || 'Ação do setor parcial/concluída. Retornando ao N2 (OSD).')} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2"><Undo2 className="w-4 h-4" /> Devolver p/ N2 (OSD)</button>
                        </div>
                      )}

                      {/* Botão de Finalização Direta (Qualquer Nível Master ou N2 OSD se decidir finalizar direto) */}
                      {(isOM || isAdmin || userLevel === 'N2') && (
                        <div className="pt-2 border-t border-slate-200 mt-2">
                          <button
                            onClick={() => {
                              if (!comment) {
                                alert('Por favor, descreva a tratativa realizada no campo de despacho antes de finalizar.');
                                return;
                              }
                              onUpdateStatus(occurrence.id, Status.CLOSED, comment);
                            }}
                            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-sm"
                          >
                            <ShieldCheck className="w-4 h-4" /> Finalizar Registro
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* BOTÃO MARCAR COMO PENDENTE - Disponível para todos */}
                  {occurrence.status !== Status.PENDING && occurrence.status !== Status.CLOSED && (
                    <button
                      onClick={() => onUpdateStatus(occurrence.id, Status.PENDING, comment || 'Marcado como pendente')}
                      className="w-full py-3 bg-yellow-600/10 text-yellow-700 border border-yellow-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-yellow-600/20 transition-all"
                    >
                      <Clock className="w-4 h-4" /> Marcar como Pendente
                    </button>
                  )}
                </div>

                {isClosed && (
                  <div className="text-center p-6 bg-slate-100/50 border border-dashed border-slate-300 rounded-2xl">
                    <ShieldCheck className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight">Registro Finalizado</p>
                    <p className="text-[9px] text-slate-400 mt-1 uppercase italic">Este documento não permite mais alterações administrativas.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-6 bg-white border border-slate-100 rounded-2xl">
                <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Protocolo Seguro</p>
                <p className="text-[10px] text-slate-400 mt-2">Aguardando análise da cadeia de comando.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OccurrenceDetail;
