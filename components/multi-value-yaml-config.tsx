"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, RefreshCw, Settings, Plus, X } from "lucide-react"
import yaml from "js-yaml"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface MultiValueConfigField {
    key: string
    label: string
    type: "string" | "number" | "boolean" | "select" | "multiselect"
    options?: string[]
    values: any[] // Array of values instead of single value
}

interface BaseConfig {
    STRATEGY: string
    INICIO: string
    FIN: string
    BALANCE: number
    VELAS: number
    SPREAD: number
    COMISSION: number
    SYMBOL: string
}

interface MultiValueYamlConfigProps {
    yamlConfig: string
    yamlStrategy: string
    onConfigChange: (config: string) => void
    onStrategyChange: (strategy: string) => void
}

// Define valores por defecto para la configuración base
const DEFAULT_BASE_CONFIG: BaseConfig = {
    STRATEGY: "",
    INICIO: "2015-01-01 00:00:00",
    FIN: "2017-06-30 00:00:00",
    BALANCE: 5000,
    VELAS: 600,
    SPREAD: 0.0001,
    COMISSION: 2,
    SYMBOL: "EURUSD",
}

export function MultiValueYamlConfig({
                                         yamlConfig,
                                         yamlStrategy,
                                         onConfigChange,
                                         onStrategyChange,
                                     }: MultiValueYamlConfigProps) {
    const [strategyFields, setStrategyFields] = useState<MultiValueConfigField[]>([])
    const [availableFiles, setAvailableFiles] = useState<string[]>([])
    const [availablePairs, setAvailablePairs] = useState<string[]>([])
    const [loading, setLoading] = useState(false)

    const [baseConfig, setBaseConfig] = useState<BaseConfig>(DEFAULT_BASE_CONFIG)

    const parseYamlToMultiValueFields = async (yamlString: string): Promise<MultiValueConfigField[]> => {
        try {
            const parsed = yaml.load(yamlString) as any
            const fields: MultiValueConfigField[] = []

            const processObject = async (obj: any, prefix = "") => {
                for (const [key, value] of Object.entries(obj)) {
                    const fullKey = prefix ? `${prefix}.${key}` : key

                    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                        await processObject(value, fullKey)
                    } else {
                        let inferredType: "string" | "number" | "boolean" | "multiselect" = "string"
                        let processedValues: any[] = []
                        let options: string[] | undefined = undefined

                        const rawValues = Array.isArray(value) ? value : [value]
                        const sampleValue = rawValues.length > 0 ? rawValues[0] : undefined

                        const isTimeframeField = key.toLowerCase().includes("timeframe") || key === "TFs"

                        if (typeof sampleValue === "number") {
                            inferredType = "number"
                        } else if (typeof sampleValue === "boolean") {
                            inferredType = "boolean"
                        } else if (typeof sampleValue === "string") {
                            const numValue = Number(sampleValue)
                            if (!isNaN(numValue) && sampleValue.trim() !== "") {
                                inferredType = "number"
                            } else if (sampleValue.toLowerCase() === "true" || sampleValue.toLowerCase() === "false") {
                                inferredType = "boolean"
                            } else if (isTimeframeField) {
                                inferredType = "multiselect"
                                try {
                                    const response = await fetch(`${API_BASE_URL}/api/timeframes/${baseConfig.SYMBOL}`)
                                    if (response.ok) {
                                        const data = await response.json()
                                        options = data.timeframes || []
                                    }
                                } catch (error) {
                                    console.error("Error loading timeframes:", error)
                                    options = []
                                }
                            }
                        } else if (Array.isArray(sampleValue) || isTimeframeField) {
                            inferredType = "multiselect"
                            try {
                                const response = await fetch(`${API_BASE_URL}/api/timeframes/${baseConfig.SYMBOL}`)
                                if (response.ok) {
                                    const data = await response.json()
                                    options = data.timeframes || []
                                }
                            } catch (error) {
                                console.error("Error loading timeframes:", error)
                                options = []
                            }
                        }

                        if (inferredType === "multiselect") {
                            processedValues = rawValues.map((v) => (Array.isArray(v) ? v : [v]))
                        } else {
                            processedValues = rawValues.map((v) => {
                                if (inferredType === "number") {
                                    return typeof v === "string" ? Number(v) : v
                                }
                                if (inferredType === "boolean") {
                                    return typeof v === "string" ? v.toLowerCase() === "true" : v
                                }
                                return v
                            })
                        }

                        fields.push({
                            key: fullKey,
                            label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
                            type: inferredType,
                            options,
                            values: processedValues,
                        })
                    }
                }
            }

            await processObject(parsed)
            return fields
        } catch (error) {
            return []
        }
    }

    const fieldsToOptimizationYaml = (fields: MultiValueConfigField[]): string => {
        const obj: any = {}

        fields.forEach((field) => {
            const keys = field.key.split(".")
            let current = obj

            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {}
                }
                current = current[keys[i]]
            }

            current[keys[keys.length - 1]] = field.values
        })

        return yaml.dump(obj, { indent: 2 })
    }

    const baseConfigToYaml = (config: BaseConfig): string => {
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
        }
        return yaml.dump(yamlObj, { indent: 2 })
    }

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
        const loadAvailableFiles = async () => {
            try {
                await loadAvailablePairs()

                const listResponse = await fetch(`${API_BASE_URL}/api/list`)
                if (listResponse.ok) {
                    const listData = await listResponse.json()
                    setAvailableFiles(listData.files || [])
                }
            } catch (error) {
                console.error("Error loading available files:", error)
                setAvailableFiles([])
            }
        }
        loadAvailableFiles()
    }, [])

    useEffect(() => {
        if (yamlConfig) {
            try {
                const parsed = yaml.load(yamlConfig) as any
                if (parsed?.BACKTEST) {
                    setBaseConfig({
                        STRATEGY:
                            typeof parsed.BACKTEST.STRATEGY === "string" ? parsed.BACKTEST.STRATEGY : DEFAULT_BASE_CONFIG.STRATEGY,
                        INICIO: typeof parsed.BACKTEST.INICIO === "string" ? parsed.BACKTEST.INICIO : DEFAULT_BASE_CONFIG.INICIO,
                        FIN: typeof parsed.BACKTEST.FIN === "string" ? parsed.BACKTEST.FIN : DEFAULT_BASE_CONFIG.FIN,
                        BALANCE:
                            typeof parsed.BACKTEST.BALANCE === "number" ? parsed.BACKTEST.BALANCE : DEFAULT_BASE_CONFIG.BALANCE,
                        VELAS: typeof parsed.BACKTEST.VELAS === "number" ? parsed.BACKTEST.VELAS : DEFAULT_BASE_CONFIG.VELAS,
                        SPREAD: typeof parsed.BACKTEST.SPREAD === "number" ? parsed.BACKTEST.SPREAD : DEFAULT_BASE_CONFIG.SPREAD,
                        COMISSION:
                            typeof parsed.BACKTEST.COMISSION === "number" ? parsed.BACKTEST.COMISSION : DEFAULT_BASE_CONFIG.COMISSION,
                        SYMBOL: typeof parsed.BACKTEST.SYMBOL === "string" ? parsed.BACKTEST.SYMBOL : DEFAULT_BASE_CONFIG.SYMBOL,
                    })
                } else {
                    setBaseConfig(DEFAULT_BASE_CONFIG)
                }
            } catch (error) {
                console.warn("Error parsing yamlConfig prop:", error)
                setBaseConfig(DEFAULT_BASE_CONFIG)
            }
        } else {
            setBaseConfig(DEFAULT_BASE_CONFIG)
        }
    }, [yamlConfig])

    useEffect(() => {
        const parseStrategy = async () => {
            if (yamlStrategy) {
                const fields = await parseYamlToMultiValueFields(yamlStrategy)
                setStrategyFields(fields)
            }
        }
        parseStrategy()
    }, [yamlStrategy, baseConfig.SYMBOL])

    const addValueToField = (fieldKey: string) => {
        setStrategyFields((prev) => {
            const updatedFields = prev.map((field) => {
                if (field.key === fieldKey) {
                    let newValue: any
                    if (field.type === "number") {
                        newValue = 0
                    } else if (field.type === "boolean") {
                        newValue = false
                    } else {
                        newValue = ""
                    }
                    return { ...field, values: [...field.values, newValue] }
                }
                return field
            })
            onStrategyChange(fieldsToOptimizationYaml(updatedFields))
            return updatedFields
        })
    }

    const removeValueFromField = (fieldKey: string, valueIndex: number) => {
        setStrategyFields((prev) => {
            const updatedFields = prev.map((field) => {
                if (field.key === fieldKey && field.values.length > 1) {
                    const newValues = field.values.filter((_, index) => index !== valueIndex)
                    return { ...field, values: newValues }
                }
                return field
            })
            onStrategyChange(fieldsToOptimizationYaml(updatedFields))
            return updatedFields
        })
    }

    const updateFieldValue = (fieldKey: string, valueIndex: number, newValue: any) => {
        setStrategyFields((prev) => {
            const updatedFields = prev.map((field) => {
                if (field.key === fieldKey) {
                    const newValues = [...field.values]
                    newValues[valueIndex] = newValue
                    return { ...field, values: newValues }
                }
                return field
            })
            onStrategyChange(fieldsToOptimizationYaml(updatedFields))
            return updatedFields
        })
    }

    const handleMultiselectChange = (fieldKey: string, valueIndex: number, option: string, checked: boolean) => {
        setStrategyFields((prev) => {
            const updatedFields = prev.map((field) => {
                if (field.key === fieldKey) {
                    const newValues = [...field.values]
                    let currentValue = Array.isArray(newValues[valueIndex]) ? [...newValues[valueIndex]] : []

                    if (checked) {
                        if (!currentValue.includes(option)) {
                            currentValue.push(option)
                        }
                    } else {
                        currentValue = currentValue.filter((v) => v !== option)
                    }

                    newValues[valueIndex] = currentValue
                    return { ...field, values: newValues }
                }
                return field
            })
            onStrategyChange(fieldsToOptimizationYaml(updatedFields))
            return updatedFields
        })
    }

    const updateBaseConfigField = (fieldKey: keyof BaseConfig, newValue: any) => {
        setBaseConfig((prev) => {
            const updatedConfig = { ...prev, [fieldKey]: newValue }
            onConfigChange(baseConfigToYaml(updatedConfig))
            return updatedConfig
        })
    }

    const renderMultiValueField = (field: MultiValueConfigField) => {
        return (
            <div key={field.key} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{field.label}</Label>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                            {field.values.length} value{field.values.length !== 1 ? "s" : ""}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => addValueToField(field.key)} className="h-6 w-6 p-0">
                            <Plus className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    {field.values.map((value, index) => (
                        <div key={index} className="flex items-center gap-2">
                            {field.type === "boolean" ? (
                                <Select
                                    value={value.toString()}
                                    onValueChange={(newValue) => updateFieldValue(field.key, index, newValue === "true")}
                                >
                                    <SelectTrigger className="flex-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">True</SelectItem>
                                        <SelectItem value="false">False</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : field.type === "number" ? (
                                <Input
                                    type="number"
                                    value={value}
                                    onChange={(e) => updateFieldValue(field.key, index, Number.parseFloat(e.target.value))}
                                    className="flex-1"
                                />
                            ) : field.type === "multiselect" ? (
                                <div className="flex-1 space-y-2 p-2 border rounded">
                                    <div className="text-xs text-muted-foreground">Timeframes for combination {index + 1}</div>
                                    {field.options && field.options.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-1">
                                            {field.options.map((option) => (
                                                <div key={option} className="flex items-center space-x-1">
                                                    <Checkbox
                                                        id={`${field.key}-${index}-${option}`}
                                                        checked={Array.isArray(value) ? value.includes(option) : false}
                                                        onCheckedChange={(checked) =>
                                                            handleMultiselectChange(field.key, index, option, checked as boolean)
                                                        }
                                                    />
                                                    <Label htmlFor={`${field.key}-${index}-${option}`} className="text-xs">
                                                        {option}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-muted-foreground">No timeframes available</div>
                                    )}
                                </div>
                            ) : (
                                <Input
                                    value={value}
                                    onChange={(e) => updateFieldValue(field.key, index, e.target.value)}
                                    className="flex-1"
                                />
                            )}

                            {field.values.length > 1 && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => removeValueFromField(field.key, index)}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )
    }

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

    return (
        <div className="space-y-4">
            <Tabs defaultValue="visual" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="visual">Visual Editor</TabsTrigger>
                    <TabsTrigger value="raw">Raw YAML</TabsTrigger>
                </TabsList>

                <TabsContent value="visual" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="w-4 h-4" />
                                    Base Configuration
                                    <Badge variant="default">Fixed</Badge>
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    These parameters remain constant across all optimizations
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-4 max-h-96 overflow-y-auto">
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
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="inicio">Start Date</Label>
                                        <Input
                                            id="inicio"
                                            type="datetime-local"
                                            value={typeof baseConfig.INICIO === "string" ? baseConfig.INICIO.replace(" ", "T") : ""}
                                            onChange={(e) => updateBaseConfigField("INICIO", e.target.value.replace("T", " "))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="fin">End Date</Label>
                                        <Input
                                            id="fin"
                                            type="datetime-local"
                                            value={typeof baseConfig.FIN === "string" ? baseConfig.FIN.replace(" ", "T") : ""}
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
                                    Strategy Parameters
                                    <Badge variant="secondary">{strategyFields.length} parameters</Badge>
                                    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">Add multiple values to each parameter for optimization</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-4 max-h-80 overflow-y-auto">
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
                                        strategyFields.map((field) => renderMultiValueField(field))
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
                            </CardHeader>
                            <CardContent>
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
                                    Strategy Optimization YAML
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    value={yamlStrategy}
                                    onChange={(e) => onStrategyChange(e.target.value)}
                                    className="font-mono text-sm min-h-[300px]"
                                    placeholder="Strategy optimization parameters will appear here..."
                                />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
