import { useState, useEffect } from "react";
import yaml from "js-yaml";
import { API_BASE_URL } from "@/lib/backtest-utils";

export const useBacktestConfig = () => {
    const [yamlConfig, setYamlConfig] = useState("");
    const [yamlStrategy, setYamlStrategy] = useState("");
    const [configComission, setConfigComission] = useState(0);
    const [configLoaded, setConfigLoaded] = useState(false);
    const [strategyListLoaded, setStrategyListLoaded] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Ready to start backtest");

    const fetchBaseConfig = async () => {
        if (configLoaded) return;

        try {
            setStatusMessage("Loading base config...");
            const configResponse = await fetch(`${API_BASE_URL}/api/config`);
            if (configResponse.ok) {
                const configData = await configResponse.json();
                setYamlConfig(configData.yaml || "");
                setConfigLoaded(true);
            }
        } catch {
            setStatusMessage("Error loading base config");
        }
    };

    const fetchStrategyList = async () => {
        if (strategyListLoaded) return;

        try {
            const listResponse = await fetch(`${API_BASE_URL}/api/list`);
            if (listResponse.ok) {
                const listData = await listResponse.json();
                setStatusMessage(`Ready - ${listData.files?.length || 0} strategies available`);
                setStrategyListLoaded(true);
            } else {
                setStatusMessage("Ready - No strategies found");
            }
        } catch {
            setStatusMessage("Error loading strategies list");
        }
    };

    useEffect(() => {
        fetchBaseConfig();
        fetchStrategyList();
    }, []);

    useEffect(() => {
        if (yamlConfig) {
            try {
                const parsedConfig = yaml.load(yamlConfig) as any;
                const comission = parsedConfig?.BACKTEST?.COMISSION || 0;
                setConfigComission(comission);
            } catch {
                setConfigComission(0);
            }
        }
    }, [yamlConfig]);

    const getInitialBalance = (): number => {
        try {
            const parsedConfig = yaml.load(yamlConfig) as any;
            return parsedConfig?.BACKTEST?.BALANCE || 0;
        } catch {
            return 0;
        }
    };

    return {
        yamlConfig,
        yamlStrategy,
        configComission,
        statusMessage,
        setYamlConfig,
        setYamlStrategy,
        fetchStrategyList,
        getInitialBalance,
    };
};