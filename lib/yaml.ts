import yaml from "js-yaml";
import { ConfigField, BaseConfig } from "@/types/yaml";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const baseConfigDefault: BaseConfig = {
    STRATEGY: "",
    INICIO: "2015-01-01 00:00:00",
    FIN: "2025-04-30 00:00:00",
    BALANCE: 5000,
    VELAS: 600,
    SPREAD: 0.0001,
    COMISSION: 2,
    SYMBOL: "EURUSD",
};

export const parseYamlToFields = async (yamlString: string, config: BaseConfig): Promise<ConfigField[]> => {
    try {
        const parsed = yaml.load(yamlString) as any;
        const fields: ConfigField[] = [];

        const processObject = async (obj: any, prefix = "") => {
            for (const [key, value] of Object.entries(obj)) {
                const fullKey = prefix ? `${prefix}.${key}` : key;

                if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                    await processObject(value, fullKey);
                } else {
                    let fieldType: "string" | "number" | "boolean" | "select" | "multiselect" = "string";
                    let options: string[] | undefined = undefined;

                    const isTimeframeOrDays =
                        key.toLowerCase().includes("timeframe") ||
                        key === "TFs" ||
                        key.toLowerCase().includes("days") ||
                        key.toLowerCase().includes("dias");

                    if (typeof value === "number") {
                        fieldType = "number";
                    } else if (typeof value === "boolean") {
                        fieldType = "boolean";
                    } else if (isTimeframeOrDays) {
                        fieldType = "multiselect";
                        if (key.toLowerCase().includes("timeframe") || key === "TFs") {
                            try {
                                const response = await fetch(`${API_BASE_URL}/api/timeframes/${config.SYMBOL}`);
                                if (response.ok) {
                                    const data = await response.json();
                                    options = data.timeframes || [];
                                }
                            } catch (error) {
                                console.error("Error loading timeframes:", error);
                                options = [];
                            }
                        } else {
                            options = ["Mon", "Tue", "Wed", "Thu", "Fri"];
                        }
                    }

                    fields.push({
                        key: fullKey,
                        label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
                        type: fieldType,
                        options,
                        value: fieldType === "multiselect" ? (Array.isArray(value) ? value : [value]) : value,
                    });
                }
            }
        };

        await processObject(parsed);
        return fields;
    } catch (error) {
        return [];
    }
};

// Convierte un array de campos de vuelta a YAML
export const fieldsToYaml = (fields: ConfigField[]): string => {
    const obj: any = {};

    fields.forEach((field) => {
        const keys = field.key.split(".");
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }

        if (field.type === "multiselect") {
            current[keys[keys.length - 1]] = Array.isArray(field.value) ? field.value : [field.value];
        } else {
            current[keys[keys.length - 1]] = field.value;
        }
    });

    return yaml.dump(obj, { indent: 2 });
};

// Convierte baseConfig a YAML
export const baseConfigToYaml = (config: BaseConfig): string => {
    const yamlObj = {
        BACKTEST: {
            STRATEGY: config.STRATEGY,
            INICIO: config.INICIO,
            FIN: config.FIN,
            BALANCE: config.BALANCE,
            VELAS: config.VELAS,
            SPREAD: config.SPREAD,
            COMISSION: config.COMISSION,
            SYMBOL: config.SYMBOL,
        },
    };
    return yaml.dump(yamlObj, { indent: 2 });
};
