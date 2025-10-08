"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, RefreshCw, FileText } from "lucide-react";
import { ConfigField } from "@/types/yaml";
import { StrategyField } from "@/components/parameters/strategy-field";

interface StrategyConfigCardProps {
    baseConfig: any;
    strategyFields: ConfigField[];
    loading: boolean;
    prioritizedFieldsOrder: string[];
    onFieldUpdate: (key: string, value: any) => void;
    onMultiselectChange: (fieldKey: string, option: string, checked: boolean) => void;
}

export const StrategyConfigCard = ({
                                       baseConfig,
                                       strategyFields,
                                       loading,
                                       prioritizedFieldsOrder,
                                       onFieldUpdate,
                                       onMultiselectChange
                                   }: StrategyConfigCardProps) => {
    // Extract TOPIC and DESCRIPTION for header
    const topicField = strategyFields.find((field) => field.key === 'TOPIC');
    const descriptionField = strategyFields.find((field) => field.key === 'DESCRIPTION');

    // Filter out TOPIC and DESCRIPTION from sorted fields for content
    const sortedStrategyFields = useMemo(() => {
        const contentFields = strategyFields.filter((field) => !['TOPIC', 'DESCRIPTION'].includes(field.key));
        return [
            ...prioritizedFieldsOrder
                .filter((key) => !['TOPIC', 'DESCRIPTION'].includes(key))
                .map((key) => contentFields.find((field) => field.key === key))
                .filter((field): field is ConfigField => !!field),
            ...contentFields.filter((field) => !prioritizedFieldsOrder.includes(field.key)),
        ];
    }, [strategyFields, prioritizedFieldsOrder]);

    const renderFieldsGrid = () => {
        const fields = [];
        let normalInputCount = 0;
        let isAfterSpecial = false;
        let stackedInputs: ConfigField[] = [];

        for (const field of sortedStrategyFields) {
            if (field.type === "multiselect" || field.key === 'TRADING HOURS') {
                if (stackedInputs.length > 0) {
                    fields.push(
                        <div key={`stack-${fields.length}`} className="col-span-1 flex flex-col h-[160px] overflow-y-auto">
                            {stackedInputs.map((inputField) => (
                                <StrategyField
                                    key={inputField.key}
                                    field={inputField}
                                    onUpdate={onFieldUpdate}
                                    onMultiselectChange={onMultiselectChange}
                                />
                            ))}
                        </div>
                    );
                    stackedInputs = [];
                }
                fields.push(
                    <div key={field.key} className="col-span-1">
                        <StrategyField
                            field={field}
                            onUpdate={onFieldUpdate}
                            onMultiselectChange={onMultiselectChange}
                        />
                    </div>
                );
                isAfterSpecial = true;
                normalInputCount = 0;
            } else if (isAfterSpecial && normalInputCount < 2) {
                stackedInputs.push(field);
                normalInputCount++;
                if (normalInputCount === 2 || stackedInputs.length === 2) {
                    fields.push(
                        <div key={`stack-${fields.length}`} className="col-span-1 flex flex-col h-[160px] overflow-y-auto">
                            {stackedInputs.map((inputField) => (
                                <StrategyField
                                    key={inputField.key}
                                    field={inputField}
                                    onUpdate={onFieldUpdate}
                                    onMultiselectChange={onMultiselectChange}
                                />
                            ))}
                        </div>
                    );
                    stackedInputs = [];
                    isAfterSpecial = false;
                }
            } else {
                if (stackedInputs.length > 0) {
                    fields.push(
                        <div key={`stack-${fields.length}`} className="col-span-1 flex flex-col h-[160px] overflow-y-auto">
                            {stackedInputs.map((inputField) => (
                                <StrategyField
                                    key={inputField.key}
                                    field={inputField}
                                    onUpdate={onFieldUpdate}
                                    onMultiselectChange={onMultiselectChange}
                                />
                            ))}
                        </div>
                    );
                    stackedInputs = [];
                }
                fields.push(
                    <div key={field.key} className="col-span-1">
                        <StrategyField
                            field={field}
                            onUpdate={onFieldUpdate}
                            onMultiselectChange={onMultiselectChange}
                        />
                    </div>
                );
            }
        }

        if (stackedInputs.length > 0) {
            fields.push(
                <div key={`stack-${fields.length}`} className="col-span-1 flex flex-col h-[160px] overflow-y-auto">
                    {stackedInputs.map((inputField) => (
                        <StrategyField
                            key={inputField.key}
                            field={inputField}
                            onUpdate={onFieldUpdate}
                            onMultiselectChange={onMultiselectChange}
                        />
                    ))}
                </div>
            );
        }

        return fields;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Strategy Configuration
                    <Badge variant="secondary">{strategyFields.length} fields</Badge>
                    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                </CardTitle>
                {topicField && baseConfig.STRATEGY && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary" className="text-sm">
                            {baseConfig.STRATEGY} - {(Array.isArray(topicField.value) ? topicField.value.join(', ') : topicField.value.toString())}
                        </Badge>
                    </div>
                )}
                {descriptionField && (
                    <p className="text-sm text-muted-foreground mt-2">
                        {descriptionField.value.toString() || 'No description available'}
                    </p>
                )}
                {!topicField && !descriptionField && (
                    <p className="text-sm text-muted-foreground mt-2">
                        {baseConfig.STRATEGY
                            ? `Parameters for ${baseConfig.STRATEGY}`
                            : "Select a strategy to configure parameters"}
                    </p>
                )}
            </CardHeader>
            <CardContent className="space-y-4 max-h-[400px] overflow-y-auto">
                <div className="space-y-4">
                    {!baseConfig.STRATEGY ? (
                        <div className="text-center text-muted-foreground py-8">
                            <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>Select a strategy from Base Configuration</p>
                        </div>
                    ) : strategyFields.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>{loading ? "Loading strategy parameters..." : "No parameters found for this strategy"}</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 pb-2 border-b">
                                {/* Optional: Add any header content here */}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {renderFieldsGrid()}
                            </div>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};