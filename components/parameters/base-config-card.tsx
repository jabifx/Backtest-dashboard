"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import { ConfigField } from "@/types/yaml";
import { MultiSelectSymbol } from "@/components/parameters/multi-select-symbol";

interface BaseConfigCardProps {
    baseConfig: any;
    availableFiles: string[];
    availablePairs: string[];
    strategyFields: ConfigField[];
    setStrategyFields: (fields: ConfigField[]) => void;
    onStrategyChange: (yaml: string) => void;
    updateBaseConfigField: (field: string, value: any, strategyFields: ConfigField[], setStrategyFields: (fields: ConfigField[]) => void, onStrategyChange: (yaml: string) => void) => void;
}

export const BaseConfigCard = ({
                                   baseConfig,
                                   availableFiles,
                                   availablePairs,
                                   strategyFields,
                                   setStrategyFields,
                                   onStrategyChange,
                                   updateBaseConfigField
                               }: BaseConfigCardProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Base Configuration
                    <Badge variant="default">8 fields</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">Fixed backtest configuration parameters</p>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
                <div className="space-y-2">
                    <Label htmlFor="strategy">Strategy</Label>
                    <Select
                        value={baseConfig.STRATEGY}
                        onValueChange={(value) =>
                            updateBaseConfigField("STRATEGY", value, strategyFields, setStrategyFields, onStrategyChange)
                        }
                        disabled={availableFiles.length === 0}
                    >
                        <SelectTrigger>
                            <SelectValue
                                placeholder={availableFiles.length === 0 ? "No strategy files available" : "Select strategy..."}
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {availableFiles.map((file) => (
                                <SelectItem key={file} value={file}>
                                    {file}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {availableFiles.length === 0 && (
                        <p className="text-xs text-muted-foreground">No strategy files found. Check your API connection.</p>
                    )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="inicio">Start Date</Label>
                        <Input
                            id="inicio"
                            type="datetime-local"
                            value={baseConfig.INICIO.replace(" ", "T")}
                            onChange={(e) =>
                                updateBaseConfigField(
                                    "INICIO",
                                    e.target.value.replace("T", " "),
                                    strategyFields,
                                    setStrategyFields,
                                    onStrategyChange
                                )
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fin">End Date</Label>
                        <Input
                            id="fin"
                            type="datetime-local"
                            value={baseConfig.FIN.replace(" ", "T")}
                            onChange={(e) =>
                                updateBaseConfigField(
                                    "FIN",
                                    e.target.value.replace("T", " "),
                                    strategyFields,
                                    setStrategyFields,
                                    onStrategyChange
                                )
                            }
                        />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="balance">Balance</Label>
                        <Input
                            id="balance"
                            type="number"
                            value={baseConfig.BALANCE}
                            onChange={(e) =>
                                updateBaseConfigField(
                                    "BALANCE",
                                    Number(e.target.value),
                                    strategyFields,
                                    setStrategyFields,
                                    onStrategyChange
                                )
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="velas">Candles</Label>
                        <Input
                            id="velas"
                            type="number"
                            value={baseConfig.VELAS}
                            onChange={(e) =>
                                updateBaseConfigField(
                                    "VELAS",
                                    Number(e.target.value),
                                    strategyFields,
                                    setStrategyFields,
                                    onStrategyChange
                                )
                            }
                        />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="spread">Spread</Label>
                        <Input
                            id="spread"
                            type="number"
                            step="0.0001"
                            value={baseConfig.SPREAD}
                            onChange={(e) =>
                                updateBaseConfigField(
                                    "SPREAD",
                                    Number(e.target.value),
                                    strategyFields,
                                    setStrategyFields,
                                    onStrategyChange
                                )
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="comission">Commission</Label>
                        <Input
                            id="comission"
                            type="number"
                            value={baseConfig.COMISSION}
                            onChange={(e) =>
                                updateBaseConfigField(
                                    "COMISSION",
                                    Number(e.target.value),
                                    strategyFields,
                                    setStrategyFields,
                                    onStrategyChange
                                )
                            }
                        />
                    </div>
                </div>

                <MultiSelectSymbol
                    selectedSymbols={baseConfig.SYMBOL}
                    availablePairs={availablePairs}
                    onSelectionChange={(symbols) =>
                        updateBaseConfigField("SYMBOL", symbols, strategyFields, setStrategyFields, onStrategyChange)
                    }
                    disabled={availablePairs.length === 0}
                />
            </CardContent>
        </Card>
    );
};