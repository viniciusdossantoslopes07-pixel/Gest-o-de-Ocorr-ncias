import React from 'react';
import { Car, Construction, Clock } from 'lucide-react';

export default function ParkingRequestPanel() {
    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center">
                <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Car className="w-10 h-10" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-3">Solicitação de Estacionamento</h2>
                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                    Este módulo está em desenvolvimento e será disponibilizado em breve.
                    Ele permitirá solicitar e gerenciar vagas de estacionamento dentro da BASP.
                </p>
                <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 px-4 py-3 rounded-xl border border-amber-200 max-w-xs mx-auto">
                    <Construction className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">Em Breve</span>
                </div>
            </div>
        </div>
    );
}
