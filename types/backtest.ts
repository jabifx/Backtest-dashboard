export interface BacktestStats {
    net_profit: number;
    total_comission: number;
    total_trades: number;
    win_rate: number;
    current_balance: number;
    initial_balance: number;
    wins: number;
    losses: number;
}

export interface ChartData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface EquityPoint {
    trade: number;
    balance: number;
    timestamp: string;
}

export type BacktestStatus = "idle" | "starting" | "running" | "completed" | "error";

export interface BacktestMessage {
    type: string;
    progress?: number;
    status?: BacktestStatus;
    message?: string;
    url?: string;
    candle?: ChartData;
    price_data?: ChartData[];
    result?: string;
    timestamp?: string;
    tipo?: string;
    pnl?: number;
    order_type?: string;
    fees?: number;
    pair?: string;
    balance?: number;
    name?: string;
    traceback?: string;
    entries?: any[];
    exits?: any[];
}