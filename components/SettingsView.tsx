
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { User as UserIcon, Lock, Moon, Camera, Save, AlertTriangle, Loader2, Trash2, ImagePlus, Fingerprint } from 'lucide-react';
import { supabase } from '../services/supabase';
import { registerBiometrics, isWebAuthnSupported } from '../services/webauthn';

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

    // Photo upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoUrl, setPhotoUrl] = useState(user.photo_url || '');

    // Security Form State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas imagens (JPG, PNG, etc.).');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 2MB.');
            return;
        }

        // Preview
        const reader = new FileReader();
        reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
        reader.readAsDataURL(file);

        // Upload
        handlePhotoUpload(file);
    };

    const handlePhotoUpload = async (file: File) => {
        setUploadingPhoto(true);
        try {
            const ext = file.name.split('.').pop();
            const filePath = `${user.id}/avatar.${ext}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                alert('Erro ao fazer upload da imagem. Verifique se o bucket "avatars" existe no Supabase Storage.');
                setPhotoPreview(null);
                return;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const publicUrl = urlData.publicUrl + '?t=' + Date.now(); // Cache bust

            // Save URL to user profile
            await onUpdateUser({ photo_url: publicUrl });
            setPhotoUrl(publicUrl);
            setPhotoPreview(null);
        } catch (err) {
            console.error(err);
            alert('Erro inesperado ao enviar a foto.');
            setPhotoPreview(null);
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleRemovePhoto = async () => {
        if (!confirm('Deseja remover a foto de perfil?')) return;
        setUploadingPhoto(true);
        try {
            // Remove from storage
            const fileParts = photoUrl.split('/avatars/')[1]?.split('?')[0];
            if (fileParts) {
                await supabase.storage.from('avatars').remove([fileParts]);
            }
            // Clear from profile
            await onUpdateUser({ photo_url: '' });
            setPhotoUrl('');
            setPhotoPreview(null);
        } catch (err) {
            console.error(err);
            alert('Erro ao remover foto.');
        } finally {
            setUploadingPhoto(false);
        }
    };

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
        if (newPassword.length < 8) {
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

    const displayPhoto = photoPreview || photoUrl;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Configurações</h2>

            {/* Tabs */}
            <div className={`flex border-b gap-6 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
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
            <div className={`rounded-2xl shadow-sm border p-8 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>

                {/* 1. GENERAL TAB */}
                {activeTab === 'general' && (
                    <div className="space-y-8">
                        <div className="flex items-center gap-6">
                            {/* Avatar with upload */}
                            <div className="relative group">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={handlePhotoSelect}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingPhoto}
                                    className="relative w-24 h-24 rounded-full overflow-hidden shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all"
                                >
                                    {displayPhoto ? (
                                        <img src={displayPhoto} alt="Foto de perfil" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-blue-600 flex items-center justify-center text-3xl font-bold text-white">
                                            {user.name[0]}
                                        </div>
                                    )}
                                    {/* Hover overlay */}
                                    <div className={`absolute inset-0 rounded-full flex flex-col items-center justify-center transition-opacity ${uploadingPhoto ? 'opacity-100 bg-black/60' : 'opacity-0 group-hover:opacity-100 bg-black/40'}`}>
                                        {uploadingPhoto ? (
                                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                                        ) : (
                                            <>
                                                <Camera className="w-6 h-6 text-white" />
                                                <span className="text-[9px] font-bold text-white mt-0.5 uppercase">Alterar</span>
                                            </>
                                        )}
                                    </div>
                                </button>
                                {/* Remove photo button */}
                                {photoUrl && !uploadingPhoto && (
                                    <button
                                        onClick={handleRemovePhoto}
                                        className="absolute -bottom-1 -right-1 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100"
                                        title="Remover foto"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            <div>
                                <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.name}</h3>
                                <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{user.rank} - {user.sector}</p>
                                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">SARAM: {user.saram}</p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingPhoto}
                                    className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 transition-colors"
                                >
                                    <ImagePlus className="w-3.5 h-3.5" />
                                    {photoUrl ? 'Trocar foto' : 'Adicionar foto'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={`block text-sm font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Nome de Guerra</label>
                                <input
                                    type="text"
                                    value={warName}
                                    onChange={(e) => setWarName(e.target.value)}
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400' : 'bg-slate-50 border-slate-200'}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>E-mail</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400' : 'bg-slate-50 border-slate-200'}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Telefone / Ramal</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400' : 'bg-slate-50 border-slate-200'}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-bold mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Setor (Apenas Leitura)</label>
                                <input
                                    type="text"
                                    value={user.sector}
                                    disabled
                                    className={`w-full px-4 py-2 border rounded-lg cursor-not-allowed ${isDarkMode ? 'bg-slate-700/50 border-slate-600 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500'}`}
                                />
                            </div>
                        </div>

                        <div className={`flex justify-end pt-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
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
                        <div className={`p-4 border-l-4 border-amber-500 rounded-r-lg text-sm flex gap-3 ${isDarkMode ? 'bg-amber-900/20 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <p>A nova senha deve conter no mínimo 8 caracteres, incluindo letras, números e símbolos.</p>
                        </div>

                        <div>
                            <label className={`block text-sm font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Senha Atual</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200'}`}
                            />
                        </div>

                        <div>
                            <label className={`block text-sm font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Nova Senha</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200'}`}
                            />
                        </div>

                        <div>
                            <label className={`block text-sm font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Confirmar Nova Senha</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200'}`}
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

                        {/* Biometrics Section */}
                        <div className={`mt-8 pt-6 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                            <h3 className={`font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                <Fingerprint className="w-5 h-5" />
                                Biometria / FaceID
                            </h3>

                            <div className={`p-4 rounded-xl border flex items-center justify-between ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
                                <div>
                                    <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                        {user.biometric_credentials_id ? 'Biometria Ativada' : 'Biometria Desativada'}
                                    </p>
                                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {user.biometric_credentials_id
                                            ? 'Você pode usar sua digital ou FaceID para entrar.'
                                            : 'Cadastre sua biometria para login mais rápido.'}
                                    </p>
                                </div>

                                {isWebAuthnSupported() ? (
                                    <button
                                        onClick={async () => {
                                            if (user.biometric_credentials_id) {
                                                if (confirm('Deseja remover a biometria cadastrada?')) {
                                                    await onUpdateUser({ biometric_credentials_id: '' });
                                                    localStorage.removeItem('gsdsp_biometric_id');
                                                    alert('Biometria removida com sucesso!');
                                                }
                                            } else {
                                                try {
                                                    const credential = await registerBiometrics(user.username, user.id);
                                                    await onUpdateUser({ biometric_credentials_id: credential.id });

                                                    // Save to localStorage for LoginView detection
                                                    localStorage.setItem('gsdsp_biometric_id', credential.id);
                                                    localStorage.setItem('gsdsp_last_saram', user.username);

                                                    alert('Biometria cadastrada com sucesso!');
                                                } catch (err: any) {
                                                    alert('Erro ao cadastrar biometria: ' + err.message);
                                                }
                                            }
                                        }}
                                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${user.biometric_credentials_id
                                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                            : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                                            }`}
                                    >
                                        {user.biometric_credentials_id ? 'Remover' : 'Habilitar'}
                                    </button>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Não suportado neste dispositivo</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. PREFERENCES TAB */}
                {activeTab === 'preferences' && (
                    <div className="space-y-6">
                        <div className={`flex items-center justify-between p-4 rounded-xl border ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${isDarkMode ? 'bg-indigo-900 text-indigo-200' : 'bg-orange-100 text-orange-500'}`}>
                                    {isDarkMode ? <Moon className="w-6 h-6" /> : <Save className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Modo Escuro</h4>
                                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Ajusta o contraste para ambientes com pouca luz (SOP Noturno).</p>
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
