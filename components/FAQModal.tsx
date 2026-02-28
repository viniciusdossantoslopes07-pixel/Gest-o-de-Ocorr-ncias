import React from 'react';
import {
    X, HelpCircle, FileText, CheckCircle, Shield,
    Users, Package, DoorOpen, BarChart3, Fingerprint,
    Info, Calendar, CreditCard, Activity
} from 'lucide-react';

interface FAQModalProps {
    onClose: () => void;
}

export default function FAQModal({ onClose }: FAQModalProps) {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
            <div className={`bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 border border-slate-200`}>

                {/* Header: Glassmorphism effect */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                            <HelpCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Dúvidas Frequentes</h2>
                            <p className="text-xs font-bold uppercase tracking-widest text-blue-600/70">Central de Suporte Guardião GSD-SP</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400 hover:text-slate-600 active:scale-95">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content: Smooth Scrolling */}
                <div className="p-6 overflow-y-auto space-y-10 custom-scrollbar bg-white">

                    {/* Intro Note */}
                    <div className="bg-blue-50/50 border border-blue-100/50 p-4 rounded-2xl flex gap-3 items-start">
                        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-xs font-medium text-blue-800 leading-relaxed">
                            Bem-vindo ao guia de suporte integrado. Abaixo, você encontrará dicas essenciais para navegar pelos módulos de Missões, Pessoal, Logística e Inteligência do sistema.
                        </p>
                    </div>

                    {/* Topic 1: Pessoal (NEW) */}
                    <section>
                        <h3 className="flex items-center gap-3 text-lg font-black text-slate-900 mb-5">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                <Users className="w-5 h-5" />
                            </div>
                            Gestão de Pessoal e Efetivo
                        </h3>
                        <div className="pl-12 space-y-4 text-slate-600 text-[13px] leading-relaxed">
                            <div className="flex gap-3">
                                <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                                <p><strong>Chamada Diária:</strong> Deve ser realizada em dois turnos (Início e Término). A <strong>assinatura digital</strong> bloqueia edições retroativas para garantir a integridade dos dados.</p>
                            </div>
                            <div className="flex gap-3">
                                <Fingerprint className="w-4 h-4 text-emerald-500 shrink-0" />
                                <p><strong>Perfil Militar:</strong> Na aba <em>Configurações</em>, mantenha seu <strong>RC, Identidade Militar e Contatos de Emergência</strong> atualizados. Isso é vital para a geração automática de documentos.</p>
                            </div>
                        </div>
                    </section>

                    {/* Topic 2: Logística (NEW) */}
                    <section>
                        <h3 className="flex items-center gap-3 text-lg font-black text-slate-900 mb-5">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                                <Package className="w-5 h-5" />
                            </div>
                            Logística e Material
                        </h3>
                        <div className="pl-12 space-y-4 text-slate-600 text-[13px] leading-relaxed">
                            <div className="flex gap-3">
                                <CheckCircle className="w-4 h-4 text-orange-500 shrink-0" />
                                <p><strong>Cautela:</strong> Ao solicitar material, aguarde a aprovação do Almoxarifado. Você pode acompanhar o status em <em>"Minhas Cautelas"</em> no menu lateral.</p>
                            </div>
                            <div className="flex gap-3">
                                <Info className="w-4 h-4 text-orange-500 shrink-0" />
                                <p><strong>Devolução:</strong> Certifique-se de que o material foi devidamente "Recebido" pelo responsável para encerrar a pendência em seu nome.</p>
                            </div>
                        </div>
                    </section>

                    {/* Topic 3: Missões (OMISS) */}
                    <section>
                        <h3 className="flex items-center gap-3 text-lg font-black text-slate-900 mb-5">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <FileText className="w-5 h-5" />
                            </div>
                            Ordens de Missão (OMISS)
                        </h3>
                        <div className="pl-12 space-y-4 text-slate-600 text-[13px] leading-relaxed">
                            <p className="font-bold text-indigo-700">Fluxo de Geração (4 Etapas):</p>
                            <ol className="list-decimal pl-5 space-y-2 font-medium">
                                <li><strong>Solicitação:</strong> Utilize o menu <em>"Solicitar Missão"</em> e preencha o itinerário.</li>
                                <li><strong>Análise (SOP):</strong> A Seção de Operações avalia a viabilidade no <em>Painel de Gestão</em>.</li>
                                <li><strong>Assinatura:</strong> O Chefe da SOP autentica o documento digitalmente com senha.</li>
                                <li><strong>Execução:</strong> O Comandante da Missão reporta o início e fim pelo App.</li>
                            </ol>
                        </div>
                    </section>

                    {/* Topic 4: Acesso (NEW) */}
                    <section>
                        <h3 className="flex items-center gap-3 text-lg font-black text-slate-900 mb-5">
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                                <DoorOpen className="w-5 h-5" />
                            </div>
                            Controle de Acesso
                        </h3>
                        <div className="pl-12 space-y-4 text-slate-600 text-[13px] leading-relaxed">
                            <div className="flex gap-3">
                                <CreditCard className="w-4 h-4 text-rose-500 shrink-0" />
                                <p><strong>Visitantes:</strong> O registro preciso de entrada/saída é auditável. Use o módulo <em>Acesso Visitantes</em> para monitorar o fluxo de civis na Unidade.</p>
                            </div>
                            <div className="flex gap-3">
                                <Shield className="w-4 h-4 text-rose-500 shrink-0" />
                                <p><strong>Estacionamento:</strong> Autorizações digitais geram <strong>QR Codes</strong> únicos que facilitam o controle nas guaritas via leitura óptica.</p>
                            </div>
                        </div>
                    </section>

                    {/* Topic 5: Inteligência e BI (NEW) */}
                    <section>
                        <h3 className="flex items-center gap-3 text-lg font-black text-slate-900 mb-5">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                <BarChart3 className="w-5 h-5" />
                            </div>
                            Inteligência e BI
                        </h3>
                        <div className="pl-12 space-y-4 text-slate-600 text-[13px] leading-relaxed">
                            <div className="flex gap-3">
                                <Activity className="w-4 h-4 text-blue-500 shrink-0" />
                                <p><strong>Mapa de Força:</strong> Visualize a distribuição do efetivo em tempo real e identifique disponibilidades para missões imediatas no <em>Painel de Inteligência</em>.</p>
                            </div>
                        </div>
                    </section>

                    {/* Topic 6: Security */}
                    <section className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">
                        <h3 className="flex items-center gap-2 text-md font-black text-slate-900 mb-4">
                            <Shield className="w-5 h-5 text-slate-700" />
                            Segurança de Acesso
                        </h3>
                        <div className="space-y-3 text-slate-600 text-xs font-bold uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Senha mínima de 8 caracteres
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Acesso biométrico disponível no mobile
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Login único por dispositivo simultâneo
                            </div>
                        </div>
                    </section>

                </div>

                {/* Footer: Glassmorphism */}
                <div className="p-5 border-t border-slate-100 bg-slate-50/80 backdrop-blur-xl flex justify-between items-center">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                        Versão 1.2.0 — Guardião GSD-SP
                    </div>
                    <button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95">
                        Fechar Guia
                    </button>
                </div>
            </div>
        </div>
    );
}
