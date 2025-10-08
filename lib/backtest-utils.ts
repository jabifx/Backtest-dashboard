import type { BacktestStats, ChartData } from '@/types/backtest';

import { getApiUrl } from "@/lib/config";

export const API_BASE_URL = getApiUrl();
export const WS_URL = API_BASE_URL.replace("http", "ws") + "/ws/backtest";

export const convertTimeFormat = (timeStr: any) => {
    if (typeof timeStr === "number") return timeStr;
    if (typeof timeStr === "string") {
        const date = new Date(timeStr);
        return Math.floor(date.getTime() / 1000);
    }
    return timeStr;
};

export const formatBalance = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    }).format(value);
};

export const formatTooltip = (value: number, name: string) => {
    if (name === "balance") {
        return [formatBalance(value), "Balance"];
    }
    return [value, name];
};

export const calculateStats = (
    prevStats: BacktestStats,
    balanceChange: number,
    configComission: number
): BacktestStats => {
    const newBalance = prevStats.current_balance + balanceChange;
    const newTotalTrades = prevStats.total_trades + 1;
    const newTotalComission = prevStats.total_comission + configComission;
    const isWin = balanceChange > 0;
    const newWins = prevStats.wins + (isWin ? 1 : 0);
    const newLosses = prevStats.losses + (isWin ? 0 : 1);
    const newWinRate = newTotalTrades > 0 ? (newWins / newTotalTrades) * 100 : 0;
    const netProfit = prevStats.initial_balance > 0
        ? ((newBalance - prevStats.initial_balance) / prevStats.initial_balance) * 100
        : 0;

    return {
        ...prevStats,
        current_balance: newBalance,
        total_trades: newTotalTrades,
        total_comission: newTotalComission,
        wins: newWins,
        losses: newLosses,
        win_rate: newWinRate,
        net_profit: netProfit,
    };
};

export const sortChartData = (data: ChartData[]): ChartData[] => {
    return data.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
};