"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, RefreshCw, Settings, Trash2 } from "lucide-react"
import { ConfigField, YamlConfigPanelProps } from "@/types/yaml"
import { parseYamlToFields, fieldsToYaml, baseConfigToYaml, baseConfigDefault } from "@/lib/yaml"
import yaml from "js-yaml"
import { Button } from "@/components/ui/button"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const useBaseConfig = () => {
  const [baseConfig, setBaseConfig] = useState(baseConfigDefault)

  const updateBaseConfigField = (field: keyof typeof baseConfigDefault, value: any, strategyFields: ConfigField[], setStrategyFields: (fields: ConfigField[]) => void, onStrategyChange: (yaml: string) => void) => {
    setBaseConfig(prev => ({ ...prev, [field]: value }))
    if (field === "SYMBOL") {
      // Reset TFs field when SYMBOL changes
      const updatedFields = strategyFields.map(f => f.key === "TFs" ? { ...f, value: [] } : f)
      setStrategyFields(updatedFields)
      const newYaml = fieldsToYaml(updatedFields)
      onStrategyChange(newYaml)
    }
  }

  return { baseConfig, setBaseConfig, updateBaseConfigField }
}

export function YamlConfigPanel({ yamlConfig, yamlStrategy, onConfigChange, onStrategyChange }: YamlConfigPanelProps) {
  const { baseConfig, setBaseConfig, updateBaseConfigField } = useBaseConfig()
  const [strategyFields, setStrategyFields] = useState<ConfigField[]>([])
  const [availableFiles, setAvailableFiles] = useState<string[]>([])
  const [availablePairs, setAvailablePairs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [isInitialConfigLoaded, setIsInitialConfigLoaded] = useState(false)

  const prioritizedFieldsOrder = ['TOPIC', 'DESCRIPTION', 'TFs', 'TRADING HOURS', 'EXCLUDED DAYS','RIESGO', 'RR']

  // Extract TOPIC and DESCRIPTION for header
  const topicField = strategyFields.find(field => field.key === 'TOPIC')
  const descriptionField = strategyFields.find(field => field.key === 'DESCRIPTION')

  // Filter out TOPIC and DESCRIPTION from sorted fields for content
  const sortedStrategyFields = useMemo(() => {
    const contentFields = strategyFields.filter(field => !['TOPIC', 'DESCRIPTION'].includes(field.key))
    return [
      ...prioritizedFieldsOrder
          .filter(key => !['TOPIC', 'DESCRIPTION'].includes(key))
          .map((key) => contentFields.find((field) => field.key === key))
          .filter((field): field is ConfigField => !!field),
      ...contentFields.filter((field) => !prioritizedFieldsOrder.includes(field.key)),
    ]
  }, [strategyFields])

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
        const fields = await parseYamlToFields(yamlStrategy, baseConfig)
        setStrategyFields(fields)
      }
    }
    parseStrategy()
  }, [yamlStrategy, baseConfig])

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

  const handleTradingHoursChange = (index: number, type: 'start' | 'end', value: string) => {
    const field = strategyFields.find(f => f.key === 'TRADING HOURS')
    if (!field) return

    let newValue = Array.isArray(field.value) ? [...field.value] : []

    // Split existing range or initialize empty
    const currentRange = newValue[index] || ''
    const [currentStart, currentEnd] = currentRange ? currentRange.split('-') : ['', '']

    // Update start or end time
    const newRange = type === 'start' ? `${value}-${currentEnd}` : `${currentStart}-${value}`

    // Validate format (HH:MM-HH:MM)
    if (/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(newRange)) {
      newValue[index] = newRange
      updateStrategyFieldValue('TRADING HOURS', newValue)
    }
  }

  const addTradingHoursRange = () => {
    const field = strategyFields.find(f => f.key === 'TRADING HOURS')
    if (!field) return

    const newValue = Array.isArray(field.value) ? [...field.value, '00:00-00:00'] : ['00:00-00:00']
    updateStrategyFieldValue('TRADING HOURS', newValue)
  }

  const removeTradingHoursRange = (index: number) => {
    const field = strategyFields.find(f => f.key === 'TRADING HOURS')
    if (!field) return

    const newValue = Array.isArray(field.value) ? field.value.filter((_, i) => i !== index) : []
    updateStrategyFieldValue('TRADING HOURS', newValue)
  }

  const renderStrategyField = (field: ConfigField) => {
    if (field.key === 'TRADING HOURS') {
      const timeRanges = Array.isArray(field.value) ? field.value : []
      return (
          <div key={field.key} className="space-y-2">
            <Label>{field.label}</Label>
            <div className="space-y-2 p-2 border rounded-lg max-h-[160px] overflow-y-auto">
              {timeRanges.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No trading hours defined</div>
              ) : (
                  timeRanges.map((range: string, index: number) => {
                    const [start, end] = range.split('-')
                    return (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                              type="time"
                              value={start}
                              onChange={(e) => handleTradingHoursChange(index, 'start', e.target.value)}
                              className="w-20"
                          />
                          <span>-</span>
                          <Input
                              type="time"
                              value={end}
                              onChange={(e) => handleTradingHoursChange(index, 'end', e.target.value)}
                              className="w-20"
                          />
                          <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeTradingHoursRange(index)}
                              className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                    )
                  })
              )}
              <Button
                  variant="outline"
                  size="sm"
                  onClick={addTradingHoursRange}
                  className="mt-2 w-full"
              >
                Add Time Range
              </Button>
            </div>
          </div>
      )
    }

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
          ) : field.type === "number" ? (
              <Input
                  id={field.key}
                  type="number"
                  value={field.value}
                  onChange={(e) => updateStrategyFieldValue(field.key, Number.parseFloat(e.target.value))}
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
                        onValueChange={(value) => updateBaseConfigField("STRATEGY", value, strategyFields, setStrategyFields, onStrategyChange)}
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
                          onChange={(e) => updateBaseConfigField("INICIO", e.target.value.replace("T", " "), strategyFields, setStrategyFields, onStrategyChange)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fin">End Date</Label>
                      <Input
                          id="fin"
                          type="datetime-local"
                          value={baseConfig.FIN.replace(" ", "T")}
                          onChange={(e) => updateBaseConfigField("FIN", e.target.value.replace("T", " "), strategyFields, setStrategyFields, onStrategyChange)}
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
                          onChange={(e) => updateBaseConfigField("BALANCE", Number(e.target.value), strategyFields, setStrategyFields, onStrategyChange)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="velas">Candles</Label>
                      <Input
                          id="velas"
                          type="number"
                          value={baseConfig.VELAS}
                          onChange={(e) => updateBaseConfigField("VELAS", Number(e.target.value), strategyFields, setStrategyFields, onStrategyChange)}
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
                          onChange={(e) => updateBaseConfigField("SPREAD", Number(e.target.value), strategyFields, setStrategyFields, onStrategyChange)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comission">Commission</Label>
                      <Input
                          id="comission"
                          type="number"
                          value={baseConfig.COMISSION}
                          onChange={(e) => updateBaseConfigField("COMISSION", Number(e.target.value), strategyFields, setStrategyFields, onStrategyChange)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol</Label>
                    <Select
                        value={baseConfig.SYMBOL}
                        onValueChange={(value) => updateBaseConfigField("SYMBOL", value, strategyFields, setStrategyFields, onStrategyChange)}
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
                            {(() => {
                              const fields = [];
                              let normalInputCount = 0;
                              let isAfterSpecial = false; // Tracks if after TRADING HOURS or multiselect
                              let stackedInputs: ConfigField[] = []; // Buffer for inputs to stack

                              for (const field of sortedStrategyFields) {
                                if (field.type === "multiselect" || field.key === 'TRADING HOURS') {
                                  // Render any buffered stacked inputs from the previous row
                                  if (stackedInputs.length > 0) {
                                    fields.push(
                                        <div key={`stack-${fields.length}`} className="col-span-1 flex flex-col h-[160px] overflow-y-auto">
                                          {stackedInputs.map((inputField) => renderStrategyField(inputField))}
                                        </div>
                                    );
                                    stackedInputs = []; // Clear buffer
                                  }
                                  fields.push(
                                      <div key={field.key} className="col-span-1">
                                        {renderStrategyField(field)}
                                      </div>
                                  );
                                  isAfterSpecial = true;
                                  normalInputCount = 0; // Reset count
                                } else if (isAfterSpecial && normalInputCount < 2) {
                                  stackedInputs.push(field); // Add to buffer
                                  normalInputCount++;
                                  if (normalInputCount === 2 || stackedInputs.length === 2) {
                                    fields.push(
                                        <div key={`stack-${fields.length}`} className="col-span-1 flex flex-col h-[160px] overflow-y-auto">
                                          {stackedInputs.map((inputField) => renderStrategyField(inputField))}
                                        </div>
                                    );
                                    stackedInputs = []; // Clear buffer after rendering
                                    isAfterSpecial = false; // Reset after max stack
                                  }
                                } else {
                                  // Render any buffered stacked inputs from the previous row
                                  if (stackedInputs.length > 0) {
                                    fields.push(
                                        <div key={`stack-${fields.length}`} className="col-span-1 flex flex-col h-[160px] overflow-y-auto">
                                          {stackedInputs.map((inputField) => renderStrategyField(inputField))}
                                        </div>
                                    );
                                    stackedInputs = []; // Clear buffer
                                  }
                                  fields.push(
                                      <div key={field.key} className="col-span-1">
                                        {renderStrategyField(field)}
                                      </div>
                                  );
                                }
                              }
                              // Render any remaining stacked inputs
                              if (stackedInputs.length > 0) {
                                fields.push(
                                    <div key={`stack-${fields.length}`} className="col-span-1 flex flex-col h-[160px] overflow-y-auto">
                                      {stackedInputs.map((inputField) => renderStrategyField(inputField))}
                                    </div>
                                );
                              }
                              return fields;
                            })()}
                          </div>
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