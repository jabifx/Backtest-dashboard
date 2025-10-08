import { useRef, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { BacktestStatus, ChartData } from "@/types/backtest";
import type { Signal } from "@/types/signal";
import type { TradeData } from "@/components/dashboard/trades-panel";
import { WS_URL, convertTimeFormat } from "@/lib/backtest-utils";

interface UseBacktestWebSocketProps {
    updateStats: (balanceChange: number, tradeData?: any) => void;
    configComission: number;
    setBacktestStatus: (status: BacktestStatus) => void;
    setProgress: (progress: number) => void;
    setStatusMessage: (message: string) => void;
    setChartData: React.Dispatch<React.SetStateAction<ChartData[]>>;
    setMarkerEntries: React.Dispatch<React.SetStateAction<Signal[]>>;
    setMarkerExits: React.Dispatch<React.SetStateAction<Signal[]>>;
    backtestStatus: BacktestStatus;
}

export const useBacktestWebSocket = ({
                                         updateStats,
                                         configComission,
                                         setBacktestStatus,
                                         setProgress,
                                         setStatusMessage,
                                         setChartData,
                                         setMarkerEntries,
                                         setMarkerExits,
                                         backtestStatus,
                                     }: UseBacktestWebSocketProps) => {
    const wsRef = useRef<WebSocket | null>(null);
    const { toast } = useToast();

    const connectWebSocket = useCallback((onReady?: () => void) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            onReady?.();
            return;
        }

        if (wsRef.current?.readyState === WebSocket.CONNECTING) {
            wsRef.current.addEventListener("open", () => onReady?.(), { once: true });
            return;
        }

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => onReady?.();

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case "progress":
                    setProgress(data.progress);
                    setBacktestStatus(data.status);
                    setStatusMessage(data.message);
                    break;
                case "statistics":
                    if (data.url) window.open(data.url, "_blank");
                    break;
                case "chart_data":
                    if (data.candle) {
                        const newCandle = {
                            time: convertTimeFormat(data.candle.time),
                            open: data.candle.open,
                            high: data.candle.high,
                            low: data.candle.low,
                            close: data.candle.close,
                        };

                        setChartData((prev) => {
                            const existingIndex = prev.findIndex((item) => item.time === newCandle.time);

                            if (existingIndex !== -1) {
                                const updated = [...prev];
                                updated[existingIndex] = newCandle;
                                return updated;
                            } else {
                                const updated = [...prev, newCandle];
                                return updated.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
                            }
                        });
                    }

                    if (data.price_data && Array.isArray(data.price_data)) {
                        const formattedData = data.price_data.map((candle: any) => ({
                            time: convertTimeFormat(candle.time),
                            open: candle.open,
                            high: candle.high,
                            low: candle.low,
                            close: candle.close,
                        }));
                        setChartData(formattedData);
                    }
                    break;
                case "stats_update":
                    const balanceChange = data.balance || 0;

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
                        };

                        updateStats(balanceChange, newTrade);
                    } else {
                        updateStats(balanceChange);
                    }
                    break;
                case "completed":
                    setBacktestStatus("completed");
                    setProgress(100);
                    setStatusMessage("Backtest completed successfully");
                    toast({ title: "Backtest Completed", description: "Your backtest has finished successfully." });
                    break;
                case "error":
                    setBacktestStatus("error");
                    setStatusMessage(data.message);
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
                    });
                    break;
                case "finished":
                    setBacktestStatus("completed");
                    setProgress(100);
                    setStatusMessage("Backtest finished - Connection closing");
                    toast({ title: "Backtest Finished", description: "Backtest completed and connection closed." });
                    if (data.url) {
                        localStorage.setItem("resultsUrl", data.url);
                    }
                    ws.close();
                    break;
                case "markers":
                    setMarkerEntries(data.entries || []);
                    setMarkerExits(data.exits || []);
                    break;
            }
        };

        ws.onclose = () => {
            if (backtestStatus === "running" || backtestStatus === "starting") {
                setBacktestStatus("error");
                setStatusMessage("Connection lost");
            }
        };

        ws.onerror = () => {
            setBacktestStatus("error");
            setStatusMessage("WebSocket connection error");
        };
    }, [updateStats, configComission, setBacktestStatus, setProgress, setStatusMessage, setChartData, setMarkerEntries, setMarkerExits, backtestStatus, toast]);

    const startBacktest = useCallback((yamlConfig: string, yamlStrategy: string) => {
        const sendStartMessage = () => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                    JSON.stringify({
                        type: "start_backtest",
                        config_yaml: yamlConfig,
                        strategy_yaml: yamlStrategy,
                    })
                );
                setBacktestStatus("starting");
                setProgress(0);
                setStatusMessage("Initializing backtest...");
            } else {
                setBacktestStatus("error");
                setStatusMessage("WebSocket connection failed");
            }
        };

        connectWebSocket(sendStartMessage);
    }, [connectWebSocket, setBacktestStatus, setProgress, setStatusMessage]);

    const stopBacktest = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            setBacktestStatus("idle");
            setProgress(0);
            setStatusMessage("Backtest stopped");
        }
    }, [setBacktestStatus, setProgress, setStatusMessage]);

    const closeWebSocket = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
        }
    }, []);

    useEffect(() => {
        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    return {
        startBacktest,
        stopBacktest,
        closeWebSocket,
    };
};