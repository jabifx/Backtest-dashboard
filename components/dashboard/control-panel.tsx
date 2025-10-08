import { Button } from "@/components/ui/button";
import { Play, Square, RotateCcw, List } from "lucide-react";
import type { BacktestStatus } from "@/types/backtest";

interface BacktestControlPanelProps {
    backtestStatus: BacktestStatus;
    onStart: () => void;
    onStop: () => void;
    onReset: () => void;
    onToggleTrades: () => void;
}

export function BacktestControlPanel({
                                         backtestStatus,
                                         onStart,
                                         onStop,
                                         onReset,
                                         onToggleTrades,
                                     }: BacktestControlPanelProps) {
    return (
        <div className="flex space-x-3">
            <Button
                onClick={onToggleTrades}
                variant="outline"
                size="sm"
                className="shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 bg-transparent"
            >
                <List className="w-4 h-4 mr-2" />
                Trades
            </Button>
            <Button
                onClick={onStart}
                disabled={backtestStatus === "running" || backtestStatus === "starting"}
                size="sm"
                className="shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
            >
                <Play className="w-4 h-4 mr-2" />
                Start
            </Button>
            <Button
                onClick={onStop}
                disabled={backtestStatus === "idle" || backtestStatus === "completed"}
                variant="destructive"
                size="sm"
                className="shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
            >
                <Square className="w-4 h-4 mr-2" />
                Stop
            </Button>
            <Button
                onClick={onReset}
                variant="outline"
                size="sm"
                className="shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 bg-transparent"
            >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
            </Button>
        </div>
    );
}