import React from 'react';
import { MilitaryOrganization } from '../../types';

interface OmPrintHeaderProps {
    om?: MilitaryOrganization;
    className?: string;
}

export const OmPrintHeader: React.FC<OmPrintHeaderProps> = ({ om, className = "" }) => {
    // Default logos for GSD-SP and BASP
    const isGsdSp = om?.acronym === 'GSD-SP';
    const isBasp = om?.acronym === 'BASP';

    const omLogo = om?.logo_url || (isGsdSp ? "/logo_gsd.png" : (isBasp ? "/logo_basp_optimized.png" : "/logo_gsd.png"));
    const hostLogo = om?.host_logo_url || (isGsdSp || isBasp ? "/logo_basp_optimized.png" : "/logo_basp_optimized.png");

    return (
        <div className={`flex items-start justify-between mb-4 border-b-2 border-slate-900 pb-3 ${className}`}>
            <img 
                src={hostLogo} 
                alt="Logo Sediadora" 
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain" 
            />
            
            <div className="flex-1 text-center px-2">
                <h1 className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">Ministério da Defesa</h1>
                <h1 className="text-sm sm:text-lg font-black uppercase text-slate-900 leading-tight">Comando da Aeronáutica</h1>
                <h2 className="text-[11px] sm:text-sm font-black uppercase text-slate-800 tracking-wide mt-1">
                    {om?.host_unit || "BASE AÉREA DE SÃO PAULO"}
                </h2>
                <h3 className="text-[9px] sm:text-xs font-bold uppercase text-slate-700 leading-tight">
                    {om?.name || "GRUPO DE SEGURANÇA E DEFESA DE SÃO PAULO"}
                    {om?.acronym && ` (${om.acronym})`}
                </h3>
            </div>

            <img 
                src={omLogo} 
                alt="Logo OM" 
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain" 
            />
        </div>
    );
};
