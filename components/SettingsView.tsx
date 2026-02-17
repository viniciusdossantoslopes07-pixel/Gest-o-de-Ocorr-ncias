
import React, { useState } from 'react';
import { User } from '../types';
import { User as UserIcon, Lock, Moon, Camera, Save, AlertTriangle } from 'lucide-react';

interface SettingsViewProps {
    user: User;
    onUpdateUser: (userData: Partial<User>) => Promise<void>;
    onUpdatePassword: (current: string, newPass: string) => Promise<boolean>;
    isDarkMode: boolean;
    onToggleTheme: () => void;
}

export default function SettingsView({ user, onUpdateUser, onUpdatePassword, isDarkMode, onToggleTheme }: SettingsViewProps) {
    const [activeTab, setActiveTab] = useState<'general' | 'security' | 'preferences'>('general');

    // General Form State
    const [warName, setWarName] = useState(user.warName || '');
    const [email, setEmail] = useState(user.email || '');
    const [phone, setPhone] = useState(user.phoneNumber || '');
    const [loading, setLoading] = useState(false);

    // Security Form State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSaveGeneral = async () => {
        setLoading(true);
        try {
            await onUpdateUser({
                warName,
                email,
                phoneNumber: phone
            });
            alert('Perfil atualizado com sucesso!');
        } catch (error) {
            alert('Erro ao atualizar perfil.');
        } finally {
            setLoading(false);
        }
    };

    const handleSavePassword = async () => {
        if (newPassword !== confirmPassword) {
            alert('A nova senha e a confirmação não conferem.');
            return;
        }
        if (newPassword.length < 8) { // Basic check, ideally regex for complexity
            alert('A senha deve ter no mínimo 8 caracteres.');
            return;
        }

        setLoading(true);
        const success = await onUpdatePassword(currentPassword, newPassword);
        setLoading(false);

        if (success) {
            alert('Senha alterada com sucesso!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Configurações</h2>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 gap-6">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <UserIcon className="w-4 h-4" /> Meu Perfil
                </button>
                <button
                    onClick={() => setActiveTab('security')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'security' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Lock className="w-4 h-4" /> Segurança
                </button>
                <button
                    onClick={() => setActiveTab('preferences')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'preferences' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Moon className="w-4 h-4" /> Aparência
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">

                {/* 1. GENERAL TAB */}
                {activeTab === 'general' && (
                    <div className="space-y-8">
                        <div className="flex items-center gap-6">
                            <div className="relative group cursor-pointer">
                                <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                                    {user.name[0]}
                                </div>
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-8 h-8 text-white" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{user.name}</h3>
                                <p className="text-slate-500">{user.rank} - {user.sector}</p>
                                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">SARAM: {user.saram}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nome de Guerra</label>
                                <input
                                    type="text"
                                    value={warName}
                                    onChange={(e) => setWarName(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">E-mail</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Telefone / Ramal</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-400 mb-1">Setor (Apenas Leitura)</label>
                                <input
                                    type="text"
                                    value={user.sector}
                                    disabled
                                    className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <button
                                onClick={handleSaveGeneral}
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {loading ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. SECURITY TAB */}
                {activeTab === 'security' && (
                    <div className="space-y-6 max-w-lg">
                        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-700 rounded-r-lg text-sm flex gap-3">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <p>A nova senha deve conter no mínimo 8 caracteres, incluindo letras, números e símbolos.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Senha Atual</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Nova Senha</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Confirmar Nova Senha</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleSavePassword}
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50"
                            >
                                <Lock className="w-4 h-4" />
                                {loading ? 'Atualizando...' : 'Alterar Senha'}
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. PREFERENCES TAB */}
                {activeTab === 'preferences' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${isDarkMode ? 'bg-indigo-900 text-indigo-200' : 'bg-orange-100 text-orange-500'}`}>
                                    {isDarkMode ? <Moon className="w-6 h-6" /> : <Save className="w-6 h-6" />} {/* Placeholder icon for Sun */}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">Modo Escuro</h4>
                                    <p className="text-sm text-slate-500">Ajusta o contraste para ambientes com pouca luz (SOP Noturno).</p>
                                </div>
                            </div>

                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={isDarkMode} onChange={onToggleTheme} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
