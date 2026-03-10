
import { useState, useEffect, type FC } from 'react';
import { OCCURRENCE_CATEGORIES, TYPES_BY_CATEGORY } from '../constants';
import { Urgency, Status, Occurrence, User } from '../types';
import { MapPin, Camera, Upload, Send, X, FileText, ChevronDown } from 'lucide-react';

interface OccurrenceFormProps {
  user: User;
  onSubmit: (occurrence: Partial<Occurrence>) => void;
  onCancel: () => void;
  initialCategory?: string;
  isDarkMode?: boolean;
}

const OccurrenceForm: React.FC<OccurrenceFormProps> = ({ user, onSubmit, onCancel, initialCategory, isDarkMode = false }) => {
  const dk = isDarkMode;
  const cardBg = dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const sectionBg = dk ? 'bg-slate-900/50 border-slate-700/50' : 'bg-slate-50 border-slate-200';
  const inputBg = dk ? 'bg-slate-800 border-slate-600 text-white shadow-none' : 'bg-white border-slate-200 text-slate-700 shadow-sm';
  const textTitle = dk ? 'text-white' : 'text-slate-700';
  const textSub = dk ? 'text-slate-400' : 'text-slate-500';

  const [formData, setFormData] = useState({
    category: initialCategory || OCCURRENCE_CATEGORIES[0],
    type: TYPES_BY_CATEGORY[initialCategory || OCCURRENCE_CATEGORIES[0]][0],
    urgency: Urgency.MEDIUM,
    location: '',
    description: '',
    date: new Date().toISOString().slice(0, 16),
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Atualiza o tipo quando a categoria muda
  useEffect(() => {
    if (TYPES_BY_CATEGORY[formData.category]) {
      setFormData(prev => ({
        ...prev,
        type: TYPES_BY_CATEGORY[formData.category][0]
      }));
    }
  }, [formData.category]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getCurrentLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({ ...prev, location: `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}` }));
        setGettingLocation(false);
      },
      () => {
        alert("Não foi possível obter a localização.");
        setGettingLocation(false);
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const autoTitle = formData.location ? `${formData.type} em ${formData.location}` : formData.type;
    onSubmit({
      ...formData,
      title: autoTitle,
      creator: user.name,
      status: Status.TRIAGE,
      attachments: attachments.map((f, i) => ({
        id: Math.random().toString(),
        name: f.name,
        type: f.type.includes('image') ? 'image' : 'doc',
        url: URL.createObjectURL(f)
      })),
      timeline: [{
        id: Math.random().toString(),
        status: Status.TRIAGE,
        updatedBy: user.name,
        timestamp: new Date().toISOString(),
        comment: 'Ocorrência registrada no sistema.'
      }]
    });
  };

  return (
    <form onSubmit={handleSubmit} className={`${cardBg} w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl border overflow-hidden sm:max-h-[90vh] flex flex-col`}>
      <div className="bg-slate-900 p-4 sm:p-6 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold truncate">Novo Registro</h2>
          <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate">Preencha os detalhes da ocorrência de segurança</p>
        </div>
        <button type="button" onClick={onCancel} className="hover:bg-slate-800 p-2 rounded-full transition-colors shrink-0">
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto flex-1 custom-scrollbar">
        {/* Bloco 1: Classificação */}
        <div className={`${sectionBg} border rounded-2xl p-5 space-y-4`}>
          <h3 className={`text-sm font-black ${textTitle} uppercase tracking-tight flex items-center gap-2 mb-2`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${dk ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>1</span>
            Classificação
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>Categoria Principal</label>
              <div className="relative">
                <select
                  className={`w-full appearance-none rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-sm md:text-base pr-10 transition-all ${inputBg}`}
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                >
                  {OCCURRENCE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>Tipo Específico</label>
              <div className="relative">
                <select
                  className={`w-full appearance-none rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-sm md:text-base pr-10 transition-all ${inputBg}`}
                  value={formData.type}
                  onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                >
                  {TYPES_BY_CATEGORY[formData.category].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 2: Gravidade e Localização */}
        <div className={`${sectionBg} border rounded-2xl p-5 space-y-4`}>
          <h3 className={`text-sm font-black ${textTitle} uppercase tracking-tight flex items-center gap-2 mb-2`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${dk ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>2</span>
            Gravidade e Localização
          </h3>

          <div className="space-y-2 mb-4">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Nível de Urgência</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.values(Urgency).map((u) => {
                const isSelected = formData.urgency === u;
                // Definindo cores baseadas na constantes nativas mas otimizando hover e active forms
                let bgClass = dk ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50";
                if (isSelected) {
                  if (u === Urgency.LOW) bgClass = dk ? "bg-slate-700 text-white border-slate-600 shadow-md" : "bg-slate-800 text-white border-slate-800 shadow-md";
                  if (u === Urgency.MEDIUM) bgClass = "bg-blue-600 text-white border-blue-600 shadow-md";
                  if (u === Urgency.HIGH) bgClass = "bg-orange-500 text-white border-orange-500 shadow-md";
                  if (u === Urgency.CRITICAL) bgClass = "bg-red-600 text-white border-red-600 shadow-md shadow-red-500/30 font-black scale-105 z-10 transition-transform ring-2 ring-red-100";
                }

                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, urgency: u }))}
                    className={`py-2.5 px-2 rounded-xl border text-xs sm:text-sm font-bold uppercase transition-all ${bgClass}`}
                  >
                    {u}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>Localização / Posto</label>
            <div className="flex gap-2 relative">
              <input
                required
                className={`flex-1 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-sm md:text-base transition-all ${inputBg}`}
                placeholder="Onde aconteceu?"
                value={formData.location}
                onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
              />
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className={`${dk ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'} px-4 rounded-xl border transition-colors flex items-center justify-center shadow-sm`}
                title="Capturar minha localização"
              >
                <MapPin className={`w-5 h-5 ${gettingLocation ? 'animate-pulse text-blue-600' : 'text-slate-500'}`} />
              </button>
            </div>
            <p className="text-[9px] font-bold text-slate-400 pl-1">Ao omitir o preenchimento, usaremos "Ocorrência Diversa"</p>
          </div>
        </div>

        {/* Bloco 3: Relato e Evidências */}
        <div className={`${sectionBg} border rounded-2xl p-5 space-y-4`}>
          <h3 className={`text-sm font-black ${textTitle} uppercase tracking-tight flex items-center gap-2 mb-2`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${dk ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>3</span>
            Relato Histórico
          </h3>

          <div className="space-y-1.5">
            <textarea
              required
              rows={4}
              className={`w-full rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium resize-none text-sm transition-all ${inputBg}`}
              placeholder="Descreva a ocorrência em ordem cronológica com o máximo de detalhes possível..."
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="space-y-3 mt-6">
            <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>Anexos e Evidências Fotográficas</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <label className={`cursor-pointer border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all group ${dk ? 'bg-slate-800 border-slate-600 hover:bg-slate-700 hover:border-blue-500' : 'bg-white border-slate-300 hover:bg-slate-50 hover:border-blue-400'}`}>
                <Camera className={`w-8 h-8 mb-2 group-hover:text-blue-500 transition-colors ${dk ? 'text-slate-500' : 'text-slate-300'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-tighter group-hover:text-blue-500 transition-colors ${dk ? 'text-slate-400' : 'text-slate-400'}`}>Capturar / Subir</span>
                <input type="file" multiple className="hidden" onChange={handleFileChange} />
              </label>

              {attachments.map((file, i) => (
                <div key={i} className={`relative group aspect-square border rounded-2xl overflow-hidden flex items-center justify-center shadow-sm ${dk ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                  <div className="text-center p-2">
                    <FileText className={`w-8 h-8 mx-auto mb-1 group-hover:scale-110 transition-transform ${dk ? 'text-slate-500' : 'text-slate-400'}`} />
                    <p className={`text-[9px] truncate px-2 font-bold max-w-[80px] ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{file.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`${dk ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} p-4 sm:p-6 border-t flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 shrink-0`}>
        <button
          type="submit"
          className="w-full sm:w-auto bg-blue-600 px-8 py-3 rounded-xl font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 order-1 sm:order-2"
        >
          <Send className="w-4 h-4" />
          Registrar Ocorrência
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition-colors order-2 sm:order-1 ${dk ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-200'}`}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default OccurrenceForm;
