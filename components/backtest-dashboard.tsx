"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TradingChart } from "@/components/trading-chart"
import { StatsPanel } from "@/components/stats-panel"
import { YamlConfigPanel } from "@/components/yaml-config-panel"
import { TradesPanel, type TradeData } from "@/components/trades-panel"
import { useToast } from "@/hooks/use-toast"
import { Play, Square, RotateCcw, BarChart3, Activity, List } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import yaml from "js-yaml"
import type { Signal } from "@/types/signal"

const API_BASE_URL = "http://localhost:8000"
const WS_URL = API_BASE_URL.replace("http", "ws") + "/ws/backtest"

interface BacktestStats {
    net_profit: number
    total_comission: number
    total_trades: number
    win_rate: number
    current_balance: number
    initial_balance: number
    wins: number
    losses: number
}

interface ChartData {
    time: string
    open: number
    high: number
    low: number
    close: number
}

interface EquityPoint {
    trade: number
    balance: number
    timestamp: string
}

export function BacktestDashboard() {
    const [backtestStatus, setBacktestStatus] = useState<"idle" | "starting" | "running" | "completed" | "error">("idle")
    const [progress, setProgress] = useState(0)
    const [statusMessage, setStatusMessage] = useState("Ready to start backtest")
    const [activeTab, setActiveTab] = useState("dashboard")
    const [configComission, setConfigComission] = useState(0)
    const [statsUpdated, setStatsUpdated] = useState(false)
    const [markerEntries, setMarkerEntries] = useState<Signal[]>([])
    const [markerExits, setMarkerExits] = useState<Signal[]>([])
    const [trades, setTrades] = useState<TradeData[]>([])
    const [showTradesPanel, setShowTradesPanel] = useState(false)

    const [stats, setStats] = useState<BacktestStats>({
        net_profit: 0,
        total_comission: 0,
        total_trades: 0,
        win_rate: 0,
        current_balance: 0,
        initial_balance: 0,
        wins: 0,
        losses: 0,
    })
    const [equityData, setEquityData] = useState<EquityPoint[]>([])
    const [chartData, setChartData] = useState<ChartData[]>([])
    const [yamlConfig, setYamlConfig] = useState("")
    const [yamlStrategy, setYamlStrategy] = useState("")

    const wsRef = useRef<WebSocket | null>(null)
    const { toast } = useToast()

    const [configLoaded, setConfigLoaded] = useState(false)
    const [strategyListLoaded, setStrategyListLoaded] = useState(false)

    const fetchBaseConfig = async () => {
        if (configLoaded) return

        try {
            setStatusMessage("Loading base config...")
            const configResponse = await fetch(`${API_BASE_URL}/api/config`)
            if (configResponse.ok) {
                const configData = await configResponse.json()
                setYamlConfig(configData.yaml || "")
                setConfigLoaded(true)
            }
        } catch {
            setStatusMessage("Error loading base config")
        }
    }

    const fetchStrategyList = async () => {
        if (strategyListLoaded) return

        try {
            const listResponse = await fetch(`${API_BASE_URL}/api/list`)
            if (listResponse.ok) {
                const listData = await listResponse.json()
                setStatusMessage(`Ready - ${listData.files?.length || 0} strategies available`)
                setStrategyListLoaded(true)
            } else {
                setStatusMessage("Ready - No strategies found")
            }
        } catch {
            setStatusMessage("Error loading strategies list")
        }
    }

    useEffect(() => {
        fetchBaseConfig()
        fetchStrategyList()
    }, [])

    useEffect(() => {
        if (yamlConfig) {
            try {
                const parsedConfig = yaml.load(yamlConfig) as any
                const comission = parsedConfig?.BACKTEST?.COMISSION || 0
                setConfigComission(comission)
            } catch {
                setConfigComission(0)
            }
        }
    }, [yamlConfig])

    useEffect(() => {
        if (statsUpdated) {
            const timer = setTimeout(() => {
                setStatsUpdated(false)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [statsUpdated])

    const connectWebSocket = (onReady?: () => void) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            onReady?.()
            return
        }

        if (wsRef.current?.readyState === WebSocket.CONNECTING) {
            wsRef.current.addEventListener("open", () => onReady?.(), { once: true })
            return
        }

        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        const convertTimeFormat = (timeStr: any) => {
            if (typeof timeStr === "number") return timeStr
            if (typeof timeStr === "string") {
                const date = new Date(timeStr)
                return Math.floor(date.getTime() / 1000)
            }
            return timeStr
        }

        ws.onopen = () => onReady?.()

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)

            switch (data.type) {
                case "progress":
                    setProgress(data.progress)
                    setBacktestStatus(data.status)
                    setStatusMessage(data.message)
                    break
                case "statistics":
                    if (data.url) window.open(data.url, "_blank")
                    break
                case "chart_data":
                    if (data.candle) {
                        const newCandle = {
                            time: convertTimeFormat(data.candle.time),
                            open: data.candle.open,
                            high: data.candle.high,
                            low: data.candle.low,
                            close: data.candle.close,
                        }

                        setChartData((prev) => {
                            const existingIndex = prev.findIndex((item) => item.time === newCandle.time)

                            if (existingIndex !== -1) {
                                const updated = [...prev]
                                updated[existingIndex] = newCandle
                                return updated
                            } else {
                                const updated = [...prev, newCandle]
                                return updated.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
                            }
                        })
                    }

                    if (data.price_data && Array.isArray(data.price_data)) {
                        const formattedData = data.price_data.map((candle: any) => ({
                            time: convertTimeFormat(candle.time),
                            open: candle.open,
                            high: candle.high,
                            low: candle.low,
                            close: candle.close,
                        }))
                        setChartData(formattedData)
                    }
                    break
                case "stats_update":
                    setStatsUpdated(true)
                    const balanceChange = data.balance || 0

                    if (data.result || data.tipo || data.pnl !== undefined) {
                        const newTrade: TradeData = {
                            id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            result: data.result || "MANUAL",
                            timestamp: data.timestamp || new Date().toISOString(),
                            tipo: data.tipo || "LONG",
                            pnl: data.pnl || balanceChange,
                            order_type: data.order_type || "market",
                            fees: data.fees || configComission,
                            pair: data.pair || "UNKNOWN",
                        }

                        setTrades((prev) => [...prev, newTrade])
                    }

                    setStats((prev) => {
                        const newBalance = prev.current_balance + balanceChange
                        const newTotalTrades = prev.total_trades + 1
                        const newTotalComission = prev.total_comission + configComission
                        const isWin = balanceChange > 0
                        const newWins = prev.wins + (isWin ? 1 : 0)
                        const newLosses = prev.losses + (isWin ? 0 : 1)
                        const newWinRate = newTotalTrades > 0 ? (newWins / newTotalTrades) * 100 : 0
                        const netProfit =
                            prev.initial_balance > 0 ? ((newBalance - prev.initial_balance) / prev.initial_balance) * 100 : 0

                        setEquityData((prevEquity) => [
                            ...prevEquity,
                            {
                                trade: newTotalTrades,
                                balance: newBalance,
                                timestamp: new Date().toISOString(),
                            },
                        ])

                        return {
                            ...prev,
                            current_balance: newBalance,
                            total_trades: newTotalTrades,
                            total_comission: newTotalComission,
                            wins: newWins,
                            losses: newLosses,
                            win_rate: newWinRate,
                            net_profit: netProfit,
                        }
                    })
                    break
                case "completed":
                    setBacktestStatus("completed")
                    setProgress(100)
                    setStatusMessage("Backtest completed successfully")
                    toast({ title: "Backtest Completed", description: "Your backtest has finished successfully." })
                    break
                case "error":
                    setBacktestStatus("error")
                    setStatusMessage(data.message)
                    toast({
                        title: data.name || "Backtest Error",
                        description: (
                            <div>
                                <p>{data.message}</p>
                                {data.traceback && (
                                    <pre className="whitespace-pre-wrap text-xs mt-2 bg-destructive text-destructive-foreground p-2 rounded max-h-80 overflow-auto">
                    {data.traceback}
                  </pre>
                                )}
                            </div>
                        ),
                        variant: "destructive",
                        className: "w-96 max-w-full",
                    })
                    break
                case "finished":
                    setBacktestStatus("completed")
                    setProgress(100)
                    setStatusMessage("Backtest finished - Connection closing")
                    toast({ title: "Backtest Finished", description: "Backtest completed and connection closed." })
                    if (data.url) {
                        localStorage.setItem("resultsUrl", data.url)
                    }
                    ws.close()
                    break
                case "markers":
                    setMarkerEntries(data.entries || [])
                    setMarkerExits(data.exits || [])
                    break
            }
        }

        ws.onclose = () => {
            if (backtestStatus === "running" || backtestStatus === "starting") {
                setBacktestStatus("error")
                setStatusMessage("Connection lost")
            }
        }

        ws.onerror = () => {
            setBacktestStatus("error")
            setStatusMessage("WebSocket connection error")
        }
    }

    const startBacktest = () => {
        if (!yamlConfig || !yamlStrategy) {
            toast({
                title: "Configuration Missing",
                description: "Please ensure both base config and strategy are loaded.",
                variant: "destructive",
            })
            return
        }

        try {
            const parsedConfig = yaml.load(yamlConfig) as any
            const initialBalance = parsedConfig?.BACKTEST?.BALANCE || 0
            setStats({
                current_balance: initialBalance,
                initial_balance: initialBalance,
                net_profit: 0,
                total_comission: 0,
                total_trades: 0,
                win_rate: 0,
                wins: 0,
                losses: 0,
            })
            setEquityData([
                {
                    trade: 0,
                    balance: initialBalance,
                    timestamp: new Date().toISOString(),
                },
            ])
        } catch (error) {
            console.warn("Error parsing config for balance:", error)
        }

        const sendStartMessage = () => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                    JSON.stringify({
                        type: "start_backtest",
                        config_yaml: yamlConfig,
                        strategy_yaml: yamlStrategy,
                    }),
                )
                setBacktestStatus("starting")
                setProgress(0)
                setStatusMessage("Initializing backtest...")
                setActiveTab("dashboard")
            } else {
                setBacktestStatus("error")
                setStatusMessage("WebSocket connection failed")
            }
        }

        connectWebSocket(sendStartMessage)
    }

    const stopBacktest = () => {
        if (wsRef.current) {
            wsRef.current.close()
            setBacktestStatus("idle")
            setProgress(0)
            setStatusMessage("Backtest stopped")
        }
    }

    const resetBacktest = () => {
        setBacktestStatus("idle")
        setProgress(0)
        setStatusMessage("Ready to start backtest")
        setStats({
            net_profit: 0,
            total_comission: 0,
            total_trades: 0,
            win_rate: 0,
            current_balance: 0,
            initial_balance: 0,
            wins: 0,
            losses: 0,
        })
        setEquityData([])
        setChartData([])
        setStatsUpdated(false)
        setTrades([])
    }

    const formatBalance = (value: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(value)
    }

    const formatTooltip = (value: number, name: string) => {
        if (name === "balance") {
            return [formatBalance(value), "Balance"]
        }
        return [value, name]
    }

    useEffect(() => {
        return () => {
            if (wsRef.current) wsRef.current.close()
        }
    }, [])

    return (
        <div className="flex pt-0 flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            <main className="flex-1">
                <div className="container mx-auto max-w-screen-2xl px-4 py-4">
                    <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center justify-between text-xl">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  Backtest Control
                </span>
                                <div className="flex space-x-3">
                                    <Button
                                        onClick={() => setShowTradesPanel(!showTradesPanel)}
                                        variant="outline"
                                        size="sm"
                                        className="shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 bg-transparent"
                                    >
                                        <List className="w-4 h-4 mr-2" />
                                        Trades
                                    </Button>
                                    <Button
                                        onClick={startBacktest}
                                        disabled={backtestStatus === "running" || backtestStatus === "starting"}
                                        size="sm"
                                        className="shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                                    >
                                        <Play className="w-4 h-4 mr-2" />
                                        Start
                                    </Button>
                                    <Button
                                        onClick={stopBacktest}
                                        disabled={backtestStatus === "idle" || backtestStatus === "completed"}
                                        variant="destructive"
                                        size="sm"
                                        className="shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                                    >
                                        <Square className="w-4 h-4 mr-2" />
                                        Stop
                                    </Button>
                                    <Button
                                        onClick={resetBacktest}
                                        variant="outline"
                                        size="sm"
                                        className="shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 bg-transparent"
                                    >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Reset
                                    </Button>
                                </div>
                            </CardTitle>
                            <CardDescription className="text-base">{statusMessage}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm font-medium">
                                    <span>Progress</span>
                                    <span className="text-primary">{progress}%</span>
                                </div>
                                <Progress value={progress} className="w-full h-2 shadow-inner" />
                            </div>
                        </CardContent>
                    </Card>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6 pt-3">
                        <TabsList className="grid w-full grid-cols-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm shadow-lg border-0 p-1">
                            <TabsTrigger
                                value="dashboard"
                                className="data-[state=active]:shadow-md transition-all duration-200 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border data-[state=active]:border-blue-200 font-medium"
                            >
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Dashboard
                            </TabsTrigger>
                            <TabsTrigger
                                value="config"
                                className="data-[state=active]:shadow-md transition-all duration-200 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border data-[state=active]:border-blue-200 font-medium"
                            >
                                <Activity className="h-4 w-4 mr-2" />
                                Configuration
                            </TabsTrigger>
                        </TabsList>

                        {/* Dashboard content - usando forceMount para mantenerlo montado */}
                        <div className={`space-y-6 ${activeTab !== "dashboard" ? "hidden" : ""}`}>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                                <StatsPanel stats={stats} isUpdated={statsUpdated} />
                            </div>

                            <div className="grid gap-6 lg:grid-cols-2">
                                <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg">Price Chart</CardTitle>
                                        <CardDescription>Real-time price data and candlesticks</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {chartData.length > 0 ? (
                                            <div className="h-[300px] w-full rounded-lg overflow-hidden">
                                                <TradingChart data={chartData} entries={markerEntries} exits={markerExits} />
                                            </div>
                                        ) : (
                                            <div className="flex h-[300px] items-center justify-center text-muted-foreground rounded-lg bg-slate-50/50 dark:bg-slate-800/50">
                                                <div className="text-center">
                                                    <p className="text-lg mb-2">No price data available</p>
                                                    <p className="text-sm">The chart will be displayed when backtest data is available</p>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg">Balance Evolution</CardTitle>
                                        <CardDescription>Track your balance changes throughout the backtest</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {equityData.length > 0 ? (
                                            <div className="h-[300px] w-full rounded-lg overflow-hidden">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={equityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted opacity-30" />
                                                        <XAxis
                                                            dataKey="trade"
                                                            className="text-muted-foreground text-xs"
                                                            axisLine={false}
                                                            tickLine={false}
                                                            type="number"
                                                            scale="linear"
                                                            domain={["dataMin", "dataMax"]}
                                                        />
                                                        <YAxis
                                                            className="text-muted-foreground text-xs"
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tickFormatter={formatBalance}
                                                            domain={[Math.min(stats.initial_balance, ...equityData.map((d) => d.balance)), "auto"]}
                                                        />
                                                        <Tooltip
                                                            formatter={formatTooltip}
                                                            labelFormatter={(label) => `Trade: ${label}`}
                                                            contentStyle={{
                                                                backgroundColor: "hsl(var(--background))",
                                                                border: "1px solid hsl(var(--border))",
                                                                borderRadius: "8px",
                                                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                                            }}
                                                        />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="balance"
                                                            stroke="hsl(var(--primary))"
                                                            strokeWidth={2.5}
                                                            dot={false}
                                                            activeDot={{ r: 5, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "white" }}
                                                            isAnimationActive={equityData.length <= 3}
                                                            animationDuration={300}
                                                            animationEasing="ease-out"
                                                            animationBegin={0}
                                                        />
                                                        <ReferenceLine
                                                            y={stats.initial_balance}
                                                            stroke="hsl(var(--muted-foreground))"
                                                            strokeDasharray="5 5"
                                                            strokeWidth={1.5}
                                                            label={{
                                                                value: "Initial Balance",
                                                                position: "insideTopRight",
                                                                fill: "hsl(var(--muted-foreground))",
                                                                fontSize: 12,
                                                                fontWeight: 500,
                                                            }}
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                            <div className="flex h-[300px] items-center justify-center text-muted-foreground rounded-lg bg-slate-50/50 dark:bg-slate-800/50">
                                                <div className="text-center">
                                                    <p className="text-lg mb-2">No balance data available</p>
                                                    <p className="text-sm">The chart will be displayed when backtest data is available</p>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Config content - SIEMPRE renderizado */}
                        <div className={`space-y-4 ${activeTab !== "config" ? "hidden" : ""}`}>
                            <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between text-lg">
                                        <span>Configuration Status</span>
                                        <div className="flex items-center gap-3">
                                            <Badge variant={yamlConfig ? "default" : "secondary"} className="shadow-sm">
                                                Base Config: {yamlConfig ? "Loaded" : "Not loaded"}
                                            </Badge>
                                            <Badge variant={yamlStrategy ? "default" : "secondary"} className="shadow-sm">
                                                Strategy: {yamlStrategy ? "Selected" : "Not selected"}
                                            </Badge>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={fetchStrategyList}
                                                className="shadow-md hover:shadow-lg transition-all duration-200 bg-transparent"
                                            >
                                                Refresh Strategy List
                                            </Button>
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Configure your base settings and select a trading strategy before starting the backtest.
                                    </p>
                                </CardContent>
                            </Card>

                            {/* YamlConfigPanel SIEMPRE montado */}
                            <YamlConfigPanel
                                yamlConfig={yamlConfig}
                                yamlStrategy={yamlStrategy}
                                onConfigChange={setYamlConfig}
                                onStrategyChange={setYamlStrategy}
                            />
                        </div>
                    </Tabs>
                </div>
            </main>
            <TradesPanel trades={trades} isVisible={showTradesPanel} onToggle={() => setShowTradesPanel(false)} />
        </div>
    )
}
