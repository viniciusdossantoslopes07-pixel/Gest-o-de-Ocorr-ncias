import React, { useState } from 'react';
import { User } from '../types';
import { FileText, Package } from 'lucide-react';
import MissionRequestList from './MissionRequestList';
import MyMaterialLoans from './MyMaterialLoans';
import { supabase } from '../services/supabase';

interface MeuPlanoViewProps {
    user: User;
    isDarkMode?: boolean;
}

export default function MeuPlanoView({ user, isDarkMode = false }: MeuPlanoViewProps) {
    const [activeTab, setActiveTab] = useState<'solicitacoes' | 'cautelas'>('solicitacoes');
    const [missions, setMissions] = React.useState<any[]>([]);

    React.useEffect(() => {
        fetchMyMissions();
    }, [user.id]);

    const fetchMyMissions = async () => {
        const { data } = await supabase
            .from('missoes_gsd')
            .select('*')
            .eq('solicitante_id', user.id)
            .order('data_criacao', { ascending: false });
        if (data) setMissions(data);
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>

                {/* Header */}
                <div className={`p-6 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Meu Plano
                    </h1>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Acompanhe suas solicitações e cautelas
                    </p>
                </div>

                {/* Tabs */}
                <div className={`flex gap-2 px-6 pt-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <button
                        onClick={() => setActiveTab('solicitacoes')}
                        className={`flex items-center gap-2 px-4 py-3 font-bold text-sm rounded-t-xl transition-all ${activeTab === 'solicitacoes'
                                ? isDarkMode
                                    ? 'bg-slate-700 text-white border-b-2 border-blue-500'
                                    : 'bg-slate-50 text-blue-600 border-b-2 border-blue-600'
                                : isDarkMode
                                    ? 'text-slate-400 hover:text-slate-200'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Minhas Solicitações
                    </button>

                    <button
                        onClick={() => setActiveTab('cautelas')}
                        className={`flex items-center gap-2 px-4 py-3 font-bold text-sm rounded-t-xl transition-all ${activeTab === 'cautelas'
                                ? isDarkMode
                                    ? 'bg-slate-700 text-white border-b-2 border-blue-500'
                                    : 'bg-slate-50 text-blue-600 border-b-2 border-blue-600'
                                : isDarkMode
                                    ? 'text-slate-400 hover:text-slate-200'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Package className="w-4 h-4" />
                        Minhas Cautelas
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {activeTab === 'solicitacoes' && (
                        <div>
                            <MissionRequestList
                                missions={missions}
                                onProcess={async () => { }}
                                onGenerateOrder={async () => { }}
                            />
                        </div>
                    )}

                    {activeTab === 'cautelas' && (
                        <div>
                            <MyMaterialLoans userId={user.id} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
