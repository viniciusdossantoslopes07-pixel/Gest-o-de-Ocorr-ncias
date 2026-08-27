import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import tw from 'twrnc';
import { supabase } from '../services/supabase';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Obter dados do usuário e OM
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, om:om_catalog(*)')
        .eq('id', data.user.id)
        .single();
        
      if (userError) throw userError;

      onLoginSuccess(userData);
    } catch (error: any) {
      Alert.alert('Erro no Login', error.message || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={tw`flex-1 justify-center items-center bg-slate-900 px-6`}>
      <View style={tw`w-20 h-20 bg-blue-600 rounded-2xl items-center justify-center mb-6 shadow-lg`}>
        <Text style={tw`text-white font-black text-3xl`}>QR</Text>
      </View>
      
      <Text style={tw`text-white text-3xl font-black mb-2 uppercase`}>Leitor de Acesso</Text>
      <Text style={tw`text-slate-400 text-xs font-bold uppercase tracking-widest mb-10`}>Acesso Restrito - Sentinela</Text>

      <View style={tw`w-full max-w-sm space-y-4 mb-4`}>
        <TextInput
          style={tw`w-full bg-slate-800 text-white px-5 py-4 rounded-2xl font-bold mb-4`}
          placeholder="E-mail"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          style={tw`w-full bg-slate-800 text-white px-5 py-4 rounded-2xl font-bold mb-8`}
          placeholder="Senha"
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity 
          style={tw`w-full bg-blue-600 py-4 rounded-2xl items-center shadow-lg shadow-blue-500/20`}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={tw`text-white font-black uppercase text-sm tracking-widest`}>Entrar no Sistema</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
