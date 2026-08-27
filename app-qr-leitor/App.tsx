import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import tw from 'twrnc';
import { supabase } from './services/supabase';
import LoginScreen from './screens/LoginScreen';
import ScannerScreen from './screens/ScannerScreen';

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('*, om:om_catalog(*)')
          .eq('id', session.user.id)
          .single();
          
        if (userData) setUser(userData);
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-slate-900`}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-slate-900`}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      {user ? (
        <ScannerScreen user={user} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLoginSuccess={setUser} />
      )}
    </View>
  );
}
