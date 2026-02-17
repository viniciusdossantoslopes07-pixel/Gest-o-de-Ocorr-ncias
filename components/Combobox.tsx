import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface ComboboxProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export const Combobox: React.FC<ComboboxProps> = ({
    options,
    value,
    onChange,
    placeholder = "Selecione...",
    disabled = false,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Update local search term when prop value changes (e.g. clear form)
    useEffect(() => {
        setSearchTerm(value);
    }, [value]);

    // Filter options
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lowerTerm = searchTerm.toLowerCase();
        // Prioritize startsWith, then includes
        return options.sort((a, b) => {
            const aLower = a.toLowerCase();
            const bLower = b.toLowerCase();
            const aStarts = aLower.startsWith(lowerTerm);
            const bStarts = bLower.startsWith(lowerTerm);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return 0;
        }).filter(opt => opt.toLowerCase().includes(lowerTerm));
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
                    onFocus={() => setIsOpen(true)}
                    onClick={() => {
                        if (!disabled) setIsOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    placeholder={placeholder}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pr-10 font-bold text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none uppercase transition-all ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
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
                        className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 p-1"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}

                <div
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-200 pointer-events-none ${isOpen ? 'rotate-180' : ''}`}
                >
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && !disabled && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 origin-top">
                    {filteredOptions.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400 font-bold uppercase italic">
                            Nenhum resultado
                        </div>
                    ) : (
                        filteredOptions.map((option, index) => (
                            <button
                                key={option}
                                onClick={() => selectOption(option)}
                                className={`w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-between transition-colors ${index === highlightedIndex
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                onMouseEnter={() => setHighlightedIndex(index)}
                            >
                                <span>{option}</span>
                                {option === value && (
                                    <Check className="w-3.5 h-3.5 text-blue-600" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
