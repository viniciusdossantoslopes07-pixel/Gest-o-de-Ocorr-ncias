import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';
import { X, Send, Lightbulb, CheckCircle, MessageSquare, Clock, Trash2, Star } from 'lucide-react';

interface Suggestion {
    id: string;
    user_id: string;
    user_name: string;
    user_rank: string;
    user_sector: string;
    categoria: string;
    titulo: string;
    descricao: string;
    status: string;
    resposta_admin?: string;
    created_at: string;
}

interface SuggestionsModalProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
    isAdmin?: boolean;
}

const CATEGORIAS = [
    'Melhoria de Interface',
    'Nova Funcionalidade',
    'Correção de Bug',
    'Segurança',
    'Performance',
    'Outro'
];

export default function SuggestionsModal({ user, isOpen, onClose, isAdmin }: SuggestionsModalProps) {
    const [activeView, setActiveView] = useState<'form' | 'list'>('form');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    // Form state
    const [categoria, setCategoria] = useState(CATEGORIAS[0]);
    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [success, setSuccess] = useState(false);

    // Admin response
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const [resposta, setResposta] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchSuggestions();
            if (isAdmin) setActiveView('list');
            else setActiveView('form');
        }
    }, [isOpen]);

    const fetchSuggestions = async () => {
        setLoading(true);
        let query = supabase.from('suggestions').select('*').order('created_at', { ascending: false });
        if (!isAdmin) query = query.eq('user_id', user.id);
        const { data } = await query;
        if (data) setSuggestions(data);
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!titulo.trim() || !descricao.trim()) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }
        setSending(true);
        const { error } = await supabase.from('suggestions').insert({
            user_id: user.id,
            user_name: user.warName || user.name,
            user_rank: user.rank,
            user_sector: user.sector,
            categoria,
            titulo: titulo.trim(),
            descricao: descricao.trim(),
            status: 'Pendente'
        });
        setSending(false);

        if (error) {
            alert('Erro ao enviar sugestão: ' + error.message);
            return;
        }

        setSuccess(true);
        setTitulo('');
        setDescricao('');
        setCategoria(CATEGORIAS[0]);
        fetchSuggestions();
        setTimeout(() => setSuccess(false), 3000);
    };

    const handleAdminRespond = async (id: string) => {
        if (!resposta.trim()) return;
        await supabase.from('suggestions').update({ resposta_admin: resposta.trim(), status: 'Respondida' }).eq('id', id);
        setRespondingId(null);
        setResposta('');
        fetchSuggestions();
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        await supabase.from('suggestions').update({ status }).eq('id', id);
        fetchSuggestions();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja excluir esta sugestão?')) return;
        await supabase.from('suggestions').delete().eq('id', id);
        fetchSuggestions();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pendente': return 'bg-amber-100 text-amber-700';
            case 'Respondida': return 'bg-blue-100 text-blue-700';
            case 'Implementada': return 'bg-emerald-100 text-emerald-700';
            case 'Arquivada': return 'bg-slate-100 text-slate-500';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Lightbulb className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">
                                {isAdmin ? 'Gerenciar Sugestões' : 'Sugestões'}
                            </h3>
                            <p className="text-xs text-white/80">
                                {isAdmin
                                    ? `${suggestions.length} sugestão(ões) recebida(s)`
                                    : 'Sua opinião ajuda a melhorar o sistema!'
                                }
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    {!isAdmin && (
                        <button
                            onClick={() => setActiveView('form')}
                            className={`flex-1 py-2.5 text-xs font-bold uppercase transition-colors ${activeView === 'form' ? 'text-amber-600 border-b-2 border-amber-500' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Nova Sugestão
                        </button>
                    )}
                    <button
                        onClick={() => setActiveView('list')}
                        className={`flex-1 py-2.5 text-xs font-bold uppercase transition-colors ${activeView === 'list' ? 'text-amber-600 border-b-2 border-amber-500' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {isAdmin ? 'Todas as Sugestões' : 'Minhas Sugestões'}
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">

                    {/* FORM VIEW */}
                    {activeView === 'form' && !isAdmin && (
                        <div className="space-y-4 animate-fade-in">
                            {success && (
                                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3 flex items-center gap-2 text-sm font-medium animate-fade-in">
                                    <CheckCircle className="w-4 h-4" /> Sugestão enviada com sucesso! Obrigado pela contribuição.
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Categoria *</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIAS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setCategoria(c)}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${categoria === c
                                                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Título *</label>
                                <input
                                    type="text"
                                    value={titulo}
                                    onChange={e => setTitulo(e.target.value)}
                                    placeholder="Resumo da sua sugestão"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-400 outline-none"
                                    maxLength={100}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Descrição *</label>
                                <textarea
                                    value={descricao}
                                    onChange={e => setDescricao(e.target.value)}
                                    placeholder="Descreva sua sugestão em detalhes. Quanto mais informações, melhor poderemos implementá-la!"
                                    rows={4}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-400 outline-none resize-none"
                                    maxLength={1000}
                                />
                                <p className="text-right text-[10px] text-slate-400 mt-0.5">{descricao.length}/1000</p>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={sending || !titulo.trim() || !descricao.trim()}
                                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-4 h-4" />
                                {sending ? 'Enviando...' : 'Enviar Sugestão'}
                            </button>
                        </div>
                    )}

                    {/* LIST VIEW */}
                    {activeView === 'list' && (
                        <div className="space-y-3 animate-fade-in">
                            {loading ? (
                                <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>
                            ) : suggestions.length === 0 ? (
                                <div className="text-center py-8">
                                    <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-slate-400 text-sm">
                                        {isAdmin ? 'Nenhuma sugestão recebida ainda.' : 'Você ainda não enviou sugestões.'}
                                    </p>
                                </div>
                            ) : (
                                suggestions.map(s => (
                                    <div key={s.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${getStatusColor(s.status)}`}>
                                                        {s.status}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">{s.categoria}</span>
                                                </div>
                                                <h4 className="font-bold text-sm text-slate-800 truncate">{s.titulo}</h4>
                                                {isAdmin && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        {s.user_rank} {s.user_name} — {s.user_sector}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                                    {new Date(s.created_at).toLocaleDateString('pt-BR')}
                                                </span>
                                                {isAdmin && (
                                                    <button onClick={() => handleDelete(s.id)} className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition-colors">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">{s.descricao}</p>

                                        {/* Admin response */}
                                        {s.resposta_admin && (
                                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 mt-2">
                                                <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Resposta da Administração</p>
                                                <p className="text-xs text-blue-800">{s.resposta_admin}</p>
                                            </div>
                                        )}

                                        {/* Admin actions */}
                                        {isAdmin && (
                                            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200 mt-2">
                                                {respondingId === s.id ? (
                                                    <div className="w-full space-y-2">
                                                        <textarea
                                                            value={resposta}
                                                            onChange={e => setResposta(e.target.value)}
                                                            placeholder="Digite sua resposta..."
                                                            rows={2}
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 outline-none resize-none"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleAdminRespond(s.id)} className="px-3 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 transition-colors">
                                                                Enviar Resposta
                                                            </button>
                                                            <button onClick={() => { setRespondingId(null); setResposta(''); }} className="px-3 py-1.5 bg-slate-200 text-slate-600 text-[11px] font-bold rounded-lg hover:bg-slate-300 transition-colors">
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button onClick={() => { setRespondingId(s.id); setResposta(s.resposta_admin || ''); }} className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1">
                                                            <MessageSquare className="w-3 h-3" /> Responder
                                                        </button>
                                                        <button onClick={() => handleUpdateStatus(s.id, 'Implementada')} className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3" /> Implementada
                                                        </button>
                                                        <button onClick={() => handleUpdateStatus(s.id, 'Arquivada')} className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> Arquivar
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
