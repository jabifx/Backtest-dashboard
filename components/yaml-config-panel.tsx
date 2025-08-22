"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, RefreshCw, Settings } from "lucide-react"
import { ConfigField, YamlConfigPanelProps } from "@/types/yaml";
import { parseYamlToFields, fieldsToYaml, baseConfigToYaml, useBaseConfig} from "@/lib/yaml";

import yaml from "js-yaml"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function YamlConfigPanel({ yamlConfig, yamlStrategy, onConfigChange, onStrategyChange }: YamlConfigPanelProps) {
  const { baseConfig, setBaseConfig, updateBaseConfigField } = useBaseConfig();
  const [strategyFields, setStrategyFields] = useState<ConfigField[]>([])
  const [availableFiles, setAvailableFiles] = useState<string[]>([])
  const [availablePairs, setAvailablePairs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [isInitialConfigLoaded, setIsInitialConfigLoaded] = useState(false)


  const loadAvailablePairs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/pairs`)
      if (response.ok) {
        const data = await response.json()
        setAvailablePairs(data.pairs || [])
      }
    } catch (error) {
      console.error("Error loading pairs:", error)
      setAvailablePairs([])
    }
  }

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await loadAvailablePairs()

        const listResponse = await fetch(`${API_BASE_URL}/api/list`)
        if (listResponse.ok) {
          const listData = await listResponse.json()
          setAvailableFiles(listData.files || [])
        }

        if (!isInitialConfigLoaded && (!yamlConfig || yamlConfig.trim() === "")) {
          const configResponse = await fetch(`${API_BASE_URL}/api/config`)
          if (configResponse.ok) {
            const configData = await configResponse.json()
            try {
              const parsed = yaml.load(configData.yaml) as any
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
                  SYMBOL: typeof parsed.BACKTEST.SYMBOL === "string" ? parsed.BACKTEST.SYMBOL : prev.SYMBOL,
                }))
              }
            } catch (error) {
              console.warn("Error parsing initial config:", error)
            }
          }
          setIsInitialConfigLoaded(true)
        }
      } catch (error) {
        console.error("Error loading initial data:", error)
        setAvailableFiles([])
      }
    }

    loadInitialData()
  }, [])

  useEffect(() => {
    const newYaml = baseConfigToYaml(baseConfig)
    onConfigChange(newYaml)
  }, [baseConfig, onConfigChange])

  useEffect(() => {
    const parseStrategy = async () => {
      if (yamlStrategy) {
        const fields = await parseYamlToFields(yamlStrategy)
        setStrategyFields(fields)
      }
    }
    parseStrategy()
  }, [yamlStrategy, baseConfig.SYMBOL])

  useEffect(() => {
    const loadStrategyFile = async () => {
      if (!baseConfig.STRATEGY || !availableFiles.includes(baseConfig.STRATEGY)) return

      setLoading(true)
      try {
        const response = await fetch(`${API_BASE_URL}/api/read?file=${encodeURIComponent(baseConfig.STRATEGY)}`)
        const data = await response.json()
        if (data.yaml) {
          onStrategyChange(data.yaml)
        }
      } catch (error) {
        console.error("Error loading strategy file:", error)
      }
      setLoading(false)
    }

    loadStrategyFile()
  }, [baseConfig.STRATEGY, availableFiles, onStrategyChange])


  const updateStrategyFieldValue = (key: string, value: any) => {
    const updatedFields = strategyFields.map((field) => (field.key === key ? { ...field, value } : field))
    setStrategyFields(updatedFields)
    const newYaml = fieldsToYaml(updatedFields)
    onStrategyChange(newYaml)
  }

  const handleMultiselectChange = (fieldKey: string, option: string, checked: boolean) => {
    const field = strategyFields.find((f) => f.key === fieldKey)
    if (!field) return

    let newValue = Array.isArray(field.value) ? [...field.value] : []

    if (checked) {
      if (!newValue.includes(option)) newValue.push(option)
    } else {
      newValue = newValue.filter((v) => v !== option)
    }

    updateStrategyFieldValue(fieldKey, newValue)
  }

  const renderStrategyField = (field: ConfigField) => {
    return (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={field.key}>{field.label}</Label>
          {field.type === "boolean" ? (
              <Select
                  value={field.value.toString()}
                  onValueChange={(value) => updateStrategyFieldValue(field.key, value === "true")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">True</SelectItem>
                  <SelectItem value="false">False</SelectItem>
                </SelectContent>
              </Select>
          ): field.type === "number" ? (
              <Input
                  id={field.key}
                  type="number"
                  value={field.value}
                  onChange={(e) => updateStrategyFieldValue(field.key, Number.parseFloat(e.target.value))}
              />
          ) : field.type === "multiselect" ? (
              <div className="space-y-2 p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">
                  Select multiple options (currently selected: {Array.isArray(field.value) ? field.value.length : 0})
                </div>
                {field.options && field.options.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {field.options.map((option) => (
                          <div key={option} className="flex items-center space-x-2">
                            <Checkbox
                                id={`${field.key}-${option}`}
                                checked={Array.isArray(field.value) ? field.value.includes(option) : false}
                                onCheckedChange={(checked) => handleMultiselectChange(field.key, option, checked as boolean)}
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
                  onChange={(e) => updateStrategyFieldValue(field.key, e.target.value)}
              />
          )}
        </div>
    )
  }

  return (
      <div className="space-y-4">
        <Tabs defaultValue="visual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="visual">Visual Editor</TabsTrigger>
            <TabsTrigger value="raw">Raw YAML</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
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
                        onValueChange={(value) => updateBaseConfigField("STRATEGY", value)}
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
                          onChange={(e) => updateBaseConfigField("INICIO", e.target.value.replace("T", " "))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fin">End Date</Label>
                      <Input
                          id="fin"
                          type="datetime-local"
                          value={baseConfig.FIN.replace(" ", "T")}
                          onChange={(e) => updateBaseConfigField("FIN", e.target.value.replace("T", " "))}
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
                          onChange={(e) => updateBaseConfigField("BALANCE", Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="velas">Candles</Label>
                      <Input
                          id="velas"
                          type="number"
                          value={baseConfig.VELAS}
                          onChange={(e) => updateBaseConfigField("VELAS", Number(e.target.value))}
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
                          onChange={(e) => updateBaseConfigField("SPREAD", Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comission">Commission</Label>
                      <Input
                          id="comission"
                          type="number"
                          value={baseConfig.COMISSION}
                          onChange={(e) => updateBaseConfigField("COMISSION", Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol</Label>
                    <Select
                        value={baseConfig.SYMBOL}
                        onValueChange={(value) => updateBaseConfigField("SYMBOL", value)}
                        disabled={availablePairs.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                            placeholder={availablePairs.length === 0 ? "No pairs available" : "Select symbol..."}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePairs.map((pair) => (
                            <SelectItem key={pair} value={pair}>
                              {pair}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availablePairs.length === 0 && (
                        <p className="text-xs text-muted-foreground">No pairs found. Check your API connection.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Strategy Configuration
                    <Badge variant="secondary">{strategyFields.length} fields</Badge>
                    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {baseConfig.STRATEGY
                        ? `Parameters for ${baseConfig.STRATEGY}`
                        : "Select a strategy to configure parameters"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
                  <div className="space-y-4 overflow-y-auto">
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
                            <Badge variant="secondary">Strategy Parameters</Badge>
                            <span className="text-sm text-muted-foreground">{baseConfig.STRATEGY}</span>
                          </div>
                          {strategyFields.map((field) => renderStrategyField(field))}
                        </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="raw" className="space-y-4">
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
          </TabsContent>
        </Tabs>
      </div>
  )
}
