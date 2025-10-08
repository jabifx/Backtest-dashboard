"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TradingChart } from "@/components/dashboard/trading-chart";
import { StatsPanel } from "@/components/dashboard/stats-panel";
import { YamlConfigPanel } from "@/components/dashboard/yaml-config-panel";
import { TradesPanel } from "@/components/dashboard/trades-panel";
import { BacktestControlPanel } from "@/components/dashboard/control-panel";
import { BacktestProgress } from "@/components/dashboard/progress";
import { BalanceChart } from "@/components/dashboard/balance-chart";
import { useBacktestConfig } from "@/hooks/use-backtest-config";
import { useBacktestStats } from "@/hooks/use-backtest-stats";
import { useBacktestWebSocket } from "@/hooks/use-backtest-websocket";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Activity } from "lucide-react";
import type { BacktestStatus, ChartData } from "@/types/backtest";
import type { Signal } from "@/types/signal";

export function BacktestDashboard() {
    // Estado local
    const [backtestStatus, setBacktestStatus] = useState<BacktestStatus>("idle");
    const [progress, setProgress] = useState(0);
    const [activeTab, setActiveTab] = useState("dashboard");
    const [showTradesPanel, setShowTradesPanel] = useState(false);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [markerEntries, setMarkerEntries] = useState<Signal[]>([]);
    const [markerExits, setMarkerExits] = useState<Signal[]>([]);
    const [wsStatusMessage, setWsStatusMessage] = useState("");

    // Hooks personalizados
    const { toast } = useToast();

    const {
        yamlConfig,
        yamlStrategy,
        configComission,
        statusMessage,
        setYamlConfig,
        setYamlStrategy,
        fetchStrategyList,
        getInitialBalance,
    } = useBacktestConfig();

    const {
        stats,
        equityData,
        trades,
        statsUpdated,
        initializeStats,
        updateStats,
        resetStats,
    } = useBacktestStats(configComission);

    const { startBacktest: wsStartBacktest, stopBacktest, closeWebSocket } = useBacktestWebSocket({
        updateStats,
        configComission,
        setBacktestStatus,
        setProgress,
        setStatusMessage: setWsStatusMessage,
        setChartData,
        setMarkerEntries,
        setMarkerExits,
        backtestStatus,
    });

    // Usar el mensaje del WebSocket si está disponible, sino el de la configuración
    const displayStatusMessage = wsStatusMessage || statusMessage;

    // Handlers
    const handleStartBacktest = () => {
        if (!yamlConfig || !yamlStrategy) {
            toast({
                title: "Configuration Missing",
                description: "Please ensure both base config and strategy are loaded.",
                variant: "destructive",
            });
            return;
        }

        const initialBalance = getInitialBalance();
        initializeStats(initialBalance);
        wsStartBacktest(yamlConfig, yamlStrategy);
        setActiveTab("dashboard");
    };

    const handleResetBacktest = () => {
        setBacktestStatus("idle");
        setProgress(0);
        setWsStatusMessage("");
        resetStats();
        setChartData([]);
    };

    // Cleanup
    useEffect(() => {
        return () => {
            closeWebSocket();
        };
    }, [closeWebSocket]);

    return (
        <div className="flex pt-0 flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            <main className="flex-1">
                <div className="container mx-auto max-w-screen-2xl px-4 py-4">
                    {/* Control Panel */}
                    <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center justify-between text-xl">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  Backtest Control
                </span>
                                <BacktestControlPanel
                                    backtestStatus={backtestStatus}
                                    onStart={handleStartBacktest}
                                    onStop={stopBacktest}
                                    onReset={handleResetBacktest}
                                    onToggleTrades={() => setShowTradesPanel(!showTradesPanel)}
                                />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <BacktestProgress progress={progress} statusMessage={displayStatusMessage} />
                        </CardContent>
                    </Card>

                    {/* Tabs */}
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

                        {/* Dashboard Tab */}
                        <div className={`space-y-6 ${activeTab !== "dashboard" ? "hidden" : ""}`}>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                                <StatsPanel stats={stats} isUpdated={statsUpdated} />
                            </div>

                            <div className="grid gap-6 lg:grid-cols-2">
                                {/* Price Chart */}
                                <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg">Price Chart</CardTitle>
                                        <CardDescription>Real-time price data and candlesticks</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {chartData.length > 0 ? (
                                            <div className="h-[300px] w-full rounded-lg overflow-hidden">
                                                <TradingChart data={chartData} />
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

                                {/* Balance Chart */}
                                <BalanceChart equityData={equityData} stats={stats} />
                            </div>
                        </div>

                        {/* Configuration Tab */}
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

            {/* Trades Panel */}
            <TradesPanel
                trades={trades}
                isVisible={showTradesPanel}
                onToggle={() => setShowTradesPanel(false)}
            />
        </div>
    );
}