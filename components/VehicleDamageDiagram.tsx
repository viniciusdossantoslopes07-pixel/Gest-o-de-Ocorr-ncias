import React, { useState } from 'react';
import { VehicleDamagePoint } from '../types';
import { AlertTriangle, Plus, Trash2, MapPin, Check, Info } from 'lucide-react';

interface VehicleDamageDiagramProps {
  damages: VehicleDamagePoint[];
  onChange: (damages: VehicleDamagePoint[]) => void;
  readOnly?: boolean;
  headerActions?: React.ReactNode;
}

const DAMAGE_TYPES: Array<VehicleDamagePoint['type']> = [
  'Amassado',
  'Riscado',
  'Quebrado',
  'Trincado',
  'Furo',
  'Outros'
];

const VEHICLE_PARTS = [
  'Frente / Para-choque Dianteiro',
  'Capô',
  'Para-brisa',
  'Teto',
  'Traseira / Para-choque Traseiro',
  'Tampa do Porta-malas / Vidro Traseiro',
  'Lateral Esquerda - Para-lama Diant.',
  'Lateral Esquerda - Porta Dianteira',
  'Lateral Esquerda - Porta Traseira',
  'Lateral Esquerda - Para-lama Tras.',
  'Lateral Direita - Para-lama Diant.',
  'Lateral Direita - Porta Dianteira',
  'Lateral Direita - Porta Traseira',
  'Lateral Direita - Para-lama Tras.',
  'Pneu / Roda Diant. Esquerda',
  'Pneu / Roda Diant. Direita',
  'Pneu / Roda Tras. Esquerda',
  'Pneu / Roda Tras. Direita',
  'Retrovisor Esquerdo',
  'Retrovisor Direito',
  'Farol / Lanterna'
];

export const VehicleDamageDiagram: React.FC<VehicleDamageDiagramProps> = ({
  damages = [],
  onChange,
  readOnly = false,
  headerActions
}) => {
  const [selectedPart, setSelectedPart] = useState(VEHICLE_PARTS[0]);
  const [selectedType, setSelectedType] = useState<VehicleDamagePoint['type']>('Amassado');
  const [description, setDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'diagram' | 'list'>('diagram');

  // Coordenadas aproximadas para as partes principais no diagrama esquemático (0-100%)
  const partDefaultCoords: Record<string, { x: number; y: number }> = {
    'Frente / Para-choque Dianteiro': { x: 50, y: 10 },
    'Capô': { x: 50, y: 22 },
    'Para-brisa': { x: 50, y: 34 },
    'Teto': { x: 50, y: 50 },
    'Tampa do Porta-malas / Vidro Traseiro': { x: 50, y: 70 },
    'Traseira / Para-choque Traseiro': { x: 50, y: 88 },
    'Lateral Esquerda - Para-lama Diant.': { x: 22, y: 20 },
    'Lateral Esquerda - Porta Dianteira': { x: 22, y: 38 },
    'Lateral Esquerda - Porta Traseira': { x: 22, y: 55 },
    'Lateral Esquerda - Para-lama Tras.': { x: 22, y: 75 },
    'Lateral Direita - Para-lama Diant.': { x: 78, y: 20 },
    'Lateral Direita - Porta Dianteira': { x: 78, y: 38 },
    'Lateral Direita - Porta Traseira': { x: 78, y: 55 },
    'Lateral Direita - Para-lama Tras.': { x: 78, y: 75 },
    'Pneu / Roda Diant. Esquerda': { x: 12, y: 25 },
    'Pneu / Roda Diant. Direita': { x: 88, y: 25 },
    'Pneu / Roda Tras. Esquerda': { x: 12, y: 72 },
    'Pneu / Roda Tras. Direita': { x: 88, y: 72 },
    'Retrovisor Esquerdo': { x: 26, y: 31 },
    'Retrovisor Direito': { x: 74, y: 31 },
    'Farol / Lanterna': { x: 35, y: 12 }
  };

  const handleAddDamage = (customCoords?: { x: number; y: number }) => {
    if (readOnly) return;
    const coords = customCoords || partDefaultCoords[selectedPart] || { x: 50, y: 50 };
    
    // Gerar código único como 1A, 2R etc (A = Amassado, R = Riscado, Q = Quebrado)
    const typePrefix = selectedType[0].toUpperCase();
    const nextNum = damages.length + 1;
    const code = `${nextNum}${typePrefix}`;

    const newDamage: VehicleDamagePoint = {
      id: `dmg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      x: coords.x,
      y: coords.y,
      part: selectedPart,
      type: selectedType,
      code,
      description: description.trim() || undefined,
      created_at: new Date().toISOString()
    };

    onChange([...damages, newDamage]);
    setDescription('');
  };

  const handleDiagramClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    // Tentar inferir a parte pelo clique
    let guessedPart = selectedPart;
    if (y < 20) guessedPart = 'Frente / Para-choque Dianteiro';
    else if (y > 80) guessedPart = 'Traseira / Para-choque Traseiro';
    else if (x < 35) guessedPart = 'Lateral Esquerda - Porta Dianteira';
    else if (x > 65) guessedPart = 'Lateral Direita - Porta Dianteira';
    else if (y >= 20 && y <= 35) guessedPart = 'Capô';
    else guessedPart = 'Teto';

    setSelectedPart(guessedPart);
    handleAddDamage({ x, y });
  };

  const handleRemoveDamage = (id: string) => {
    if (readOnly) return;
    onChange(damages.filter(d => d.id !== id));
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Inspeção Visual de Avarias (Diagrama da VTR)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {readOnly 
                ? `${damages.length} avaria(s) apontada(s)`
                : 'Clique sobre o desenho da viatura ou selecione a peça para marcar amassados/riscos'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {headerActions}
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
            {damages.length} {damages.length === 1 ? 'avaria' : 'avarias'}
          </span>
        </div>
      </div>

      {!readOnly && (
        <div className="mb-4 bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="w-full sm:w-[28%] shrink-0">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Peça / Região
              </label>
              <select
                value={selectedPart}
                onChange={(e) => setSelectedPart(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none h-[36px]"
              >
                {VEHICLE_PARTS.map((part) => (
                  <option key={part} value={part}>{part}</option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-[22%] shrink-0">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Tipo de Avaria
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none h-[36px]"
              >
                {DAMAGE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="w-full flex-1">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Observação (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Risco 5cm, pequeno amassado"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDamage();
                  }
                }}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none h-[36px]"
              />
            </div>

            <button
              type="button"
              onClick={() => handleAddDamage()}
              className="w-full sm:w-auto px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shrink-0 transition-colors shadow-xs h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          </div>
        </div>
      )}

      {/* Grid: Diagrama SVG à esquerda e Lista de Avarias à direita */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Diagrama Esquemático Veicular similar ao da MOVIDA */}
        <div className="md:col-span-7 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center relative shadow-inner">
          <div className="w-full text-center mb-2">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              FRENTE (DIANTEIRA)
            </span>
          </div>

          <div className="relative w-full max-w-[340px] aspect-[1/1.65]">
            <svg
              viewBox="0 0 100 165"
              className={`w-full h-full select-none ${!readOnly ? 'cursor-crosshair' : ''}`}
              onClick={handleDiagramClick}
            >
              {/* Contorno Geral do Veículo (Estilo Planta Explodida MOVIDA) */}
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-100 dark:text-slate-900" />
                </pattern>
              </defs>
              <rect width="100" height="165" fill="url(#grid)" />

              {/* Para-choque Dianteiro */}
              <path
                d="M 28 8 Q 50 3 72 8 L 76 16 L 24 16 Z"
                className="fill-slate-100 dark:fill-slate-800/80 stroke-slate-400 dark:stroke-slate-600 hover:fill-amber-100 dark:hover:fill-amber-900/40 transition-colors"
                strokeWidth="1"
              />
              {/* Faróis Dianteiros */}
              <polygon points="26,11 36,11 34,15 25,15" className="fill-amber-200/70 dark:fill-amber-400/30 stroke-amber-500" strokeWidth="0.8" />
              <polygon points="74,11 64,11 66,15 75,15" className="fill-amber-200/70 dark:fill-amber-400/30 stroke-amber-500" strokeWidth="0.8" />

              {/* Capô */}
              <path
                d="M 26 18 L 74 18 L 70 38 L 30 38 Z"
                className="fill-slate-50 dark:fill-slate-800/50 stroke-slate-400 dark:stroke-slate-600 hover:fill-amber-100 dark:hover:fill-amber-900/40 transition-colors"
                strokeWidth="1"
              />

              {/* Para-brisa */}
              <path
                d="M 31 40 L 69 40 L 65 58 L 35 58 Z"
                className="fill-sky-100/70 dark:fill-sky-950/40 stroke-sky-400 dark:stroke-sky-600 hover:fill-sky-200 transition-colors"
                strokeWidth="1"
              />

              {/* Retrovisores */}
              <rect x="18" y="42" width="6" height="10" rx="2" className="fill-slate-200 dark:fill-slate-700 stroke-slate-400 dark:stroke-slate-500" strokeWidth="0.8" />
              <rect x="76" y="42" width="6" height="10" rx="2" className="fill-slate-200 dark:fill-slate-700 stroke-slate-400 dark:stroke-slate-500" strokeWidth="0.8" />

              {/* Teto */}
              <path
                d="M 35 60 L 65 60 L 63 95 L 37 95 Z"
                className="fill-slate-50 dark:fill-slate-800/40 stroke-slate-400 dark:stroke-slate-600 hover:fill-amber-100 dark:hover:fill-amber-900/40 transition-colors"
                strokeWidth="1"
              />

              {/* Vidro Traseiro */}
              <path
                d="M 37 97 L 63 97 L 66 114 L 34 114 Z"
                className="fill-sky-100/70 dark:fill-sky-950/40 stroke-sky-400 dark:stroke-sky-600 hover:fill-sky-200 transition-colors"
                strokeWidth="1"
              />

              {/* Tampa do Porta-malas */}
              <path
                d="M 34 116 L 66 116 L 70 134 L 30 134 Z"
                className="fill-slate-50 dark:fill-slate-800/50 stroke-slate-400 dark:stroke-slate-600 hover:fill-amber-100 dark:hover:fill-amber-900/40 transition-colors"
                strokeWidth="1"
              />

              {/* Lanternas Traseiras */}
              <polygon points="28,136 36,136 35,142 27,142" className="fill-red-400/60 dark:fill-red-500/40 stroke-red-600" strokeWidth="0.8" />
              <polygon points="72,136 64,136 65,142 73,142" className="fill-red-400/60 dark:fill-red-500/40 stroke-red-600" strokeWidth="0.8" />

              {/* Para-choque Traseiro */}
              <path
                d="M 26 136 L 74 136 L 72 148 Q 50 152 28 148 Z"
                className="fill-slate-100 dark:fill-slate-800/80 stroke-slate-400 dark:stroke-slate-600 hover:fill-amber-100 dark:hover:fill-amber-900/40 transition-colors"
                strokeWidth="1"
              />

              {/* Laterais e Rodas (Esquerda) */}
              {/* Roda Diant. Esq */}
              <rect x="14" y="24" width="7" height="18" rx="2" className="fill-slate-700 dark:fill-slate-600 stroke-slate-900" strokeWidth="0.8" />
              {/* Roda Tras. Esq */}
              <rect x="14" y="108" width="7" height="18" rx="2" className="fill-slate-700 dark:fill-slate-600 stroke-slate-900" strokeWidth="0.8" />
              {/* Linha Lateral Esquerda */}
              <path d="M 24 16 L 24 136" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="1" />
              <line x1="24" y1="58" x2="35" y2="58" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="0.8" />
              <line x1="24" y1="95" x2="37" y2="95" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="0.8" />

              {/* Laterais e Rodas (Direita) */}
              {/* Roda Diant. Dir */}
              <rect x="79" y="24" width="7" height="18" rx="2" className="fill-slate-700 dark:fill-slate-600 stroke-slate-900" strokeWidth="0.8" />
              {/* Roda Tras. Dir */}
              <rect x="79" y="108" width="7" height="18" rx="2" className="fill-slate-700 dark:fill-slate-600 stroke-slate-900" strokeWidth="0.8" />
              {/* Linha Lateral Direita */}
              <path d="M 76 16 L 76 136" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="1" />
              <line x1="76" y1="58" x2="65" y2="58" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="0.8" />
              <line x1="76" y1="95" x2="63" y2="95" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="0.8" />

              {/* Indicadores de Portas */}
              <text x="8" y="50" className="text-[5px] fill-slate-400 font-bold rotate-[-90deg]">LAT. ESQ</text>
              <text x="96" y="90" className="text-[5px] fill-slate-400 font-bold rotate-[90deg]">LAT. DIR</text>

              {/* Pontos Marcados das Avarias */}
              {damages.map((dmg) => (
                <g key={dmg.id} className="cursor-pointer group">
                  <circle
                    cx={dmg.x}
                    cy={(dmg.y / 100) * 165}
                    r="5.5"
                    className="fill-red-600 stroke-white dark:stroke-slate-900 shadow-md animate-pulse"
                    strokeWidth="1.2"
                  />
                  <text
                    x={dmg.x}
                    y={(dmg.y / 100) * 165 + 1.8}
                    textAnchor="middle"
                    className="fill-white font-black text-[4.5px] select-none pointer-events-none"
                  >
                    {dmg.code}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="w-full text-center mt-2">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              TRASEIRA
            </span>
          </div>
        </div>

        {/* Tabela / Lista de Avarias Registradas */}
        <div className="md:col-span-5 flex flex-col h-full space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Avarias Apontadas
            </span>
            <span className="text-[11px] text-slate-400">
              {damages.length === 0 ? 'Nenhuma' : `${damages.length} item(ns)`}
            </span>
          </div>

          {damages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <Check className="w-8 h-8 text-emerald-500 mb-2 opacity-80" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nenhuma avaria assinalada
              </p>
              <p className="text-[11px] text-slate-400 max-w-[200px] mt-1">
                Veículo conferido sem avarias visíveis.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {damages.map((dmg) => (
                <div
                  key={dmg.id}
                  className="bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2 hover:border-amber-400 dark:hover:border-amber-500/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {dmg.code}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {dmg.part}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                          {dmg.type}
                        </span>
                      </div>
                      {dmg.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {dmg.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDamage(dmg.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0"
                      title="Remover avaria"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="p-2.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              As marcações efetuadas são registradas no relatório oficial e impressas no PDF de checklist.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
