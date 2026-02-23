import { useState, useEffect, useRef, FC } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
    label: string;
    value: string;
}

interface FilterSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    icon?: any;
    className?: string;
    isDarkMode?: boolean;
}

const FilterSelect: FC<FilterSelectProps> = ({
    options,
    value,
    onChange,
    placeholder,
    icon: Icon,
    className = "",
    isDarkMode = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const click = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', click);
        return () => document.removeEventListener('mousedown', click);
    }, []);

    const label = options.find((o) => o.value === value)?.label || placeholder;

    return (
        <div className={`relative ${className}`} ref={ref}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-full text-xs font-bold transition-all ${isDarkMode ? 'bg-slate-700/60 border-slate-600 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:shadow-sm'}`}
            >
                {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                <span className="flex-1 text-left truncate uppercase tracking-tight">{label}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className={`absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border shadow-2xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-black/40' : 'bg-white border-slate-200 shadow-slate-200'}`}>
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onChange(opt.value); setIsOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors ${value === opt.value ? 'bg-blue-600 text-white' : (isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-50')}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FilterSelect;
