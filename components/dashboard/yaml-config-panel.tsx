"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigField, YamlConfigPanelProps } from "@/types/yaml";
import { parseYamlToFields, fieldsToYaml, baseConfigToYaml } from "@/lib/yaml";
import { apiUtils } from "@/lib/api-utils";
import { useBaseConfig } from "@/hooks/use-base-config";
import { BaseConfigCard } from "@/components/parameters/base-config-card";
import { StrategyConfigCard } from "@/components/parameters/strategy-config-card";
import { RawYamlTab } from "@/components/parameters/raw-yaml-tab";
import yaml from "js-yaml";

export function YamlConfigPanel({ yamlConfig, yamlStrategy, onConfigChange, onStrategyChange }: YamlConfigPanelProps) {
  const { baseConfig, setBaseConfig, updateBaseConfigField } = useBaseConfig();
  const [strategyFields, setStrategyFields] = useState<ConfigField[]>([]);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [availablePairs, setAvailablePairs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialConfigLoaded, setIsInitialConfigLoaded] = useState(false);

  const prioritizedFieldsOrder = ['TOPIC', 'DESCRIPTION', 'TFs', 'TRADING HOURS', 'EXCLUDED DAYS', 'RIESGO', 'RR'];

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const pairs = await apiUtils.loadAvailablePairs();
        setAvailablePairs(pairs);

        const files = await apiUtils.loadAvailableFiles();
        setAvailableFiles(files);

        if (!isInitialConfigLoaded && (!yamlConfig || yamlConfig.trim() === "")) {
          const configData = await apiUtils.loadInitialConfig();
          if (configData) {
            try {
              const parsed = yaml.load(configData.yaml) as any;
              if (parsed?.BACKTEST) {
                setBaseConfig((prev) => ({
                  ...prev,
                  STRATEGY: typeof parsed.BACKTEST.STRATEGY === "string" ? parsed.BACKTEST.STRATEGY : prev.STRATEGY,
                  INICIO: typeof parsed.BACKTEST.INICIO === "string" ? parsed.BACKTEST.INICIO : prev.INICIO,
                  FIN: typeof parsed.BACKTEST.FIN === "string" ? parsed.BACKTEST.FIN : prev.FIN,
                  BALANCE: typeof parsed.BACKTEST.BALANCE === "number" ? parsed.BACKTEST.BALANCE : prev.BALANCE,
                  VELAS: typeof parsed.BACKTEST.VELAS === "number" ? parsed.BACKTEST.VELAS : prev.VELAS,
                  SPREAD: typeof parsed.BACKTEST.SPREAD === "number" ? parsed.BACKTEST.SPREAD : prev.SPREAD,
                  COMISSION: typeof parsed.BACKTEST.COMISSION === "number" ? parsed.BACKTEST.COMISSION : prev.COMISSION,
                  SYMBOL: Array.isArray(parsed.BACKTEST.SYMBOL) ? parsed.BACKTEST.SYMBOL : [],
                }));
              }
            } catch (error) {
              console.warn("Error parsing initial config:", error);
            }
          }
          setIsInitialConfigLoaded(true);
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };

    loadInitialData();
  }, [isInitialConfigLoaded, yamlConfig, setBaseConfig]);

  // Update config YAML when baseConfig changes
  useEffect(() => {
    const newYaml = baseConfigToYaml(baseConfig);
    onConfigChange(newYaml);
  }, [baseConfig, onConfigChange]);

  // Parse strategy when yamlStrategy changes
  useEffect(() => {
    const parseStrategy = async () => {
      if (yamlStrategy) {
        const fields = await parseYamlToFields(yamlStrategy, baseConfig);
        setStrategyFields(fields);
      }
    };
    parseStrategy();
  }, [yamlStrategy, baseConfig]);

  // Load strategy file when strategy changes
  useEffect(() => {
    const loadStrategyFile = async () => {
      if (!baseConfig.STRATEGY || !availableFiles.includes(baseConfig.STRATEGY)) return;

      setLoading(true);
      try {
        const yamlContent = await apiUtils.loadStrategyFile(baseConfig.STRATEGY);
        if (yamlContent) {
          onStrategyChange(yamlContent);
        }
      } catch (error) {
        console.error("Error loading strategy file:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStrategyFile();
  }, [baseConfig.STRATEGY, availableFiles, onStrategyChange]);

  const updateStrategyFieldValue = (key: string, value: any) => {
    const updatedFields = strategyFields.map((field) => (field.key === key ? { ...field, value } : field));
    setStrategyFields(updatedFields);
    const newYaml = fieldsToYaml(updatedFields);
    onStrategyChange(newYaml);
  };

  const handleMultiselectChange = (fieldKey: string, option: string, checked: boolean) => {
    const field = strategyFields.find((f) => f.key === fieldKey);
    if (!field) return;

    let newValue = Array.isArray(field.value) ? [...field.value] : [];

    if (checked) {
      if (!newValue.includes(option)) newValue.push(option);
    } else {
      newValue = newValue.filter((v) => v !== option);
    }

    updateStrategyFieldValue(fieldKey, newValue);
  };

  return (
      <div className="space-y-4">
        <Tabs defaultValue="visual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="visual">Visual Editor</TabsTrigger>
            <TabsTrigger value="raw">Raw YAML</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <BaseConfigCard
                  baseConfig={baseConfig}
                  availableFiles={availableFiles}
                  availablePairs={availablePairs}
                  strategyFields={strategyFields}
                  setStrategyFields={setStrategyFields}
                  onStrategyChange={onStrategyChange}
                  updateBaseConfigField={updateBaseConfigField}
              />

              <StrategyConfigCard
                  baseConfig={baseConfig}
                  strategyFields={strategyFields}
                  loading={loading}
                  prioritizedFieldsOrder={prioritizedFieldsOrder}
                  onFieldUpdate={updateStrategyFieldValue}
                  onMultiselectChange={handleMultiselectChange}
              />
            </div>
          </TabsContent>

          <TabsContent value="raw" className="space-y-4">
            <RawYamlTab
                yamlConfig={yamlConfig}
                yamlStrategy={yamlStrategy}
                onConfigChange={onConfigChange}
                onStrategyChange={onStrategyChange}
            />
          </TabsContent>
        </Tabs>
      </div>
  );
}