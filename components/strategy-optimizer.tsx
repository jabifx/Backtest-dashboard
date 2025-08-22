"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MultiValueYamlConfig } from "@/components/multi-value-yaml-config"
import { useToast } from "@/hooks/use-toast"
import { useWebSocket } from "@/hooks/use-websocket"
import {
  Play,
  Square,
  RotateCcw,
  Clock,
  Target,
  BarChart3,
  TrendingUp,
  Activity,
  Settings,
  Trophy,
  Timer,
} from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const WS_URL = API_BASE_URL.replace("http", "ws") + "/ws/optimizer"

interface OptimizationResult {
  combination_id: number
  parameters: Record<string, any>
  net_profit: number // Ahora representa el P&L absoluto
  win_rate: number
  total_trades: number
  current_balance: number
}

export function StrategyOptimizer() {
  const [optimizationStatus, setOptimizationStatus] = useState<"idle" | "starting" | "running" | "completed" | "error">(
    "idle",
  )
  const [currentBacktestProgress, setCurrentBacktestProgress] = useState(0) // Progress of the current individual backtest
  const [statusMessage, setStatusMessage] = useState("Ready to start optimization")
  const [activeTab, setActiveTab] = useState("optimizer")
  const [currentBacktest, setCurrentBacktest] = useState(0) // Number of backtests completed
  const [totalBacktests, setTotalBacktests] = useState(0) // Total number of combinations to run
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0)
  const [results, setResults] = useState<OptimizationResult[]>([])
  const [bestResult, setBestResult] = useState<OptimizationResult | null>(null)
  const [currentCombinationId, setCurrentCombinationId] = useState<number | null>(null) // ID de la combinación actual
  const [trainingReevaluationResults, setTrainingReevaluationResults] = useState<OptimizationResult[]>([])

  const [yamlConfig, setYamlConfig] = useState("")
  const [yamlStrategy, setYamlStrategy] = useState("")

  const {
    status: wsStatus,
    send: wsSend,
    connect: wsConnect,
    disconnect: wsDisconnect,
    isConnected,
  } = useWebSocket({
    url: WS_URL,
    onMessage: (data) => {
      switch (data.type) {
        case "progress":
          setCurrentBacktestProgress(data.progress)
          setOptimizationStatus(data.status)
          setStatusMessage(data.message)
          setCurrentBacktest(data.current_backtest)
          setCurrentCombinationId(data.combination_id || null)
          break

        case "backtest_completed":
          setCurrentBacktest(data.current_backtest)
          setCurrentCombinationId(null)
          if (data.result) {
            const newResult: OptimizationResult = {
              combination_id: data.result.combination_id,
              parameters: data.result.parameters,
              net_profit: data.result.net_profit,
              win_rate: data.result.win_rate,
              total_trades: data.result.total_trades,
              current_balance: data.result.current_balance,
            }

            setResults((prev) => {
              const updated = [...prev, newResult].sort((a, b) => b.net_profit - a.net_profit)
              if (updated.length > 0) {
                setBestResult(updated[0])
              }
              return updated
            })
          }
          break

        case "backtest_training_top3":
          if (data.result) {
            const newResult: OptimizationResult = {
              combination_id: data.result.combination_id,
              parameters: data.result.parameters,
              net_profit: data.result.net_profit,
              win_rate: data.result.win_rate,
              total_trades: data.result.total_trades,
              current_balance: data.result.current_balance,
            }
            setTrainingReevaluationResults((prev) => [...prev, newResult])
          }
          setCurrentBacktest((prev) => prev + 1)
          break

        case "optimization_started":
          setOptimizationStatus("running")
          setStartTime(new Date())
          setCurrentBacktest(0)
          setCurrentCombinationId(null)
          setTotalBacktests(Number(data.total_combinations) || 0)
          setResults([])
          setBestResult(null)
          break

        case "completed":
          setOptimizationStatus("completed")
          setCurrentBacktestProgress(100)
          setStatusMessage("Optimization completed successfully")
          setCurrentCombinationId(null)
          toast({
            title: "Optimization Completed",
            description: `Completed ${totalBacktests} backtests in ${formatTime(elapsedTime)}`,
          })
          break

        case "error":
          setOptimizationStatus("error")
          setStatusMessage(data.message)
          setCurrentCombinationId(null)
          toast({
            title: data.name || "Optimization Error",
            description: data.message,
            variant: "destructive",
          })
          break
      }
    },
    onError: () => {
      setOptimizationStatus("error")
      setStatusMessage("WebSocket connection error")
    },
    onClose: () => {
      if (optimizationStatus === "running" || optimizationStatus === "starting") {
        setOptimizationStatus("error")
        setStatusMessage("Connection lost")
      }
    },
  })

  const { toast } = useToast()

  // Fetch initial base config on component mount
  useEffect(() => {
    const fetchInitialBaseConfig = async () => {
      try {
        setStatusMessage("Loading base config...")
        const configResponse = await fetch(`${API_BASE_URL}/api/config`)
        if (configResponse.ok) {
          const configData = await configResponse.json()
          setYamlConfig(configData.yaml || "")
          setStatusMessage("Base config loaded. Ready to start optimization.")
        } else {
          setStatusMessage("Error loading base config.")
          toast({
            title: "Configuration Error",
            description: "Failed to load initial base configuration from API.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching initial base config:", error)
        setStatusMessage("Network error loading base config.")
        toast({
          title: "Network Error",
          description: "Could not connect to API to load initial base configuration.",
          variant: "destructive",
        })
      }
    }

    fetchInitialBaseConfig()

    // Cleanup WebSocket and timer on unmount
    return () => {
      wsDisconnect()
    }
  }, []) // Empty dependency array means this runs once on mount

  // Timer effect for elapsed time
  useEffect(() => {
    if (optimizationStatus === "running" && startTime) {
      const timer = setInterval(() => {
        const now = new Date()
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
        setElapsedTime(elapsed)

        if (currentBacktest > 0 && totalBacktests > 0) {
          const avgTimePerBacktest = elapsed / currentBacktest
          const remaining = (totalBacktests - currentBacktest) * avgTimePerBacktest
          setEstimatedTimeRemaining(Math.floor(remaining))
        }
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [optimizationStatus, startTime, currentBacktest, totalBacktests])

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value)
  }

  const getStatusColor = () => {
    switch (optimizationStatus) {
      case "idle":
        return "secondary"
      case "starting":
      case "running":
        return "default"
      case "completed":
        return "default"
      case "error":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const getStatusText = () => {
    switch (optimizationStatus) {
      case "idle":
        return "Idle"
      case "starting":
        return "Starting..."
      case "running":
        return "Optimizing"
      case "completed":
        return "Completed"
      case "error":
        return "Error"
      default:
        return "Unknown"
    }
  }

  const startOptimization = () => {
    if (!yamlConfig || !yamlStrategy) {
      toast({
        title: "Configuration Missing",
        description: "Please ensure both base config and strategy are loaded.",
        variant: "destructive",
      })
      return
    }

    if (yamlStrategy.trim() === "") {
      toast({
        title: "No Strategy Selected",
        description: "Please select a strategy to start optimization.",
        variant: "destructive",
      })
      return
    }

    if (isConnected) {
      const success = wsSend({
        type: "start_optimization",
        config_yaml: yamlConfig,
        strategy_yaml: yamlStrategy,
      })

      if (success) {
        setOptimizationStatus("starting")
        setCurrentBacktestProgress(0)
        setStatusMessage("Initializing optimization...")
        setActiveTab("optimizer")
      } else {
        setOptimizationStatus("error")
        setStatusMessage("Failed to send start message")
      }
    } else {
      wsConnect()
      // Wait for connection and retry
      const checkConnection = setInterval(() => {
        if (isConnected) {
          clearInterval(checkConnection)
          startOptimization()
        }
      }, 100)

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkConnection)
        if (!isConnected) {
          setOptimizationStatus("error")
          setStatusMessage("Failed to connect to server")
        }
      }, 5000)
    }
  }

  const stopOptimization = () => {
    wsDisconnect()
    setOptimizationStatus("idle")
    setCurrentBacktestProgress(0)
    setStatusMessage("Optimization stopped")
  }

  const resetOptimization = () => {
    setOptimizationStatus("idle")
    setCurrentBacktestProgress(0)
    setStatusMessage("Ready to start optimization")
    setCurrentBacktest(0)
    setTotalBacktests(0) // Reset total backtests
    setStartTime(null)
    setElapsedTime(0)
    setEstimatedTimeRemaining(0)
    setResults([])
    setBestResult(null)
    setCurrentCombinationId(null)
    setTrainingReevaluationResults([])
  }

  return (
    <div className="flex min-h-screen flex-col pt-12">
      <main className="flex-1">
        <div className="container mx-auto max-w-screen-2xl px-4 py-6">
          {/* Overview Stats */}
          <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Progress</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentBacktest}/{totalBacktests}
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalBacktests > 0 ? `${((currentBacktest / totalBacktests) * 100).toFixed(1)}%` : "0%"} completed
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Elapsed Time</CardTitle>
                <Timer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTime(elapsedTime)}</div>
                <p className="text-xs text-muted-foreground">Time since optimization started</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ETA</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTime(estimatedTimeRemaining)}</div>
                <p className="text-xs text-muted-foreground">Estimated time remaining</p>
              </CardContent>
            </Card>
          </div>

          {/* Control Panel */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Optimization Control</span>
                <div className="flex space-x-2">
                  <Button
                    onClick={startOptimization}
                    disabled={optimizationStatus === "running" || optimizationStatus === "starting"}
                    size="sm"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </Button>
                  <Button
                    onClick={stopOptimization}
                    disabled={optimizationStatus === "idle" || optimizationStatus === "completed"}
                    variant="destructive"
                    size="sm"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                  <Button onClick={resetOptimization} variant="outline" size="sm">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>{statusMessage}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progreso del Backtest Actual */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current Backtest Progress</span>
                    <span>{currentBacktestProgress.toFixed(1)}%</span>
                  </div>
                  <Progress value={currentBacktestProgress} className="w-full" />
                </div>

                {/* REMOVED: Best Result Highlight */}
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="optimizer">Live Monitor</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            <TabsContent value="optimizer" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Optimization Summary Card (formerly Live Status) */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Optimization Summary
                    </CardTitle>
                    <CardDescription>Overall progress and current status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold mb-2">
                          {totalBacktests > 0 ? Math.round((currentBacktest / totalBacktests) * 100) : 0}%
                        </div>
                        <p className="text-muted-foreground">Overall Complete</p>
                      </div>

                      <div className="space-y-4">
                        <div className="grid gap-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Current Combination ID</span>
                            <span className="text-sm font-medium">
                              {currentCombinationId !== null ? currentCombinationId : "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Elapsed Time</span>
                            <span className="text-sm font-medium">{formatTime(elapsedTime)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Estimated Remaining</span>
                            <span className="text-sm font-medium">{formatTime(estimatedTimeRemaining)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Results Found</span>
                            <span className="text-sm font-medium">{results.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Results */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Top Performing Results
                    </CardTitle>
                    <CardDescription>Best parameter combinations discovered so far</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {results.length === 0 ? (
                      <div className="text-center text-muted-foreground py-12">
                        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg mb-2">No results yet</p>
                        <p className="text-sm">Results will appear as optimization progresses</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {results.slice(0, 8).map((result, index) => (
                          <div
                            key={result.combination_id}
                            className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                              index === 0
                                ? "border-yellow-200 bg-yellow-50"
                                : index < 3
                                  ? "border-green-200 bg-green-50"
                                  : "border-gray-200 bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                {index === 0 && <Trophy className="h-4 w-4 text-yellow-600" />}
                                <Badge
                                  variant={index === 0 ? "default" : index < 3 ? "secondary" : "outline"}
                                  className={
                                    index === 0
                                      ? "bg-yellow-500 text-white"
                                      : index < 3
                                        ? "bg-green-100 text-green-800"
                                        : ""
                                  }
                                >
                                  #{index + 1}
                                </Badge>
                              </div>
                              <div>
                                <p className="font-bold text-lg">
                                  {result.net_profit >= 0 ? "+" : ""}
                                  {formatCurrency(result.net_profit)} {/* Changed to P&L */}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {result.win_rate.toFixed(1)}% WR • {result.total_trades} trades
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{formatCurrency(result.current_balance)}</p>
                              <p className="text-sm text-muted-foreground">Combination {result.combination_id}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="config" className="space-y-4">
              <MultiValueYamlConfig
                yamlConfig={yamlConfig}
                yamlStrategy={yamlStrategy}
                onConfigChange={setYamlConfig}
                onStrategyChange={setYamlStrategy}
              />
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Detailed Results Analysis
                  </CardTitle>
                  <CardDescription>Complete optimization results with parameter details</CardDescription>
                </CardHeader>
                <CardContent>
                  {results.length === 0 ? (
                    <div className="flex min-h-[300px] items-center justify-center text-center text-muted-foreground">
                      <div>
                        <Target className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-xl mb-2">No results available</p>
                        <p className="text-sm">Run an optimization to see detailed results and analysis</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">Showing {results.length} results, sorted by P&L</p>
                        <Badge variant="outline" className="px-3 py-1">
                          {results.length} combinations tested
                        </Badge>
                      </div>

                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {results.map((result, index) => (
                          <Card key={result.combination_id} className="border-l-4 border-l-primary">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                                  <Badge variant={index < 3 ? "default" : "secondary"}>#{index + 1}</Badge>
                                  <span className="font-semibold">Combination {result.combination_id}</span>
                                </div>
                                <div className="text-right">
                                  <span
                                    className={`text-xl font-bold ${
                                      result.net_profit >= 0 ? "text-green-600" : "text-red-600"
                                    }`}
                                  >
                                    {result.net_profit >= 0 ? "+" : ""}
                                    {formatCurrency(result.net_profit)} {/* Changed to P&L */}
                                  </span>
                                </div>
                              </div>

                              <div className="grid gap-4 md:grid-cols-4 mb-3">
                                <div className="text-center p-2 bg-blue-50 rounded">
                                  <div className="text-lg font-semibold text-blue-600">
                                    {result.win_rate.toFixed(1)}%
                                  </div>
                                  <p className="text-xs text-blue-700">Win Rate</p>
                                </div>
                                <div className="text-center p-2 bg-purple-50 rounded">
                                  <div className="text-lg font-semibold text-purple-600">{result.total_trades}</div>
                                  <p className="text-xs text-purple-700">Total Trades</p>
                                </div>
                                <div className="text-center p-2 bg-orange-50 rounded">
                                  <div className="text-lg font-semibold text-orange-600">
                                    {formatCurrency(result.current_balance)}
                                  </div>
                                  <p className="text-xs text-orange-700">Final Balance</p>
                                </div>
                                <div className="text-center p-2 bg-gray-50 rounded">
                                  <div className="text-lg font-semibold text-gray-600">
                                    {Object.keys(result.parameters).length}
                                  </div>
                                  <p className="text-xs text-gray-700">Parameters</p>
                                </div>
                              </div>

                              <details className="mt-3">
                                <summary className="cursor-pointer text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-2">
                                  <Settings className="h-4 w-4" />
                                  View Parameter Configuration
                                </summary>
                                <div className="mt-3 p-3 bg-muted rounded-lg">
                                  <pre className="text-xs whitespace-pre-wrap">
                                    {JSON.stringify(result.parameters, null, 2)}
                                  </pre>
                                </div>
                              </details>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              {trainingReevaluationResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      Top 3 Training Re-evaluation Results
                    </CardTitle>
                    <CardDescription>
                      Performance of the best test combinations on their training periods
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {trainingReevaluationResults.map((trainingResult, index) => {
                        // Find the original test result for comparison
                        const originalTestResult = results.find(
                          (r) => r.combination_id === trainingResult.combination_id,
                        )

                        return (
                          <div
                            key={`training-${trainingResult.combination_id}-${index}`}
                            className="flex items-center justify-between p-4 rounded-lg border-2 border-purple-200 bg-purple-50"
                          >
                            <div className="flex items-center gap-4">
                              <Badge variant="default" className="bg-purple-500 text-white">
                                Top {index + 1} Re-evaluation
                              </Badge>
                              <div>
                                <p className="font-bold text-lg">
                                  {trainingResult.net_profit >= 0 ? "+" : ""}
                                  {formatCurrency(trainingResult.net_profit)} {"P&L (Training)"}
                                </p>
                                {originalTestResult && (
                                  <p className="text-sm text-muted-foreground">
                                    Original Test P&L:{" "}
                                    <span
                                      className={`font-semibold ${
                                        originalTestResult.net_profit >= 0 ? "text-green-600" : "text-red-600"
                                      }`}
                                    >
                                      {originalTestResult.net_profit >= 0 ? "+" : ""}
                                      {formatCurrency(originalTestResult.net_profit)}
                                    </span>
                                  </p>
                                )}
                                <p className="text-sm text-muted-foreground">
                                  {trainingResult.win_rate.toFixed(1)}% WR • {trainingResult.total_trades} trades
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{formatCurrency(trainingResult.current_balance)}</p>
                              <p className="text-sm text-muted-foreground">
                                Combination {trainingResult.combination_id}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
