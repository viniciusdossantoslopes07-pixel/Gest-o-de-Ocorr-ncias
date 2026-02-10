
import React from 'react';
import { X, HelpCircle, FileText, CheckCircle, Shield } from 'lucide-react';

interface FAQModalProps {
    onClose: () => void;
}

export default function FAQModal({ onClose }: FAQModalProps) {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-fade-in`}>

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <HelpCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Dúvidas Frequentes</h2>
                            <p className="text-sm text-slate-500">Guia rápido do Guardião GSD-SP</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-8">

                    {/* Topic 1: OMISS */}
                    <section>
                        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4">
                            <FileText className="w-5 h-5 text-indigo-600" />
                            Como gerar uma Ordem de Missão (OMISS)?
                        </h3>
                        <div className="pl-7 space-y-4 text-slate-600 text-sm">
                            <p>O fluxo de geração de OMISS segue 4 etapas principais:</p>
                            <ol className="list-decimal pl-5 space-y-2">
                                <li><strong>Solicitação:</strong> Qualquer militar pode solicitar uma missão através do menu <em>"Solicitar Missão"</em>.</li>
                                <li><strong>Análise (SOP):</strong> A Seção de Operações analisa o pedido no <em>Central de Missões</em> &rarr; <em>Painel de Gestão</em> e gera a OM.</li>
                                <li><strong>Assinatura (CH SOP):</strong> O Chefe da SOP assina digitalmente a OM. É necessário confirmar com a senha de login.</li>
                                <li><strong>Execução:</strong> O Comandante da Missão inicia e finaliza a missão pelo aplicativo.</li>
                            </ol>
                        </div>
                    </section>

                    {/* Topic 2: Password */}
                    <section>
                        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4">
                            <Shield className="w-5 h-5 text-emerald-600" />
                            Segurança e Senhas
                        </h3>
                        <div className="pl-7 space-y-4 text-slate-600 text-sm">
                            <p>Sua senha é sua identidade digital no sistema. Nunca a compartilhe.</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Para alterar sua senha, vá em <em>Configurações</em> &rarr; <em>Segurança</em>.</li>
                                <li>A senha deve conter no mínimo 8 caracteres.</li>
                                <li>A senha é exigida para conferir autenticidade em Assinaturas Digitais.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Topic 3: Theme */}
                    <section>
                        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4">
                            <CheckCircle className="w-5 h-5 text-orange-600" />
                            Dicas Gerais
                        </h3>
                        <div className="pl-7 space-y-4 text-slate-600 text-sm">
                            <p><strong>Modo Noturno:</strong> Utilize o ícone de Lua no menu lateral para reduzir o cansaço visual durante turnos noturnos.</p>
                            <p><strong>Perfil:</strong> Mantenha seu telefone e nome de guerra atualizados para facilitar a comunicação.</p>
                        </div>
                    </section>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors">
                        Fechar Guia
                    </button>
                </div>
            </div>
        </div>
    );
}
