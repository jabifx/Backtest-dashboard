"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Settings } from "lucide-react";

interface RawYamlTabProps {
    yamlConfig: string;
    yamlStrategy: string;
    onConfigChange: (yaml: string) => void;
    onStrategyChange: (yaml: string) => void;
}

export const RawYamlTab = ({ yamlConfig, yamlStrategy, onConfigChange, onStrategyChange }: RawYamlTabProps) => {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Base Configuration YAML
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Generated from fixed fields</p>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
                    <Textarea
                        value={yamlConfig}
                        onChange={(e) => onConfigChange(e.target.value)}
                        className="font-mono text-sm min-h-[300px]"
                        placeholder="Base configuration will appear here..."
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Strategy Configuration YAML
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Dynamic strategy parameters</p>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={yamlStrategy}
                        onChange={(e) => onStrategyChange(e.target.value)}
                        className="font-mono text-sm min-h-[300px]"
                        placeholder="Strategy configuration will appear here when a strategy is selected..."
                    />
                </CardContent>
            </Card>
        </div>
    );
};