import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

interface Option {
    label: string;
    value: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    isDarkMode?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = "Selecione...",
    disabled = false,
    className = "",
    isDarkMode = false
}) => {
    const dk = isDarkMode;
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = useMemo(() => options.find(o => o.value === value), [options, value]);

    // Helper to normalize string for search
    const normalize = (str: string) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    // Filter and Sort options
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;

        const normalizedTerm = normalize(searchTerm);
        const searchTerms = normalizedTerm.split(/\s+/).filter(t => t.length > 0);

        return options.filter(opt => {
            const normalizedLabel = normalize(opt.label);
            return searchTerms.every(term => normalizedLabel.includes(term));
        });
    }, [options, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;
        if (!isOpen && e.key === 'Enter') {
            setIsOpen(true);
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setIsOpen(true);
            setHighlightedIndex(prev => (prev + 1) % (filteredOptions.length || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setIsOpen(true);
            setHighlightedIndex(prev => (prev - 1 + filteredOptions.length) % (filteredOptions.length || 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (isOpen && filteredOptions.length > 0) {
                selectOption(filteredOptions[highlightedIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const selectOption = (option: Option) => {
        onChange(option.value);
        setIsOpen(false);
        setSearchTerm("");
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 border rounded-xl font-bold text-sm transition-all text-left ${
                    dk
                        ? 'bg-slate-800/80 border-slate-700 text-white hover:border-slate-600'
                        : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300 shadow-sm'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500' : ''}`}
            >
                <span className={`truncate ${!selectedOption ? (dk ? 'text-slate-500' : 'text-slate-400') : ''}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''} ${dk ? 'text-slate-500' : 'text-slate-400'}`} />
            </button>

            {isOpen && (
                <div className={`absolute z-[300] top-full left-0 right-0 mt-1.5 border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top ${
                    dk ? 'bg-slate-900 border-slate-800 shadow-black/50' : 'bg-white border-slate-100 shadow-slate-200'
                }`}>
                    {/* Search Input */}
                    <div className={`p-2 border-b ${dk ? 'border-slate-800' : 'border-slate-50'}`}>
                        <div className="relative">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${dk ? 'text-slate-500' : 'text-slate-400'}`} />
                            <input
                                ref={inputRef}
                                autoFocus
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setHighlightedIndex(0);
                                }}
                                placeholder="Buscar..."
                                className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs font-bold outline-none ${
                                    dk ? 'bg-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 text-slate-900 placeholder:text-slate-400'
                                }`}
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                        {filteredOptions.length === 0 ? (
                            <div className={`p-4 text-center text-xs font-bold uppercase italic ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                                Nenhum resultado
                            </div>
                        ) : (
                            filteredOptions.map((option, index) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => selectOption(option)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                    className={`w-full text-left px-4 py-3 text-xs font-black uppercase tracking-wide flex items-center justify-between transition-all ${
                                        index === highlightedIndex
                                            ? 'bg-blue-600 text-white'
                                            : (dk ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')
                                    }`}
                                >
                                    <span className="truncate pr-4">{option.label}</span>
                                    {option.value === value && (
                                        <Check className={`w-3.5 h-3.5 flex-shrink-0 ${index === highlightedIndex ? 'text-white' : 'text-blue-600'}`} />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
