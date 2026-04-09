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
                            Bem-vindo ao guia de suporte integrado. O Guardião GSD-SP centraliza todas as operações críticas da unidade. Abaixo, você encontrará dicas e regras de negócio essenciais para navegar pelos módulos do sistema.
                        </p>
                    </div>

                    {/* Topic 1: Pessoal and BI */}
                    <section>
                        <h3 className="flex items-center gap-3 text-lg font-black text-slate-900 mb-5">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Users className="w-5 h-5" />
                            </div>
                            Pessoal e Mapa de Força
                        </h3>
                        <div className="pl-12 space-y-4 text-slate-600 text-[13px] leading-relaxed">
                            <div className="flex gap-3">
                                <CheckCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                <p><strong>Chamada Diária:</strong> Realizada em dois turnos (Início e Término do expediente). Toda atualização requer validação eletrônica e não pode ser desfeita retroativamente sem autorização superior.</p>
                            </div>
                            <div className="flex gap-3">
                                <BarChart3 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                <p><strong>Mapa de Força (BI):</strong> Oferece visão em tempo real do efetivo pronto para missões. Integra dados de férias, licenças e afastamentos, garantindo transparência à Seção de Operações (SOP).</p>
                            </div>
                            <div className="flex gap-3">
                                <Fingerprint className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                <p><strong>Perfil Militar:</strong> Em Configurações, garanta que seu Registro Cadastral (RC), Identidade Militar e Tipo Sanguíneo estejam sempre atualizados. Esses dados alimentam as Ordens de Missão.</p>
                            </div>
                        </div>
                    </section>

                    {/* Topic 2: Operações e Missões */}
                    <section>
                        <h3 className="flex items-center gap-3 text-lg font-black text-slate-900 mb-5">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                <FileText className="w-5 h-5" />
                            </div>
                            Operações e Missões (OMISS)
                        </h3>
                        <div className="pl-12 space-y-4 text-slate-600 text-[13px] leading-relaxed">
                            <div className="flex gap-3">
                                <Activity className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                <p><strong>Ciclo de Geração de OMISS:</strong></p>
                            </div>
                            <ol className="list-decimal pl-10 space-y-2 font-medium">
                                <li><strong>Solicitação:</strong> O demandante informa área, destino, armamento e efetivo desejado.</li>
                                <li><strong>Análise (SOP):</strong> A Seção de Operações aprova ou rejeita de acordo com as diretrizes de segurança.</li>
                                <li><strong>Autorização:</strong> Somente usuários com privilégio máximo podem assinar o documento final digitalmente.</li>
                                <li><strong>Execução:</strong> Em andamento, o status pode ser atualizado até a desmobilização da equipe.</li>
                            </ol>
                        </div>
                    </section>

                    {/* Topic 3: Segurança e Acesso */}
                    <section>
                        <h3 className="flex items-center gap-3 text-lg font-black text-slate-900 mb-5">
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                                <DoorOpen className="w-5 h-5" />
                            </div>
                            Segurança e Acesso
                        </h3>
                        <div className="pl-12 space-y-4 text-slate-600 text-[13px] leading-relaxed">
                            <div className="flex gap-3">
                                <Shield className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                <p><strong>Controle de Portões:</strong> Módulo exclusivo para a Guarda da Unidade. Registra de forma cirúrgica todas as entradas e saídas de pedestres e veículos em todos os portões (G1, G2, G3).</p>
                            </div>
                            <div className="flex gap-3">
                                <CreditCard className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                <p><strong>Identificação:</strong> Permite buscar instantaneamente pessoas e veículos por placa ou DOC para liberar o acesso recorrente sem recadastramento.</p>
                            </div>
                        </div>
                    </section>

                    {/* Topic 4: Logística e Frota */}
                    <section>
                        <h3 className="flex items-center gap-3 text-lg font-black text-slate-900 mb-5">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                                <Package className="w-5 h-5" />
                            </div>
                            Material, Cautela e Frota
                        </h3>
                        <div className="pl-12 space-y-4 text-slate-600 text-[13px] leading-relaxed">
                            <div className="flex gap-3">
                                <CheckCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                <p><strong>Cautela de Armamento/Material:</strong> Todas as solicitações passam pelo Almoxarifado/Reserva de Armamento. Nenhum item sai sem aprovação e nenhum pendente é encerrado sem o recebimento oficial no retorno.</p>
                            </div>
                            <div className="flex gap-3">
                                <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                <p><strong>Gestão de Frota:</strong> Gerencia o parque de Viaturas Automóveis (VT). Fornece o acompanhamento do fluxo de abastecimento, cotas financeiras mensais por veículo e ordens de manobra.</p>
                            </div>
                        </div>
                    </section>

                    {/* Security Footer */}
                    <section className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">
                        <h3 className="flex items-center gap-2 text-md font-black text-slate-900 mb-4">
                            <Shield className="w-5 h-5 text-slate-700" />
                            Diretrizes de Segurança do Usuário
                        </h3>
                        <div className="space-y-3 text-slate-600 text-xs font-bold uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Criptografia de Dados (End-to-End)
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Autenticação Biométrica e FIDO2/WebAuthn
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Login único de sessão concorrente
                            </div>
                        </div>
                    </section>

                </div>

                {/* Footer: Glassmorphism */}
                <div className="p-5 border-t border-slate-100 bg-slate-50/80 backdrop-blur-xl flex justify-between items-center">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                        Versão 1.5.0 — Guardião GSD-SP
                    </div>
                    <button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95">
                        Fechar Guia
                    </button>
                </div>
            </div>
        </div>
    );
}
