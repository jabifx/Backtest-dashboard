import { useState, useEffect } from "react";
import type { BacktestStats, EquityPoint } from "@/types/backtest";
import type { TradeData } from "@/components/dashboard/trades-panel";
import { calculateStats } from "@/lib/backtest-utils";

const initialStats: BacktestStats = {
    net_profit: 0,
    total_comission: 0,
    total_trades: 0,
    win_rate: 0,
    current_balance: 0,
    initial_balance: 0,
    wins: 0,
    losses: 0,
};

export const useBacktestStats = (configComission: number) => {
    const [stats, setStats] = useState<BacktestStats>(initialStats);
    const [equityData, setEquityData] = useState<EquityPoint[]>([]);
    const [trades, setTrades] = useState<TradeData[]>([]);
    const [statsUpdated, setStatsUpdated] = useState(false);

    useEffect(() => {
        if (statsUpdated) {
            const timer = setTimeout(() => {
                setStatsUpdated(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [statsUpdated]);

    const initializeStats = (initialBalance: number) => {
        const newStats = {
            ...initialStats,
            current_balance: initialBalance,
            initial_balance: initialBalance,
        };

        setStats(newStats);
        setEquityData([{
            trade: 0,
            balance: initialBalance,
            timestamp: new Date().toISOString(),
        }]);
        setTrades([]);
    };

    const updateStats = (balanceChange: number, newTrade?: TradeData) => {
        setStatsUpdated(true);

        if (newTrade) {
            setTrades((prev) => [...prev, newTrade]);
        }

        setStats((prev) => {
            const newStats = calculateStats(prev, balanceChange, configComission);

            setEquityData((prevEquity) => [
                ...prevEquity,
                {
                    trade: newStats.total_trades,
                    balance: newStats.current_balance,
                    timestamp: new Date().toISOString(),
                },
            ]);

            return newStats;
        });
    };

    const resetStats = () => {
        setStats(initialStats);
        setEquityData([]);
        setTrades([]);
        setStatsUpdated(false);
    };

    return {
        stats,
        equityData,
        trades,
        statsUpdated,
        initializeStats,
        updateStats,
        resetStats,
    };
};