"use client";

import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, X } from "lucide-react";

interface MultiSelectSymbolProps {
    selectedSymbols?: string[];
    availablePairs?: string[];
    onSelectionChange: (symbols: string[]) => void;
    disabled?: boolean;
}

export const MultiSelectSymbol = ({
                                      selectedSymbols = [],
                                      availablePairs = [],
                                      onSelectionChange,
                                      disabled = false
                                  }: MultiSelectSymbolProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filtrar pares disponibles basado en el término de búsqueda
    const filteredPairs = availablePairs.filter(pair =>
        pair.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSymbolToggle = (symbol: string) => {
        if (selectedSymbols.includes(symbol)) {
            onSelectionChange(selectedSymbols.filter(s => s !== symbol));
        } else {
            onSelectionChange([...selectedSymbols, symbol]);
        }
    };

    const handleRemoveSymbol = (symbolToRemove: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onSelectionChange(selectedSymbols.filter(s => s !== symbolToRemove));
    };

    const handleInputClick = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchTerm('');
        }
    };

    return (
        <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <div className="relative" ref={dropdownRef}>
                {/* Input principal */}
                <div
                    className={`
            min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm 
            ring-offset-background cursor-pointer transition-colors
            ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-primary/50'}
            ${isOpen ? 'ring-2 ring-ring ring-offset-2' : ''}
          `}
                    onClick={handleInputClick}
                >
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Tags seleccionados */}
                        {selectedSymbols.map((symbol) => (
                            <Badge
                                key={symbol}
                                variant="secondary"
                                className="flex items-center gap-1 px-2 py-1"
                            >
                                {symbol}
                                <button
                                    className="text-muted-foreground hover:text-foreground"
                                    onClick={(e) => handleRemoveSymbol(symbol, e)}
                                    disabled={disabled}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}

                        {/* Placeholder o input de búsqueda */}
                        <div className="flex-1 flex items-center min-w-[120px]">
                            {isOpen ? (
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className="flex-1 outline-none bg-transparent text-sm placeholder:text-muted-foreground"
                                    placeholder="Search symbols..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={disabled}
                                />
                            ) : (
                                <span className="text-sm text-muted-foreground">
                  {selectedSymbols.length === 0
                      ? (availablePairs.length === 0 ? "No pairs available" : "Select symbols...")
                      : `${selectedSymbols.length} selected`
                  }
                </span>
                            )}
                        </div>

                        {/* Icono de dropdown */}
                        <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform ${
                                isOpen ? 'transform rotate-180' : ''
                            }`}
                        />
                    </div>
                </div>

                {/* Dropdown */}
                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredPairs.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                                {availablePairs.length === 0
                                    ? "No pairs available"
                                    : searchTerm
                                        ? "No pairs found"
                                        : "Start typing to search..."
                                }
                            </div>
                        ) : (
                            <div className="p-1">
                                {filteredPairs.map((pair) => (
                                    <button
                                        key={pair}
                                        className={`
                      w-full flex items-center justify-between px-3 py-2 text-sm rounded-sm
                      transition-colors hover:bg-accent hover:text-accent-foreground
                      ${selectedSymbols.includes(pair) ? 'bg-accent text-accent-foreground' : ''}
                    `}
                                        onClick={() => handleSymbolToggle(pair)}
                                    >
                                        <span>{pair}</span>
                                        {selectedSymbols.includes(pair) && (
                                            <div className="w-4 h-4 rounded-sm bg-primary flex items-center justify-center">
                                                <div className="w-2 h-2 bg-primary-foreground rounded-sm"></div>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Info adicional */}
            {availablePairs.length === 0 && (
                <p className="text-xs text-muted-foreground">
                    No pairs found. Check your API connection.
                </p>
            )}
        </div>
    );
};