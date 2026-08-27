import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import tw from 'twrnc';
import { supabase } from '../services/supabase';
import { Camera, Shield, UserCheck, X, ArrowDownToLine, ArrowUpFromLine, LogOut } from 'lucide-react-native';

interface ScannerScreenProps {
  user: any;
  onLogout: () => void;
}

export default function ScannerScreen({ user, onLogout }: ScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [accessData, setAccessData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gates, setGates] = useState<any[]>([]);
  const [selectedGate, setSelectedGate] = useState('');

  useEffect(() => {
    fetchGates();
  }, []);

  const fetchGates = async () => {
    try {
      const { data } = await supabase
        .from('access_gates')
        .select('id, name')
        .eq('is_active', true)
        .eq('om_id', user.om_id);
      
      if (data && data.length > 0) {
        setGates(data);
        setSelectedGate(data[0].name);
      } else {
        const fallback = [{ id: '1', name: 'PORTÃO PRINCIPAL' }];
        setGates(fallback);
        setSelectedGate('PORTÃO PRINCIPAL');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBarCodeScanned = async ({ data: decodedText }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    try {
      const data = JSON.parse(decodedText);
      if (data.type === 'TEMP_ACCESS') {
        fetchAccessDetails(data.id, data.code);
      } else {
        Alert.alert('Erro', 'QR Code inválido para este sistema.');
        setTimeout(() => setScanned(false), 2000);
      }
    } catch (e) {
      Alert.alert('Erro', 'Formato de QR Code desconhecido.');
      setTimeout(() => setScanned(false), 2000);
    }
  };

  const fetchAccessDetails = async (id: string, code: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('temporary_access_requests')
        .select('*, visitor:visitor_catalog(*), requester:users(*)')
        .eq('id', id)
        .eq('code', code)
        .single();

      if (error || !data) throw new Error('Código de acesso inválido ou não encontrado.');

      const isValid = new Date(data.valid_until) > new Date();
      if (!isValid) throw new Error('Este QR Code expirou.');
      if (data.status === 'CANCELED') throw new Error('Acesso cancelado pelo solicitante.');

      setAccessData(data);
    } catch (err: any) {
      Alert.alert('Atenção', err.message);
      setTimeout(() => setScanned(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAccess = async (category: 'Entrada' | 'Saída') => {
    if (!accessData) return;
    setSubmitting(true);
    try {
      const hasVehicle = !!(accessData.vehicle_model || accessData.vehicle_plate);
      
      const { error: insError } = await supabase.from('access_control').insert([{
        guard_gate: selectedGate,
        name: accessData.visitor.name,
        characteristic: accessData.visitor.characteristic,
        identification: accessData.visitor.identification,
        access_mode: hasVehicle ? 'Veículo' : 'Pedestre',
        vehicle_model: accessData.vehicle_model || '',
        vehicle_plate: accessData.vehicle_plate || '',
        access_category: category,
        authorizer: `${accessData.requester.rank} ${accessData.requester.name}`,
        authorizer_id: accessData.requester.id,
        destination: accessData.destination || 'NÃO INFORMADO',
        registered_by: user.id,
        timestamp: new Date().toISOString(),
        om_id: user.om_id
      }]);

      if (insError) throw insError;

      if (category === 'Entrada') {
        await supabase
          .from('temporary_access_requests')
          .update({ status: 'USED' })
          .eq('id', accessData.id);
      }

      Alert.alert('Sucesso', `Acesso (${category}) registrado com sucesso!`);
      resetScanner();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetScanner = () => {
    setAccessData(null);
    setScanned(false);
  };

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-slate-900 px-6`}>
        <Text style={tw`text-white font-bold text-center mb-6`}>Precisamos da sua permissão para usar a câmera</Text>
        <TouchableOpacity style={tw`bg-blue-600 px-6 py-3 rounded-xl`} onPress={requestPermission}>
          <Text style={tw`text-white font-black uppercase text-xs tracking-widest`}>Permitir Câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-slate-900`}>
      <View style={tw`pt-12 pb-4 px-6 flex-row items-center justify-between bg-slate-800`}>
        <View style={tw`flex-row items-center`}>
          <Shield color="#3b82f6" size={24} style={tw`mr-3`} />
          <View>
            <Text style={tw`text-white font-black uppercase tracking-widest text-sm`}>Leitor de Acesso</Text>
            <Text style={tw`text-slate-400 font-bold uppercase text-[10px]`}>{user.om?.acronym || 'GSD-SP'} • {user.rank} {user.name}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onLogout} style={tw`p-2 bg-slate-700/50 rounded-xl`}>
          <LogOut color="#94a3b8" size={18} />
        </TouchableOpacity>
      </View>

      {!accessData ? (
        <View style={tw`flex-1`}>
          {loading ? (
             <View style={tw`flex-1 justify-center items-center`}>
               <ActivityIndicator size="large" color="#3b82f6" />
               <Text style={tw`text-white mt-4 font-bold`}>Validando...</Text>
             </View>
          ) : (
             <CameraView
               style={tw`flex-1`}
               facing="back"
               onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
               barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
             >
               <View style={tw`flex-1 bg-black/40 items-center justify-center`}>
                 <View style={tw`w-64 h-64 border-2 border-blue-500 rounded-3xl items-center justify-center overflow-hidden`}>
                   <View style={tw`absolute inset-0 border-4 border-blue-500/30`} />
                   <Camera color="rgba(59,130,246,0.5)" size={48} />
                 </View>
                 <Text style={tw`text-white font-bold mt-8 bg-black/50 px-4 py-2 rounded-xl`}>Aponte para o QR Code</Text>
               </View>
             </CameraView>
          )}
        </View>
      ) : (
        <ScrollView style={tw`flex-1 px-4 py-6`}>
          <View style={tw`bg-slate-800 rounded-[2rem] p-6 shadow-xl`}>
            <View style={tw`items-center mb-6`}>
              <View style={tw`w-16 h-16 bg-blue-600 rounded-full items-center justify-center mb-3`}>
                <Text style={tw`text-white font-black text-2xl`}>{accessData.visitor.name.charAt(0)}</Text>
              </View>
              <Text style={tw`text-white text-xl font-black text-center uppercase`}>{accessData.visitor.name}</Text>
              <View style={tw`flex-row items-center mt-2`}>
                <View style={tw`bg-blue-500/20 px-3 py-1 rounded-full mr-2`}>
                  <Text style={tw`text-blue-400 font-bold text-xs uppercase`}>{accessData.visitor.characteristic}</Text>
                </View>
                <Text style={tw`text-slate-400 font-bold text-xs`}>{accessData.visitor.identification}</Text>
              </View>
            </View>

            <View style={tw`bg-slate-700/50 rounded-2xl p-4 mb-3`}>
              <Text style={tw`text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1`}>Destino</Text>
              <Text style={tw`text-white font-bold uppercase`}>{accessData.destination || 'NÃO INFORMADO'}</Text>
            </View>

            {(accessData.vehicle_model || accessData.vehicle_plate) && (
              <View style={tw`bg-slate-700/50 rounded-2xl p-4 mb-3`}>
                <Text style={tw`text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1`}>Veículo</Text>
                <Text style={tw`text-white font-bold uppercase`}>{accessData.vehicle_model} {accessData.vehicle_plate ? `- ${accessData.vehicle_plate}` : ''}</Text>
              </View>
            )}

            <View style={tw`bg-slate-700/50 rounded-2xl p-4 mb-6`}>
              <Text style={tw`text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1`}>Autorizado por</Text>
              <Text style={tw`text-white font-bold uppercase`}>{accessData.requester.rank} {accessData.requester.name}</Text>
            </View>

            <Text style={tw`text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 ml-1`}>Selecione o Portão</Text>
            <View style={tw`flex-row flex-wrap gap-2 mb-8`}>
              {gates.map(gate => (
                <TouchableOpacity
                  key={gate.id}
                  onPress={() => setSelectedGate(gate.name)}
                  style={tw`flex-1 py-3 px-2 rounded-xl border-2 ${selectedGate === gate.name ? 'bg-blue-600 border-blue-600' : 'bg-slate-800 border-slate-600'}`}
                >
                  <Text style={tw`text-center text-[10px] font-black uppercase ${selectedGate === gate.name ? 'text-white' : 'text-slate-400'}`}>
                    {gate.name.replace('PORTÃO ', '')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={tw`flex-row justify-between gap-3 mb-4`}>
              <TouchableOpacity
                onPress={() => handleRegisterAccess('Entrada')}
                disabled={submitting}
                style={tw`flex-1 bg-emerald-600 py-4 rounded-2xl items-center shadow-lg shadow-emerald-500/20`}
              >
                <ArrowDownToLine color="#fff" size={20} style={tw`mb-2`} />
                <Text style={tw`text-white font-black uppercase text-xs`}>Entrada</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleRegisterAccess('Saída')}
                disabled={submitting}
                style={tw`flex-1 bg-red-600 py-4 rounded-2xl items-center shadow-lg shadow-red-500/20`}
              >
                <ArrowUpFromLine color="#fff" size={20} style={tw`mb-2`} />
                <Text style={tw`text-white font-black uppercase text-xs`}>Saída</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={resetScanner} style={tw`py-4 bg-slate-700 rounded-2xl items-center`}>
              <Text style={tw`text-slate-300 font-bold uppercase text-xs`}>Cancelar / Voltar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
