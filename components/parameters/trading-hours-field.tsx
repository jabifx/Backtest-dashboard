"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface TradingHoursFieldProps {
    value: string[];
    onChange: (value: string[]) => void;
    label: string;
}

export const TradingHoursField = ({ value, onChange, label }: TradingHoursFieldProps) => {
    const timeRanges = Array.isArray(value) ? value : [];

    const handleTradingHoursChange = (index: number, type: 'start' | 'end', newValue: string) => {
        const newTimeRanges = [...timeRanges];

        // Split existing range or initialize empty
        const currentRange = newTimeRanges[index] || '';
        const [currentStart, currentEnd] = currentRange ? currentRange.split('-') : ['', ''];

        // Update start or end time
        const newRange = type === 'start' ? `${newValue}-${currentEnd}` : `${currentStart}-${newValue}`;

        // Validate format (HH:MM-HH:MM)
        if (/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(newRange)) {
            newTimeRanges[index] = newRange;
            onChange(newTimeRanges);
        }
    };

    const addTradingHoursRange = () => {
        const newValue = [...timeRanges, '00:00-00:00'];
        onChange(newValue);
    };

    const removeTradingHoursRange = (index: number) => {
        const newValue = timeRanges.filter((_, i) => i !== index);
        onChange(newValue);
    };

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="space-y-2 p-2 border rounded-lg max-h-[160px] overflow-y-auto">
                {timeRanges.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No trading hours defined</div>
                ) : (
                    timeRanges.map((range: string, index: number) => {
                        const [start, end] = range.split('-');
                        return (
                            <div key={index} className="flex items-center gap-2">
                                <Input
                                    type="time"
                                    value={start}
                                    onChange={(e) => handleTradingHoursChange(index, 'start', e.target.value)}
                                    className="w-20"
                                />
                                <span>-</span>
                                <Input
                                    type="time"
                                    value={end}
                                    onChange={(e) => handleTradingHoursChange(index, 'end', e.target.value)}
                                    className="w-20"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeTradingHoursRange(index)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        );
                    })
                )}
                <Button variant="outline" size="sm" onClick={addTradingHoursRange} className="mt-2 w-full">
                    Add Time Range
                </Button>
            </div>
        </div>
    );
};