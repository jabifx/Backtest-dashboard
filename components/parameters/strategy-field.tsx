"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfigField } from "@/types/yaml";
import { TradingHoursField } from "@/components/parameters/trading-hours-field";

interface StrategyFieldProps {
    field: ConfigField;
    onUpdate: (key: string, value: any) => void;
    onMultiselectChange: (fieldKey: string, option: string, checked: boolean) => void;
}

export const StrategyField = ({ field, onUpdate, onMultiselectChange }: StrategyFieldProps) => {
    if (field.key === 'TRADING HOURS') {
        return (
            <TradingHoursField
                value={field.value}
                onChange={(value) => onUpdate(field.key, value)}
                label={field.label}
            />
        );
    }

    return (
        <div className="space-y-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            {field.type === "boolean" ? (
                <Select
                    value={field.value.toString()}
                    onValueChange={(value) => onUpdate(field.key, value === "true")}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="true">True</SelectItem>
                        <SelectItem value="false">False</SelectItem>
                    </SelectContent>
                </Select>
            ) : field.type === "number" ? (
                <Input
                    id={field.key}
                    type="number"
                    value={field.value}
                    onChange={(e) => onUpdate(field.key, Number.parseFloat(e.target.value))}
                />
            ) : field.type === "multiselect" ? (
                <div className="space-y-2 p-3 border rounded-lg h-[160px] overflow-y-auto">
                    <div className="text-sm text-muted-foreground mb-2">
                        Select multiple options (selected: {Array.isArray(field.value) ? field.value.length : 0})
                    </div>
                    {field.options && field.options.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                            {field.options.map((option) => (
                                <div key={option} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`${field.key}-${option}`}
                                        checked={Array.isArray(field.value) ? field.value.includes(option) : false}
                                        onCheckedChange={(checked) => onMultiselectChange(field.key, option, checked as boolean)}
                                    />
                                    <Label htmlFor={`${field.key}-${option}`} className="text-sm">{option}</Label>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">No options available</div>
                    )}
                </div>
            ) : (
                <Input
                    id={field.key}
                    value={field.value}
                    onChange={(e) => onUpdate(field.key, e.target.value)}
                />
            )}
        </div>
    );
};