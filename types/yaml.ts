export interface YamlConfigPanelProps {
    yamlConfig: string
    yamlStrategy: string
    onConfigChange: (config: string) => void
    onStrategyChange: (strategy: string) => void
}

export interface ConfigField {
    key: string
    label: string
    type: "string" | "number" | "boolean" | "select" | "multiselect" | "timerange"
    options?: string[]
    value: any
}

export interface BaseConfig {
    STRATEGY: string;
    INICIO: string;
    FIN: string;
    BALANCE: number;
    VELAS: number;
    SPREAD: number;
    COMISSION: number;
    SYMBOL: string[];
}