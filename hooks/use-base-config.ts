import { useState } from "react";
import { ConfigField } from "@/types/yaml";
import { baseConfigDefault } from "@/lib/yaml";

type BaseConfigKeys = keyof typeof baseConfigDefault;

export const useBaseConfig = () => {
    const [baseConfig, setBaseConfig] = useState(baseConfigDefault);

    const updateBaseConfigField = (
        field: string,
        value: any,
        strategyFields: ConfigField[],
        setStrategyFields: (fields: ConfigField[]) => void,
        onStrategyChange: (yaml: string) => void
    ) => {
        // Type guard to ensure field is a valid key
        if (field in baseConfigDefault) {
            setBaseConfig((prev) => ({ ...prev, [field]: value }));
            if (field === "SYMBOL") {
                // Reset TFs field when SYMBOL changes
                const updatedFields = strategyFields.map((f) => (f.key === "TFs" ? { ...f, value: [] } : f));
                setStrategyFields(updatedFields);
                const { fieldsToYaml } = require("@/lib/yaml");
                const newYaml = fieldsToYaml(updatedFields);
                onStrategyChange(newYaml);
            }
        }
    };

    return { baseConfig, setBaseConfig, updateBaseConfigField };
};