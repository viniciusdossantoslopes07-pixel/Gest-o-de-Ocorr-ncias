
import { useState, useEffect, type FC } from 'react';
import { OCCURRENCE_CATEGORIES, TYPES_BY_CATEGORY } from '../constants';
import { Urgency, Status, Occurrence, User } from '../types';
import { MapPin, Camera, Upload, Send, X, FileText, ChevronDown } from 'lucide-react';

interface OccurrenceFormProps {
  user: User;
  onSubmit: (occurrence: Partial<Occurrence>) => void;
  onCancel: () => void;
  initialCategory?: string;
}

const OccurrenceForm: React.FC<OccurrenceFormProps> = ({ user, onSubmit, onCancel, initialCategory }) => {
  const [formData, setFormData] = useState({
    title: '',
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
    onSubmit({
      ...formData,
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
    <form onSubmit={handleSubmit} className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden sm:max-h-[90vh] flex flex-col">
      <div className="bg-slate-900 p-4 sm:p-6 text-white flex justify-between items-center shrink-0">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold truncate">Novo Registro</h2>
          <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate">Preencha os detalhes da ocorrência de segurança</p>
        </div>
        <button type="button" onClick={onCancel} className="hover:bg-slate-800 p-2 rounded-full transition-colors shrink-0">
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto flex-1 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 col-span-full">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Título da Ocorrência</label>
            <input
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              placeholder="Ex: Falha técnica no sistema de alarme"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Categoria Principal</label>
            <div className="relative">
              <select
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium pr-10"
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                {OCCURRENCE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tipo Específico</label>
            <div className="relative">
              <select
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium pr-10"
                value={formData.type}
                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
              >
                {TYPES_BY_CATEGORY[formData.category].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nível de Urgência</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              value={formData.urgency}
              onChange={e => setFormData(prev => ({ ...prev, urgency: e.target.value as Urgency }))}
            >
              {Object.values(Urgency).map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Localização / Posto</label>
            <div className="flex gap-2">
              <input
                required
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                placeholder="Ex: Guarita Sul"
                value={formData.location}
                onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
              />
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="bg-slate-100 p-3 rounded-xl hover:bg-slate-200 border border-slate-200 transition-colors"
              >
                <MapPin className={`w-5 h-5 ${gettingLocation ? 'animate-pulse text-blue-600' : 'text-slate-500'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Relato Detalhado</label>
          <textarea
            required
            rows={4}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium resize-none"
            placeholder="Descreva a ocorrência com o máximo de detalhes possível..."
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>

        <div className="space-y-4">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Anexos e Evidências</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <label className="cursor-pointer bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center hover:bg-white hover:border-blue-400 transition-all">
              <Camera className="w-8 h-8 text-slate-300 mb-2" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Capturar / Subir</span>
              <input type="file" multiple className="hidden" onChange={handleFileChange} />
            </label>

            {attachments.map((file, i) => (
              <div key={i} className="relative group aspect-square bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center">
                <div className="text-center p-2">
                  <FileText className="w-8 h-8 text-blue-500 mx-auto mb-1" />
                  <p className="text-[10px] text-slate-500 truncate px-2 font-bold">{file.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 shrink-0">
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
          className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors order-2 sm:order-1"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default OccurrenceForm;
