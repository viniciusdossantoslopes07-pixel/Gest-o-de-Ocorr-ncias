import React, { useState } from 'react';
import { XCircle, AlertTriangle, MessageSquare, CheckCircle } from 'lucide-react';

interface RejectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string, isLoss: boolean) => void;
    title?: string;
    description?: string;
    requireLossConfirmation?: boolean;
    isDarkMode?: boolean;
}

export default function RejectionModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Motivo da Rejeição',
    description = 'Por favor, informe o motivo para rejeitar esta solicitação.',
    requireLossConfirmation = false,
    isDarkMode = false
}: RejectionModalProps) {
    const [reason, setReason] = useState('');
    const [isLoss, setIsLoss] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!reason.trim()) {
            alert('Por favor, informe o motivo da rejeição.');
            return;
        }
        onConfirm(reason, isLoss);
        setReason('');
        setIsLoss(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-in border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/10 bg-red-600/10 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <h2 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
                            <p className="text-red-500 text-xs font-bold uppercase">{description}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-500/10 hover:bg-slate-500/20 rounded-full transition-colors">
                        <XCircle className={`w-5 h-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className={`block text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            Observação / Parecer
                        </label>
                        <div className="relative">
                            <MessageSquare className={`absolute left-4 top-4 w-5 h-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Descreva o motivo da recusa em detalhes..."
                                className="w-full pl-12 pr-4 py-4 rounded-xl text-sm font-medium outline-none transition-all resize-none h-32 focus:ring-2 focus:ring-red-500/50 glass-input"
                                autoFocus
                            />
                        </div>
                    </div>

                    {requireLossConfirmation && (
                        <div className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${isLoss ? (isDarkMode ? 'bg-amber-900/30 border-amber-500/50' : 'bg-amber-50 border-amber-300') : (isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200')}`} onClick={() => setIsLoss(!isLoss)}>
                            <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${isLoss ? 'bg-amber-500 text-white' : (isDarkMode ? 'bg-slate-700' : 'bg-white border text-transparent')}`}>
                                <CheckCircle className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className={`text-sm font-bold uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Houve Perda de Material?</h4>
                                <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Marque esta opção se o material foi perdido, danificado permanentemente ou extraviado.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-6 py-4 flex gap-3 ${isDarkMode ? 'bg-slate-900/50 border-t border-slate-700' : 'bg-slate-50 border-t border-slate-100'}`}>
                    <button onClick={onClose} className={`flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={!reason.trim()} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/20 active:scale-95">
                        Confirmar Rejeição
                    </button>
                </div>
            </div>
        </div>
    );
}
