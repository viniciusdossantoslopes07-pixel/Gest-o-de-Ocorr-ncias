import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface ComboboxProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    isDarkMode?: boolean;
}

export const Combobox: React.FC<ComboboxProps> = ({
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
    const [searchTerm, setSearchTerm] = useState(value);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Update local search term when prop value changes (e.g. clear form)
    useEffect(() => {
        setSearchTerm(value);
    }, [value]);

    // Helper to normalize string for search
    const normalize = (str: string) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    // Filter and Sort options
    const filteredOptions = useMemo(() => {
        if (!searchTerm) {
            // If empty, return first 50 options or all if small
            return options.slice(0, 50);
        }

        const normalizedTerm = normalize(searchTerm);
        const searchTerms = normalizedTerm.split(/\s+/).filter(t => t.length > 0);

        const filtered = options.filter(opt => {
            const normalizedOpt = normalize(opt);
            // Must contain ALL terms typed (in any order)
            return searchTerms.every(term => normalizedOpt.includes(term));
        });

        // Sort: Priority to strings that start with the search term
        return [...filtered].sort((a, b) => {
            const aStarts = normalize(a).startsWith(normalizedTerm);
            const bStarts = normalize(b).startsWith(normalizedTerm);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.localeCompare(b);
        });
    }, [options, searchTerm]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // If closed without selection, keep the typed text if allowCustom is desired, 
                // or revert to value. Here we assume the input IS the value.
                // Reverting to prop value if closed might be jarring if user was typing.
                // We keep what user typed as the value (implicit custom value allowed or expected to be picked)
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev + 1) % filteredOptions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (isOpen && filteredOptions.length > 0) {
                selectOption(filteredOptions[highlightedIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            inputRef.current?.blur();
        } else if (e.key === 'Tab') {
            if (isOpen && filteredOptions.length > 0) {
                // Optional: Select on tab? Standard behavior usually just moves focus.
                setIsOpen(false);
            } else {
                setIsOpen(false);
            }
        }
    };

    const selectOption = (option: string) => {
        onChange(option);
        setSearchTerm(option);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        onChange(e.target.value); // Update parent immediately for "custom" values
                        setIsOpen(true);
                        setHighlightedIndex(0);
                    }}
                    onFocus={(e) => {
                        setIsOpen(true);
                        e.target.select();
                    }}
                    onClick={() => {
                        if (!disabled) setIsOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    placeholder={placeholder}
                    className={`w-full border rounded-xl p-3 pr-10 font-bold text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none uppercase transition-all ${dk
                        ? `bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-800' : ''}`
                        : `bg-slate-50 border-slate-200 text-slate-900 ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`
                        }`}
                    autoComplete="off"
                />

                {/* Clear Button (only if value exists and not disabled) */}
                {searchTerm && !disabled && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange('');
                            setSearchTerm('');
                            inputRef.current?.focus();
                        }}
                        className={`absolute right-8 top-1/2 -translate-y-1/2 p-1 ${dk ? 'text-slate-500 hover:text-slate-300' : 'text-slate-300 hover:text-slate-500'}`}
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}

                <div
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-200 pointer-events-none ${isOpen ? 'rotate-180' : ''}`}
                >
                    <ChevronDown className={`w-4 h-4 ${dk ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && !disabled && (
                <div className={`absolute z-[200] top-full left-0 right-0 mt-1 border rounded-xl shadow-2xl max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 origin-top ${dk
                    ? 'bg-slate-800 border-slate-600 shadow-black/30 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800'
                    : 'bg-white border-slate-200 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent'
                    }`}>
                    {filteredOptions.length === 0 ? (
                        <div className={`p-3 text-center text-xs font-bold uppercase italic ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                            Nenhum resultado
                        </div>
                    ) : (
                        filteredOptions.map((option, index) => (
                            <button
                                key={option}
                                onClick={() => selectOption(option)}
                                className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wide flex items-center justify-between transition-all ${index === highlightedIndex
                                    ? 'bg-blue-600 text-white'
                                    : (dk ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-50')
                                    }`}
                                onMouseEnter={() => setHighlightedIndex(index)}
                            >
                                <span>{option}</span>
                                {option === value && (
                                    <Check className={`w-3.5 h-3.5 ${index === highlightedIndex ? 'text-white' : 'text-blue-600'}`} />
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
